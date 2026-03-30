#!/usr/bin/env python3
"""生成可分发静态产物到 skin2d-editor/dist/。"""
import sys
from pathlib import Path

from npm_invoke import run_npm

ROOT = Path(__file__).resolve().parent
EDITOR = ROOT / "skin2d-editor"
DIST = EDITOR / "dist"


def main() -> int:
    if not EDITOR.is_dir():
        print("缺少 skin2d-editor 目录", file=sys.stderr)
        return 1
    run_npm(["install"], EDITOR)
    run_npm(["run", "build"], EDITOR)
    print("发布产物目录:", DIST.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
