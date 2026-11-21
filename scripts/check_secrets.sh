#!/usr/bin/env bash
# Prompt S1: Fail if any forbidden hardcoded secret or backdoor appears in non-test source
set -e

FORBIDDEN_PATTERN="440926|demo_admin_pass_2026|DemoSandboxPassword2026|demo_sandbox_seed|heatledger_doc_signing_secret"

echo "Scanning source code for forbidden secrets and backdoors..."

HITS=$(grep -rniE "$FORBIDDEN_PATTERN" backend src scripts \
  --exclude-dir=__pycache__ \
  --exclude-dir=node_modules \
  --exclude-dir=.venv \
  --exclude-dir=dist \
  | grep -v "test_" \
  | grep -v "__tests__" \
  | grep -v "check_secrets" || true)

if [ -n "$HITS" ]; then
  echo "FAIL: Forbidden secret or backdoor string found in source:"
  echo "$HITS"
  exit 1
fi

echo "PASS: Zero forbidden secrets or backdoors found in non-test source."
exit 0
