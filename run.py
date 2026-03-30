#!/usr/bin/env python3
"""启动开发服务器（阻塞）。"""
import sys
from pathlib import Path

from npm_invoke import call_npm, run_npm

ROOT = Path(__file__).resolve().parent
EDITOR = ROOT / "skin2d-editor"


def main() -> int:
    if not EDITOR.is_dir():
        print("缺少 skin2d-editor 目录", file=sys.stderr)
        return 1
    run_npm(["install"], EDITOR)
    return call_npm(["run", "dev"], EDITOR)


if __name__ == "__main__":
    raise SystemExit(main())
