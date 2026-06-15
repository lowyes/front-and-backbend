#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path


def convert_to_plain_gltf(input_gltf: Path, output_gltf: Path, output_bin: Path) -> None:
    input_gltf = input_gltf.resolve()
    output_gltf = output_gltf.resolve()
    output_bin = output_bin.resolve()
    output_gltf.parent.mkdir(parents=True, exist_ok=True)
    output_bin.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_output = Path(temp_dir) / "model_plain.gltf"
        npx = shutil.which("npx") or shutil.which("npx.cmd")
        if not npx:
            raise FileNotFoundError("npx was not found. Install Node.js/npm before converting glTF files.")
        subprocess.run(
            [
                npx,
                "--yes",
                "@gltf-transform/cli",
                "copy",
                str(input_gltf),
                str(temp_output),
            ],
            check=True,
        )

        temp_bin = temp_output.with_name("data.bin")
        if not temp_bin.exists():
            raise FileNotFoundError(f"Expected converted buffer not found: {temp_bin}")

        gltf = json.loads(temp_output.read_text(encoding="utf-8"))
        for buffer in gltf.get("buffers", []):
            if buffer.get("uri") == "data.bin":
                buffer["uri"] = output_bin.name
        gltf["extensionsUsed"] = [
            extension
            for extension in gltf.get("extensionsUsed", [])
            if extension != "KHR_draco_mesh_compression"
        ]
        gltf["extensionsRequired"] = [
            extension
            for extension in gltf.get("extensionsRequired", [])
            if extension != "KHR_draco_mesh_compression"
        ]
        if not gltf["extensionsUsed"]:
            gltf.pop("extensionsUsed", None)
        if not gltf["extensionsRequired"]:
            gltf.pop("extensionsRequired", None)

        output_gltf.write_text(
            json.dumps(gltf, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        shutil.copyfile(temp_bin, output_bin)


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Draco glTF to plain glTF for mini programs.")
    parser.add_argument("input_gltf", type=Path)
    parser.add_argument("output_gltf", type=Path)
    parser.add_argument("output_bin", type=Path)
    args = parser.parse_args()

    convert_to_plain_gltf(args.input_gltf, args.output_gltf, args.output_bin)
    print(f"Wrote {args.output_gltf}")
    print(f"Wrote {args.output_bin}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
