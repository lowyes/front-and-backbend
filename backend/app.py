#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from services.model_service import build_file_url, get_models, load_manifest, load_model_cards
from services.recognition_pipeline import recognize_engineering_drawing


@asynccontextmanager
async def lifespan(app: FastAPI):
    manifest_path = Path("data/manifest.json")
    if not manifest_path.exists():
        print("warning: data/manifest.json not found")
    else:
        for item in load_manifest():
            model_card = Path(item.get("model_card", f"data/model_cards/{item['model_id']}.json"))
            if not model_card.exists():
                print(f"warning: model card not found: {model_card}")
    yield


app = FastAPI(
    title="Engineering Drawing Recognition Backend",
    description="FastAPI backend for engineering drawing to 3D model recognition.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models_dir = Path("data/models")
models_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/models", StaticFiles(directory="data/models"), name="models")


@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "message": "backend is running",
        "recognition_mode": "model_card_vlm_first",
        "verified_model_cards": len(load_model_cards(verified_only=True)),
    }


@app.get("/api/models")
async def list_models(request: Request):
    try:
        models = get_models(request)
        return {"success": True, "count": len(models), "models": models}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"failed to load models: {exc}") from exc


@app.get("/viewer/model/{model_id}", response_class=HTMLResponse)
async def h5_model_viewer(request: Request, model_id: str):
    model = next((item for item in load_manifest() if item.get("model_id") == model_id), None)
    if model is None:
        raise HTTPException(status_code=404, detail=f"model not found: {model_id}")

    model_url = build_file_url(request, model.get("gltf_url"))
    if not model_url:
        raise HTTPException(status_code=404, detail=f"model has no 3D asset: {model_id}")

    return HTMLResponse(
        content=_build_model_viewer_html(
            title=str(model.get("name") or model_id),
            model_id=model_id,
            model_url=model_url,
        )
    )


@app.post("/api/recognize")
async def recognize_image(request: Request, file: UploadFile = File(...)):
    allowed_types = {"image/jpeg", "image/png", "image/bmp", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"unsupported image type: {file.content_type}")

    temp_file = None
    try:
        suffix = Path(file.filename).suffix if file.filename else ".png"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(await file.read())
        temp_file.close()

        result = recognize_engineering_drawing(temp_file.name)
        if result.get("success") is not True:
            return JSONResponse(status_code=500, content=result)

        response = _public_response(request, result)
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"recognition failed: {exc}") from exc
    finally:
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except Exception:
                pass


def _public_response(request: Request, result: dict[str, Any]) -> dict[str, Any]:
    candidates = [_with_public_urls(request, candidate) for candidate in result.get("candidates", [])]
    top1 = _with_public_urls(request, result["top1"]) if result.get("top1") else None
    return {
        "success": True,
        "matched": bool(result.get("matched")),
        "top1": top1,
        "candidates": candidates,
        "query_signature": result.get("query_signature", {}),
        "message": result.get("message"),
    }


def _with_public_urls(request: Request, candidate: dict[str, Any] | None) -> dict[str, Any] | None:
    if candidate is None:
        return None
    public = dict(candidate)
    public["gltf_url"] = build_file_url(request, candidate.get("gltf_url"))
    public["bin_file"] = build_file_url(request, candidate.get("bin_file"))
    return public


def _build_model_viewer_html(title: str, model_id: str, model_url: str) -> str:
    payload = json.dumps(
        {
            "title": title,
            "modelId": model_id,
            "modelUrl": model_url,
        },
        ensure_ascii=False,
    )
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>{title}</title>
  <style>
    html, body {{ margin: 0; width: 100%; height: 100%; overflow: hidden; background: #101827; color: #e5eefc; }}
    #app {{ position: fixed; inset: 0; }}
    #status {{
      position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 2;
      padding: 12px 14px; border-radius: 10px; background: rgba(15, 23, 42, 0.82);
      font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    }}
    #title {{ position: fixed; left: 16px; right: 16px; top: max(14px, env(safe-area-inset-top)); z-index: 2; font: 600 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
  </style>
  <script type="importmap">
    {{
      "imports": {{
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }}
    }}
  </script>
</head>
<body>
  <div id="app"></div>
  <div id="title"></div>
  <div id="status">准备加载模型...</div>
  <script>
    window.__MODEL_VIEWER__ = {payload};
  </script>
  <script type="module">
    import * as THREE from 'three';
    import {{ OrbitControls }} from 'three/addons/controls/OrbitControls.js';
    import {{ GLTFLoader }} from 'three/addons/loaders/GLTFLoader.js';

    const config = window.__MODEL_VIEWER__;
    const container = document.getElementById('app');
    const status = document.getElementById('status');
    const title = document.getElementById('title');
    title.textContent = `${{config.title}}（${{config.modelId}}）`;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101827);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 1000);
    camera.position.set(0.04, 0.04, 0.08);

    const renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: false }});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.4));
    const directional = new THREE.DirectionalLight(0xffffff, 2.2);
    directional.position.set(3, 4, 5);
    scene.add(directional);

    function fitCamera(object) {{
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      const maxSize = Math.max(size.x, size.y, size.z) || 1;
      const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI / 180) / 2));
      camera.position.set(distance * 0.9, distance * 0.7, distance * 1.4);
      camera.near = Math.max(distance / 100, 0.0001);
      camera.far = distance * 100;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    }}

    function onResize() {{
      camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }}
    window.addEventListener('resize', onResize);
    onResize();

    status.textContent = '正在加载 GLB：' + config.modelUrl;
    new GLTFLoader().load(
      config.modelUrl,
      (gltf) => {{
        const object = gltf.scene;
        object.traverse((child) => {{
          if (child.isMesh) {{
            child.material = new THREE.MeshStandardMaterial({{
              color: 0x2f8cff,
              roughness: 0.45,
              metalness: 0,
              side: THREE.DoubleSide,
            }});
          }}
        }});
        scene.add(object);
        fitCamera(object);
        status.textContent = '模型加载完成，可拖动旋转、双指缩放';
      }},
      (event) => {{
        if (event.total) {{
          status.textContent = '模型加载中：' + Math.round(event.loaded / event.total * 100) + '%';
        }}
      }},
      (error) => {{
        console.error(error);
        status.textContent = '模型加载失败：' + (error && error.message ? error.message : '请检查模型地址和网络');
      }}
    );

    function animate() {{
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }}
    animate();
  </script>
</body>
</html>"""


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
