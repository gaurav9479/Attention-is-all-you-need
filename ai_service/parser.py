import os
import re
from typing import Any

SKIP_DIRS = {"node_modules", ".git", "__pycache__", "dist", "build", ".next", "venv", ".venv"}
PARSE_EXTENSIONS = {".py", ".js", ".ts", ".tsx", ".jsx"}

PY_IMPORT_RE = re.compile(r"^import |^from \S+ import", re.MULTILINE)
JS_IMPORT_RE = re.compile(r'import.*from|require\(', re.MULTILINE)


def _extract_imports(code: str, ext: str) -> list[str]:
    if ext == ".py":
        matches = PY_IMPORT_RE.findall(code)
    else:
        matches = JS_IMPORT_RE.findall(code)

    imports = []
    for line in code.splitlines():
        line = line.strip()
        if ext == ".py":
            if line.startswith("import ") or re.match(r"^from \S+ import", line):
                imports.append(line)
        else:
            if re.search(r'import.*from|require\(', line):
                imports.append(line)
    return imports


def _build_tree(root: str, rel_path: str = "") -> dict[str, Any]:
    abs_path = os.path.join(root, rel_path) if rel_path else root
    name = os.path.basename(abs_path)

    if os.path.isfile(abs_path):
        return {"name": name, "path": rel_path, "type": "file"}

    children = []
    try:
        entries = sorted(os.listdir(abs_path))
    except PermissionError:
        entries = []

    for entry in entries:
        if entry in SKIP_DIRS:
            continue
        child_rel = os.path.join(rel_path, entry) if rel_path else entry
        children.append(_build_tree(root, child_rel))

    return {"name": name, "path": rel_path, "type": "directory", "children": children}


def parse_repo(repo_path: str) -> dict:
    """
    Walk all files in repo_path and extract structure + imports.

    Returns:
        {
            "tree": nested folder/file JSON,
            "files": [{"name", "path", "imports", "line_count"}]
        }
    """
    repo_path = os.path.abspath(repo_path)
    files_data = []

    for dirpath, dirnames, filenames in os.walk(repo_path):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in PARSE_EXTENSIONS:
                continue

            abs_file = os.path.join(dirpath, filename)
            rel_file = os.path.relpath(abs_file, repo_path).replace("\\", "/")

            try:
                with open(abs_file, "r", encoding="utf-8", errors="ignore") as f:
                    code = f.read()
            except (OSError, PermissionError):
                continue

            imports = _extract_imports(code, ext)
            line_count = len(code.splitlines())

            files_data.append({
                "name": filename,
                "path": rel_file,
                "imports": imports,
                "line_count": line_count,
            })

    tree = _build_tree(repo_path)

    return {
        "tree": tree,
        "files": files_data,
    }
