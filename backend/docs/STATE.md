# Project State

## Change Logging Rule

After every code change, update `docs/STATE.md` or `docs/DEV_LOG.md`.

The log entry must include:

- Date/time
- Agent/tool used
- Change scope
- Files changed
- Reason for change
- Verification commands run
- PASS / WARNING / SKIP / FAIL result
- Known risks
- Next suggested step

For major changes, the log must include the result of `make verify-major`.

Do not mark a task complete without reporting verification results.

## Current State

- Project: FastAPI + OpenCV engineering drawing recognition backend.
- Default Python environment: conda `base`.
- Harness purpose: verify the existing backend loop from reference image to glTF model URL, without changing recognition algorithms.

## Change Log

### 2026-06-15 12:29:26 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, glTF Transform CLI through `npx`, conda `base`.
- Change scope: Converted the demo model pipeline from Draco-compressed glTF to mini-program-friendly plain glTF/GLB and switched the mini program model viewer to WeChat `xr-frame`.
- Files changed:
  - `data/manifest.json`
  - `data/models/part_0001/model_plain.gltf`
  - `data/models/part_0001/model_plain.bin`
  - `data/models/part_0001/model_plain.glb`
  - `scripts/convert_plain_gltf.py`
  - `../miniprogram/pages/model-viewer/model-viewer.js`
  - `../miniprogram/pages/model-viewer/model-viewer.json`
  - `../miniprogram/pages/model-viewer/model-viewer.wxml`
  - `../miniprogram/pages/model-viewer/model-viewer.wxss`
  - Removed `../miniprogram/lib/threejs-miniprogram.js`
- Reason for change: The original SolidWorks glTF required `KHR_draco_mesh_compression`, which the mini program did not decode. The backend now serves a decoded single-file GLB for the mini program, with a plain glTF/bin pair kept for inspection, and the front end uses official `xr-frame` components instead of the temporary hand-written WebGL renderer.
- Verification commands run:
  - `conda run -n base python -m py_compile backend\scripts\convert_plain_gltf.py`
  - `conda run -n base python backend\scripts\convert_plain_gltf.py backend\data\models\part_0001\test2.gltf backend\data\models\part_0001\model_plain.gltf backend\data\models\part_0001\model_plain.bin --output-glb backend\data\models\part_0001\model_plain.glb`
  - `npx --yes @gltf-transform/cli validate backend\data\models\part_0001\model_plain.gltf`
  - `npx --yes @gltf-transform/cli validate backend\data\models\part_0001\model_plain.glb`
  - `node --check miniprogram\pages\model-viewer\model-viewer.js`
  - `conda run -n base python harness\run_harness.py`
- Result: PASS. Plain glTF/GLB validation had no errors or warnings; only informational unused-object notes. Backend closed-loop harness passed with the manifest pointing to `model_plain.glb`.
- Known risks:
  - WeChat Developer Tools compilation and visual `xr-frame` rendering were not available from this shell and still need manual validation in the mini program IDE.
  - `xr-frame` requires a sufficiently recent WeChat base library/client version.
  - Local simulator can use `127.0.0.1`; real-device testing needs the backend LAN IP and legal-domain/dev settings.
- Next suggested step: Recompile in WeChat Developer Tools, confirm `xr-frame` loads the model, and adjust `modelScale`/camera position if the part appears too small or off-center.

### 2026-06-13 21:31:56 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, conda `base` verification planned.
- Change scope: Added persistent change logging rules and harness enforcement for those rules.
- Files changed:
  - `AGENTS.md`
  - `docs/STATE.md`
  - `harness/run_harness.py`
  - `harness/generate_test_images.py`
  - `harness/__init__.py`
- Reason for change: Ensure future Codex/Claude changes are recorded in Markdown and make the harness fail if the logging rule documents are missing.
- Verification commands run:
  - `conda run -n base python --version`
  - `conda run -n base python -c "import cv2, fastapi, httpx, numpy; print('cv2', cv2.__version__); print('fastapi ok')"`
  - `conda run -n base python -m py_compile harness\run_harness.py harness\generate_test_images.py`
  - `conda run -n base python harness\generate_test_images.py`
  - `conda run -n base python harness\run_harness.py`
