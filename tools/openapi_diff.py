"""
OpenAPI Diff Tool (Prompt Pack v5 Task 6.1)
Compares before.json and after.json OpenAPI specs and exits non-zero if any
paths, HTTP methods, request body schemas, or parameter contracts differ.

Usage:
    python tools/openapi_diff.py before.json after.json
"""

import json
import sys
from typing import Any, Dict, List


def _resolve_refs(obj: Any, schemas: Dict[str, Any], seen: set | None = None) -> Any:
    """Dereferences #/components/schemas/... so module-qualified ref renames don't cause false diffs."""
    if seen is None:
        seen = set()
    if isinstance(obj, dict):
        if "$ref" in obj and isinstance(obj["$ref"], str):
            ref = obj["$ref"]
            prefix = "#/components/schemas/"
            if ref.startswith(prefix):
                name = ref[len(prefix):]
                if name in schemas and name not in seen:
                    return _resolve_refs(schemas[name], schemas, seen | {name})
        return {
            k: _resolve_refs(v, schemas, seen)
            for k, v in sorted(obj.items())
            if not (k == "title" and "properties" in obj)
        }
    if isinstance(obj, list):
        return [_resolve_refs(item, schemas, seen) for item in obj]
    return obj


def _normalize_schema(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts path -> method -> parameters/requestBody/responses structure."""
    schemas = spec.get("components", {}).get("schemas", {})
    paths = {}
    for path, methods in sorted(spec.get("paths", {}).items()):
        paths[path] = {}
        for method, op in sorted(methods.items()):
            if method.lower() not in ("get", "post", "put", "patch", "delete", "options", "head"):
                continue
            paths[path][method.upper()] = {
                "parameters": _resolve_refs(op.get("parameters", []), schemas),
                "requestBody": _resolve_refs(op.get("requestBody"), schemas),
                "responses": {
                    code: {"description": resp.get("description")}
                    for code, resp in sorted((op.get("responses") or {}).items())
                },
            }
    return {
        "paths": paths,
    }


def diff_openapi(before: Dict[str, Any], after: Dict[str, Any]) -> List[str]:
    diffs: List[str] = []
    b_norm = _normalize_schema(before)
    a_norm = _normalize_schema(after)

    b_paths = set(b_norm["paths"].keys())
    a_paths = set(a_norm["paths"].keys())

    for missing in sorted(b_paths - a_paths):
        diffs.append(f"REMOVED PATH: {missing}")
    for added in sorted(a_paths - b_paths):
        diffs.append(f"ADDED PATH: {added}")

    for path in sorted(b_paths & a_paths):
        b_methods = set(b_norm["paths"][path].keys())
        a_methods = set(a_norm["paths"][path].keys())
        for m in sorted(b_methods - a_methods):
            diffs.append(f"REMOVED METHOD: {m} {path}")
        for m in sorted(a_methods - b_methods):
            diffs.append(f"ADDED METHOD: {m} {path}")
        for m in sorted(b_methods & a_methods):
            if b_norm["paths"][path][m] != a_norm["paths"][path][m]:
                diffs.append(f"CHANGED CONTRACT: {m} {path}")

    return diffs


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python tools/openapi_diff.py <before.json> <after.json>")
        return 2
    with open(sys.argv[1], encoding="utf-8") as fh:
        before = json.load(fh)
    with open(sys.argv[2], encoding="utf-8") as fh:
        after = json.load(fh)

    diffs = diff_openapi(before, after)
    if diffs:
        print(f"OpenAPI diff found {len(diffs)} difference(s):")
        for d in diffs:
            print(" -", d)
        return 1
    print("OpenAPI diff: 0 differences (paths, methods, and contracts match).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
