#!/usr/bin/env python3
"""冒烟：类型检查 + 生产构建。"""
import sys
from pathlib import Path

from npm_invoke import run_npm

ROOT = Path(__file__).resolve().parent
EDITOR = ROOT / "skin2d-editor"


def main() -> int:
    if not EDITOR.is_dir():
        print("缺少 skin2d-editor 目录", file=sys.stderr)
        return 1
    run_npm(["install"], EDITOR)
    run_npm(["run", "test"], EDITOR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