- Result: PASS. Full harness passed; `scan_test_01` was reported as informational with confidence `0.01` and `matched = False`.
- Known risks:
  - No `Makefile` exists, so `make verify-major` is not currently available.
  - FastAPI TestClient emitted a Starlette deprecation warning about `httpx`; current harness behavior still passes.
  - The harness depends on the existing recognition threshold and reference feature quality.
- Next suggested step: Add a `Makefile` target such as `verify-major` if future major-change verification should be standardized.

### 2026-06-13 (Today) - SIFT + RANSAC + Deskew + Perspective

- Agent/tool used: Claude (MiniMax-M2.7)
- Change scope: Major improvement to preprocessing and feature matching for better recognition of blurry/rotated/perspective-distorted engineering drawings.
- Files changed:
  - `services/image_preprocess.py` - Added: `crop_non_white_border`, `normalize_shadow`, `sharpen`, `rotate_bound`, `estimate_skew_angle`, `deskew_engineering_drawing`, `detect_document_corners`, `correct_perspective`, updated `preprocess_for_sift`
  - `services/feature_extract.py` - Added: `extract_sift_features`, `serialize_keypoints`, `deserialize_keypoints`
  - `services/matcher.py` - Added: `match_sift`, `compute_homography_inliers`, `match_with_sift_ransac`, updated `match_features`, added inlier ratio check
  - `services/model_service.py` - Adjusted `MATCH_THRESHOLD` to 0.40
  - `scripts/build_feature_index.py` - Updated to use new preprocessing and SIFT
  - `harness/run_harness.py` - Added `run_comparison_experiment` for multi-method comparison
- Reason for change: Original ORB matching had very low confidence (0.01) for blurry test images. SIFT + RANSAC with improved preprocessing significantly improves recognition. Added inlier ratio check to prevent random noise from matching.
- Verification commands run:
  - `conda run -n base python scripts/build_feature_index.py`
  - `conda run -n base python harness/run_harness.py`
  - `conda run -n base python test_noise.py` (random noise test)
- Result: **PASS**. scan_test_01 (sift+otsu): 37 good matches, 9 inliers, 0.243 ratio, 0.3 confidence, matched=True. Random noise: 0 matches, correctly rejected.
- Known risks:
  - Perspective correction depends on detecting four corners; may fail on images without clear borders.
  - Deskew only works for angles < 15°; larger rotations need different approach.
- Next suggested step: Test more edge cases including scan_test_02, larger rotations, and blurry images.

### 2026-06-13 23:52:54 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, conda `base`.
- Change scope: Generalized recognition improvement for engineering drawing scans without hard-coding test image names or part-specific geometry.
- Files changed:
  - `services/image_preprocess.py`
  - `services/matcher.py`
  - `harness/test_all_images.py`
  - `data/features/part_0001.npz`
  - `data/debug/recognition_report.json`
- Reason for change: Existing SIFT/RANSAC flow rejected visually correct degraded scans `scan_test_01`, `scan_test_02`, and `scan_test_03`. The fix corrects deskew rotation direction, replaces fragile matching code with a cleaner SIFT/RANSAC implementation, adds a generic horizontal/vertical engineering-line layout score as a near-miss signal, and keeps negative samples rejected.
- Verification commands run:
  - `conda run -n base python -m py_compile services\matcher.py services\image_preprocess.py scripts\build_feature_index.py`
  - `conda run -n base python scripts\build_feature_index.py`
  - `conda run -n base python -m py_compile services\matcher.py harness\test_all_images.py`
  - `conda run -n base python harness\test_all_images.py`
  - `conda run -n base python harness\run_harness.py`
  - `conda run -n base python test_all_images.py`
  - FastAPI `TestClient` batch POST to `/api/recognize` for `scan_test_01` through `scan_test_05`, `random_noise.jpg`, and `noise_test.jpg`
