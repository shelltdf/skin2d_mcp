"""在 Windows 上通过 cmd 调用 npm（npm 为 .cmd 封装，CreateProcess 无法直接执行 `npm` 字符串）。"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _npm_argv(args: list[str]) -> list[str]:
    if sys.platform == "win32":
        return ["cmd", "/c", "npm", *args]
    return ["npm", *args]


def run_npm(args: list[str], cwd: Path, *, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(_npm_argv(args), cwd=cwd, check=check, shell=False)


def call_npm(args: list[str], cwd: Path) -> int:
    return subprocess.call(_npm_argv(args), cwd=cwd, shell=False)
