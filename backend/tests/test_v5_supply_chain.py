"""
HEATLEDGER AI: Prompt Pack v5 Task 6.3 Test Suite
Supply Chain Security & Reproducible Builds Verification:
1. backend/requirements.txt and backend/requirements-dev.txt are strictly pinned with == and --hash=sha256.
2. Runtime requirements.txt excludes dev/test-only tools (pytest, ruff, mypy, bandit, pip-audit).
3. package-lock.json exists in repository root.
4. Dockerfile pins base images by sha256 digest, installs with --require-hashes, runs non-root, and defines HEALTHCHECK.
5. docker-compose.yml sets read_only: true with /tmp tmpfs mount on api.
6. CI enforces ruff, mypy, bandit, pip-audit, npm audit --audit-level=high, gitleaks, tsc --noEmit, and trivy without '|| true'.
7. CD generates CycloneDX SBOMs on release; dependabot schedules weekly without auto-merge; pre-commit runs ruff & gitleaks.
"""

import os
import re
import yaml

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")


def _parse_pinned_packages(req_path: str) -> list[str]:
    """Extracts requirement lines (excluding comments, flags, and continuation hashes)."""
    with open(req_path, "r", encoding="utf-8") as f:
        text = f.read()
    # Join backslash continuations
    logical_lines = text.replace("\\\r\n", " ").replace("\\\n", " ").splitlines()
    reqs = []
    for raw in logical_lines:
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        reqs.append(line)
    return reqs


def test_v5_6_3_python_requirements_exact_pins_and_hashes():
    runtime_path = os.path.join(BACKEND_DIR, "requirements.txt")
    dev_path = os.path.join(BACKEND_DIR, "requirements-dev.txt")
    assert os.path.exists(runtime_path)
    assert os.path.exists(dev_path)

    for path in (runtime_path, dev_path):
        reqs = _parse_pinned_packages(path)
        assert len(reqs) >= 15, f"{path} unexpectedly short"
        for req in reqs:
            assert ">=" not in req and "<=" not in req and "~=" not in req, f"Unpinned range in {path}: {req}"
            pkg_part = req.split("--hash=")[0].strip()
            assert "==" in pkg_part, f"Missing exact '==' pin in {path}: {pkg_part}"
            assert "--hash=sha256:" in req, f"Missing sha256 hash in {path}: {pkg_part}"

    runtime_names = {r.split("==")[0].strip().lower() for r in _parse_pinned_packages(runtime_path)}
    for dev_only in ("pytest", "ruff", "mypy", "bandit", "pip-audit", "vulture"):
        assert dev_only not in runtime_names, f"Dev tool {dev_only} leaked into runtime requirements.txt"


def test_v5_6_3_dockerfile_and_compose_supply_chain_hardening():
    with open(os.path.join(REPO_ROOT, "Dockerfile"), "r", encoding="utf-8") as f:
        df = f.read()
    from_lines = [ln.strip() for ln in df.splitlines() if ln.strip().startswith("FROM ")]
    assert len(from_lines) == 2
    for ln in from_lines:
        assert re.search(r"@sha256:[0-9a-f]{64}\b", ln), f"Dockerfile base image not pinned by digest: {ln}"
    assert "--require-hashes" in df
    assert "USER appuser" in df
    assert "HEALTHCHECK" in df

    with open(os.path.join(REPO_ROOT, "docker-compose.yml"), "r", encoding="utf-8") as f:
        compose = yaml.safe_load(f)
    api = compose["services"]["api"]
    assert api.get("read_only") is True
    assert any(str(m).startswith("/tmp:") for m in api.get("tmpfs", []))
    assert "no-new-privileges:true" in api.get("security_opt", [])


def test_v5_6_3_ci_cd_dependabot_and_precommit_gates():
    assert os.path.exists(os.path.join(REPO_ROOT, "package-lock.json"))

    with open(os.path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "r", encoding="utf-8") as f:
        ci_text = f.read()
    for gate in ("ruff check", "mypy ", "bandit ", "pip-audit ", "npm audit --audit-level=high", "gitleaks", "tsc --noEmit", "trivy"):
        assert gate in ci_text, f"Missing required CI security gate: {gate}"
    assert "pip-audit" in ci_text and "pip-audit --desc on || true" not in ci_text
    assert "npm audit --audit-level=high || true" not in ci_text

    with open(os.path.join(REPO_ROOT, ".github", "workflows", "cd.yml"), "r", encoding="utf-8") as f:
        cd_text = f.read()
    assert "cyclonedx" in cd_text.lower()

    with open(os.path.join(REPO_ROOT, ".github", "dependabot.yml"), "r", encoding="utf-8") as f:
        dep_text = f.read()
    assert "auto-merge" not in dep_text.lower()

    with open(os.path.join(REPO_ROOT, ".pre-commit-config.yaml"), "r", encoding="utf-8") as f:
        pc_text = f.read()
    assert "ruff" in pc_text
    assert "gitleaks" in pc_text
    assert "--maxkb=2048" in pc_text