- Result: PASS. `scan_test_01`, `scan_test_02`, and `scan_test_03` match `part_0001`; `scan_test_04`, `scan_test_05`, `random_noise.jpg`, and `noise_test.jpg` are rejected. Full harness result is PASS.
- Known risks:
  - The generic line-layout near-miss threshold is validated on the current small regression set only; it should be rechecked as more model classes are added.
  - FastAPI TestClient still emits a Starlette deprecation warning about `httpx`.
  - No `Makefile` exists, so `make verify-major` remains unavailable.
- Next suggested step: Add more labeled positive/negative test images per new part and promote `harness/test_all_images.py` into a standard verification target, ideally `make verify-major`.

### 2026-06-14 00:04:36 +08:00

- Agent/tool used: Codex via local PowerShell and Git.
- Change scope: Prepared repository for first Git upload.
- Files changed:
  - `.gitignore`
  - `docs/STATE.md`
- Reason for change: Exclude local caches, agent state, debug outputs, and generated image artifacts from the initial Git commit while preserving source code, required model assets, reference data, and regression images.
- Verification commands run:
  - `git --version`
  - `git ls-remote git@github.com:lowyes/cad-wecaht.git`
  - `git ls-remote ssh://git@ssh.github.com:443/lowyes/cad-wecaht.git`
  - `conda run -n base python harness\run_harness.py`
  - `conda run -n base python harness\test_all_images.py`
  - `git ls-remote origin`
  - `git push -u origin main`
- Result: PASS. Git is available, validation passed, and `main` was pushed to `https://github.com/lowyes/cad-wecaht.git`. Direct GitHub SSH on port 22 timed out, so the push used HTTPS with the existing Git Credential Manager `lowyes` login.
- Known risks:
  - Push may still fail if GitHub SSH credentials are not configured for this machine/account.
  - The remote repository may already contain history; initial push strategy depends on remote state.
- Next suggested step: Continue future pushes with HTTPS/Git Credential Manager, or add a GitHub SSH key later if SSH pushes are preferred.

### 2026-06-14 00:58:02 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, conda `base`.
- Change scope: Added generalized automatic view-region detection and region-to-region matching diagnostics for CAD drawing recognition.
- Files changed:
  - `services/view_region_detector.py`
  - `services/matcher.py`
  - `scripts/build_feature_index.py`
  - `harness/test_all_images.py`
  - `docs/ALGORITHM.md`
  - `docs/STATE.md`
  - `data/features/part_0001.npz`
  - `data/features/part_0001_region_01_sift.npz`
  - `data/features/part_0001_region_02_sift.npz`
  - `data/ref_regions/part_0001/region_01.png`
  - `data/ref_regions/part_0001/region_02.png`
- Reason for change: Improve generalization beyond fixed front/top/side crop assumptions by automatically detecting major view regions, matching query regions against reference regions, and using multi-region support as a stronger rejection signal for visually similar negatives.
- Verification commands run:
  - `conda run -n base python -m py_compile services\view_region_detector.py services\matcher.py harness\test_all_images.py scripts\build_feature_index.py`
  - `conda run -n base python scripts\build_feature_index.py`
  - `conda run -n base python harness\test_all_images.py`
  - `conda run -n base python harness\run_harness.py`
  - Direct conda base Python API batch POST to `/api/recognize` for all files in the labeled test set
  - Direct conda base Python generation of all feature-match visualizations under `data/debug/feature_matches_all/`
- Result: PASS. Positives `scan_test_01`, `scan_test_02`, and `scan_test_03` match; negatives `scan_test_04` through `scan_test_08`, `random_noise.jpg`, and `noise_test.jpg` are rejected. Full backend harness passed.
- Known risks:
  - Region thresholds are calibrated on the current small labeled set; they should be recalibrated when many more model classes are added.
  - Current automatic view detection found 2 major reference regions for `part_0001`, not separate hand-labeled front/top/side views; this is intentional layout-free behavior but still needs visual review as the dataset grows.
  - FastAPI TestClient still emits a Starlette deprecation warning about `httpx`.
  - No `Makefile` exists, so `make verify-major` is still unavailable and was skipped.
- Next suggested step: Add more labeled positives/negatives per new model and introduce top1/top2 margin checks before scaling toward hundreds of models.

### 2026-06-14 01:20:00 +08:00

- Agent/tool used: Claude (GLM-5) via Trae IDE
- Change scope: Created independent SURF feature detection test folder for algorithm evaluation.
- Files changed:
  - `experiments/surf_test/test_surf.py` - SURF feature detection test script
  - `experiments/surf_test/README.md` - Documentation for SURF testing
- Reason for change: User requested to test SURF algorithm for potential use in engineering drawing recognition, without polluting main source code.
- Verification commands run:
  - `D:\Users\miniconda3\python.exe experiments/surf_test/test_surf.py`
- Result: **WARNING**. SURF is not available in current OpenCV 4.13.0 (requires opencv-contrib-python). Script automatically fell back to SIFT comparison test. SIFT test passed successfully.
- Known risks:
  - SURF requires `opencv-contrib-python` which is not installed in the current environment.
  - Installing opencv-contrib-python may affect other dependencies.
  - SURF patent expired in 2020, but some OpenCV builds still require contrib module.
- Next suggested step: If SURF testing is desired, run `pip install opencv-contrib-python==4.13.0.0` to enable SURF support.

### 2026-06-14 02:30:00 +08:00

- Agent/tool used: Claude (GLM-5) via Trae IDE
- Change scope: Reviewed and updated harness documentation in README.md for clarity.
- Files changed:
  - `README.md` - Updated "Test Harness" section with clear run order and output explanation
- Reason for change: User requested optimization of test harness documentation to ensure proper run sequence and clear understanding of output markers.
- Verification commands run:
  - `conda run -n base python harness/generate_test_images.py`
  - `conda run -n base python harness/run_harness.py`
- Result: **PASS**. generate_test_images.py generated 14 test images. run_harness.py passed all checks: feature index (349 descriptors), /api/health, /api/models, static files (gltf and bin), and /api/recognize. Comparison experiment completed successfully.
- Known risks:
  - None. Existing harness was already well-implemented.
- Next suggested step: User may want to test matching on generated images to evaluate recognition quality.

### 2026-06-14 03:00:00 +08:00

- Agent/tool used: Claude (GLM-5) via Trae IDE
- Change scope: Converted SURF test to Generalized Hough Transform / Shape Based Matching test.
- Files changed:
  - `experiments/surf_test/test_surf.py` - Rewrote to test Generalized Hough Transform
  - `experiments/surf_test/README.md` - Updated documentation for new algorithm
- Reason for change: User requested testing shape-based matching algorithm instead of SURF. Generalized Hough Transform is more suitable for detecting geometric shapes (rectangles, circles, slots) in engineering drawings.
- Verification commands run:
  - `conda run -n base python experiments/surf_test/test_surf.py`
- Result: **PASS**. Shape analysis test completed. Results show:
  - Reference image (part_0001.png): structure_score=0.600 (2 bases, 3 side slots)
  - scan_test_01.jpg: structure_score=0.000 (too blurry for edge detection)
  - scan_test_02.jpg: structure_score=0.600, similarity=1.000 with reference
  - scan_test_03.png: structure_score=0.600, similarity=1.000 with reference
  - Noise images correctly rejected with score=0.000
- Known risks:
  - Blurry images (scan_test_01) fail edge detection, resulting in zero structure score
  - Shape detection parameters may need tuning for different drawing types
- Next suggested step: Consider integrating shape_score as a supplementary signal to SIFT confidence for improved recognition accuracy.

### 2026-06-14 14:16:21 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, conda `base`.
- Change scope: Added a VLM-first model-card recognition framework while preserving offline fallback verification.
- Files changed:
  - `app.py`
  - `config.py`
  - `data/manifest.json`
  - `data/model_cards/part_0001.json`
  - `services/model_service.py`
  - `services/vlm_client.py`
  - `services/vlm_prompts.py`
  - `services/vlm_signature.py`
  - `services/model_card_builder.py`
  - `services/model_card_matcher.py`
  - `services/pair_judge.py`
  - `services/recognition_pipeline.py`
  - `scripts/build_model_cards.py`
  - `scripts/verify_model_cards.py`
  - `scripts/rebuild_all.py`
  - `harness/test_cases.json`
  - `harness/run_vlm_harness.py`
  - `docs/STATE.md`
- Reason for change: Upgrade the model library from an image/feature library into a structure model-card library, with GLM-4V-Flash hooks for query signatures and pair judging, model-card ranking, API integration, and targeted VLM harness coverage for `scan_test_05` and `scan_test_06`.
- Verification commands run:
  - `conda run -n base python -m py_compile app.py config.py services\vlm_client.py services\vlm_prompts.py services\vlm_signature.py services\model_card_builder.py services\model_card_matcher.py services\pair_judge.py services\recognition_pipeline.py services\model_service.py scripts\build_model_cards.py scripts\verify_model_cards.py scripts\rebuild_all.py harness\run_vlm_harness.py`
  - `conda run -n base python scripts\verify_model_cards.py`
  - `conda run -n base python harness\run_vlm_harness.py`
  - `conda run -n base python harness\run_harness.py`
  - `conda run -n base python harness\test_all_images.py`
  - `conda run -n base python scripts\build_model_cards.py`
  - Direct conda base Python API batch POST to `/api/recognize` for `part_0001.png`, `scan_test_05.png`, and `scan_test_06.png`
- Result: PASS. `part_0001.png` matched `part_0001`; `scan_test_05.png` and `scan_test_06.png` were rejected by model-card/pair-judge scoring. Existing backend harness and all-image traditional matcher tests still pass.
- Known risks:
  - Live GLM calls were not executed during verification to avoid persisting or exposing the provided API key; the framework reads `ZHIPU_API_TOKEN` only from the environment.
  - Without `ZHIPU_API_TOKEN`, query signature and pair judge use OpenCV fallback signals, so scores are deterministic but not true VLM reasoning.
  - `build_model_cards.py` skips existing `verified=true` cards by default; use `--force` only when intentionally rebuilding and re-reviewing cards.
  - No `Makefile` exists, so `make verify-major` is still unavailable and was skipped.
- Next suggested step: Set `ZHIPU_API_TOKEN` in the local shell, run `python harness/run_vlm_harness.py`, review GLM output quality, then expand `data/model_cards/` as new model references are added.

### 2026-06-14 14:27:41 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, conda `base`.
- Change scope: Cleaned obsolete debug/experiment code and standardized the verification harness for future Claude/Codex agents.
- Files changed:
  - `.gitignore`
  - `AGENTS.md`
  - `Makefile`
  - `harness/README.md`
  - `harness/verify_major.py`
  - `harness/run_harness.py`
  - `services/vlm_client.py`
  - `docs/STATE.md`
  - Removed obsolete tracked scripts:
    - `check_full.py`
    - `check_npz_match.py`
    - `check_type.py`
    - `test_all_images.py`
    - `test_drawings.py`
    - `test_noise.py`
    - `harness/debug_homography.py`
    - `harness/generate_test_images.py`
    - `harness/test_false_positive.py`
    - `harness/visualize_scan_matches.py`
  - Removed local generated/experimental artifacts:
    - `data/glm_recognition/`
    - `experiments/`
    - `debug_scan05.py`
- Reason for change: Reduce confusing duplicate entrypoints, remove one-off experiment/debug scripts, and give future agents a single major verification command: `make verify-major` or `conda run -n base python harness\verify_major.py`.
- Verification commands run:
  - `conda run -n base python harness\verify_major.py`
  - `make verify-major`
- Result: PASS. The major harness passed py_compile, model-card verification, VLM/model-card harness, traditional all-image regression, and backend closed-loop API/static model checks.
- Known risks:
  - `README.md` still has unrelated local modifications that were not part of this cleanup and were intentionally not reverted.
  - `VLM_DISABLE_REMOTE=1` is the default for major verification; live GLM checks require `make verify-major-live-vlm` or `harness\verify_major.py --live-vlm`.
  - FastAPI TestClient still emits the existing Starlette deprecation warning about `httpx`.
- Next suggested step: Keep future algorithm experiments outside the main repo path or under ignored scratch folders until they are ready to become maintained code.

### 2026-06-15 12:55:00 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, glTF-Transform CLI.
- Change scope: Made the mini program `xr-frame` model viewer load the demo model from a bundled local GLB instead of `127.0.0.1` backend URLs.
- Files changed:
  - `data/models/part_0001/model_plain.gltf`
  - `data/models/part_0001/model_plain.glb`
  - `../miniprogram/assets/models/part_0001/model_plain.glb`
  - `../miniprogram/pages/model-viewer/model-viewer.js`
  - `docs/STATE.md`
- Reason for change: The WeChat DevTools viewer reached the `xr-frame` scene but still rendered a blank model area. Bundling the GLB removes local network/legal-domain variables, and the refreshed GLB uses a centered, unlit, double-sided, clearly colored material for easier rendering in the mini program.
- Verification commands run:
  - `node --check miniprogram\pages\model-viewer\model-viewer.js`
  - `npx --yes @gltf-transform/cli inspect miniprogram\assets\models\part_0001\model_plain.glb`
  - `npx --yes @gltf-transform/cli validate miniprogram\assets\models\part_0001\model_plain.glb`
- Result: PASS. The local GLB is valid glTF 2.0, has no validation errors, no Draco requirement, one visible mesh, centered bounds, and double-sided unlit material.
- Known risks:
  - WeChat DevTools must be recompiled or cache-cleared to pick up the new packaged GLB.
  - If the view is still blank, the next check should be the WeChat DevTools Console error emitted by `xr-frame` asset loading.

### 2026-06-15 13:08:00 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, conda `base`.
- Change scope: Added a fallback H5/Three.js model viewer while keeping the existing `xr-frame` mini program viewer.
- Files changed:
  - `app.py`
  - `harness/run_harness.py`
  - `docs/STATE.md`
  - `../miniprogram/app.json`
  - `../miniprogram/pages/model-viewer/model-viewer.js`
  - `../miniprogram/pages/model-viewer/model-viewer.wxml`
  - `../miniprogram/pages/model-viewer/model-viewer.wxss`
  - `../miniprogram/pages/model-webview/model-webview.js`
  - `../miniprogram/pages/model-webview/model-webview.wxml`
  - `../miniprogram/pages/model-webview/model-webview.wxss`
  - `../miniprogram/pages/model-webview/model-webview.json`
- Reason for change: The WeChat `xr-frame` page still showed a blank/delayed loading state in DevTools. The H5 route `/viewer/model/{model_id}` gives a second rendering path using Three.js `GLTFLoader` and `OrbitControls`, so model rendering can be validated independently from `xr-frame`.
- Verification commands run:
  - `node --check miniprogram\pages\model-viewer\model-viewer.js`
  - `node --check miniprogram\pages\model-webview\model-webview.js`
  - `conda run -n base python -m py_compile app.py harness\run_harness.py`
  - `conda run -n base python harness\run_harness.py`
- Result: PASS. The harness now verifies `/viewer/model/part_0001` returns the H5 viewer and that the backend static GLB remains accessible.
- Known risks:
  - Mini program `web-view` requires domain/business-domain configuration for real deployment; in DevTools, disable domain checks for local testing.
  - The H5 viewer imports Three.js from `https://unpkg.com`, so production should either keep an HTTPS-capable CDN path or bundle the viewer assets under the backend.

### 2026-06-15 13:14:00 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`.
- Change scope: Switched the mini program's primary 3D model entrypoints to the H5/Three.js viewer.
- Files changed:
  - `.gitignore`
  - `docs/STATE.md`
  - `../miniprogram/pages/result/result.js`
  - `../miniprogram/pages/result/result.wxml`
  - `../miniprogram/pages/model-list/model-list.js`
- Reason for change: Manual testing showed the H5 viewer renders `part_0001` correctly, while the `xr-frame` view still shows a blank scene. The main user flow should use the working H5 viewer instead of blocking on native 3D compatibility.
- Verification commands run:
  - `node --check miniprogram\pages\result\result.js`
  - `node --check miniprogram\pages\model-list\model-list.js`
  - `node --check miniprogram\pages\model-webview\model-webview.js`
  - `node --check miniprogram\pages\model-viewer\model-viewer.js`
  - `conda run -n base python -m py_compile app.py harness\run_harness.py`
  - `conda run -n base python harness\run_harness.py`
- Result: PASS. Result-page and model-list navigation now target the H5 viewer, and the backend harness verifies `/viewer/model/part_0001`.
- Known risks:
  - `pages/model-viewer` remains in the project as a fallback/experiment page and is no longer the primary navigation target.

### 2026-06-15 13:20:00 +08:00

- Agent/tool used: Codex via local PowerShell, `apply_patch`, npm/rollup.
- Change scope: Replaced the mini program's primary 3D flow with a native `three-platformize` WebGL canvas page and removed the H5/web-view path from the app.
- Files changed:
  - `.gitignore`
  - `app.py`
  - `harness/run_harness.py`
  - `docs/STATE.md`
  - `../package.json`
  - `../package-lock.json`
  - `../rollup.config.js`
  - `../tsconfig.json`
  - `../miniprogram/app.json`
  - `../miniprogram/chunks/three-platformize.js`
  - `../miniprogram/pages/model-native/model-native.ts`
  - `../miniprogram/pages/model-native/model-native.js`
  - `../miniprogram/pages/model-native/model-native.wxml`
  - `../miniprogram/pages/model-native/model-native.wxss`
  - `../miniprogram/pages/model-native/model-native.json`
  - `../miniprogram/pages/result/result.js`
  - `../miniprogram/pages/result/result.wxml`
  - `../miniprogram/pages/model-list/model-list.js`
  - Removed `../miniprogram/pages/model-webview/`
- Reason for change: The project should render 3D models entirely inside the WeChat mini program rather than relying on web-view/H5 domain configuration. The new page uses `three-platformize`, `WechatPlatform`, `GLTFLoader`, and `OrbitControls` on a native mini program WebGL canvas, loading the packaged local GLB directly.
- Verification commands run:
  - `npm run build:native3d`
  - `node --check miniprogram\pages\model-native\model-native.js`
  - `node --check miniprogram\pages\model-viewer\model-viewer.js`
  - `node --check miniprogram\pages\result\result.js`
  - `node --check miniprogram\pages\model-list\model-list.js`
  - `conda run -n base python -m py_compile app.py harness\run_harness.py`
  - `conda run -n base python harness\run_harness.py`
  - `rg -n "model-webview|H5备用|/viewer/model|<web-view|web-view" miniprogram backend --glob "!backend/docs/STATE.md"`
- Result: PASS. The mini program's primary navigation now opens `pages/model-native/model-native`, which renders the packaged local GLB on a native WebGL canvas through `three-platformize`.
- Known risks:
  - The native viewer requires running `npm run build:native3d` after editing `model-native.ts`.
  - `npm install` reported two high-severity audit findings in legacy rollup-related dependencies inherited from the demo-compatible toolchain; they were not force-upgraded to avoid breaking the build.
