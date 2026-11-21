# Prompt S1: Fail if any forbidden hardcoded secret or backdoor appears in non-test source
$ErrorActionPreference = "Stop"

$forbidden = @('440926', 'demo_admin_pass_2026', 'DemoSandboxPassword2026', 'demo_sandbox_seed', 'heatledger_doc_signing_secret')
$pattern = ($forbidden | ForEach-Object { [regex]::Escape($_) }) -join '|'

Write-Host "Scanning source code for forbidden secrets and backdoors..."

$files = Get-ChildItem -Path backend, src, scripts -Recurse -File | Where-Object {
    $_.FullName -notmatch "node_modules|\.venv|__pycache__|dist" -and
    $_.Name -notmatch "test_.*\.py" -and
    $_.FullName -notmatch "__tests__" -and
    $_.Name -ne "check_secrets.sh" -and
    $_.Name -ne "check_secrets.ps1"
}

$hits = @()
foreach ($file in $files) {
    $matches = Select-String -Path $file.FullName -Pattern $pattern
    if ($matches) {
        $hits += $matches
    }
}

if ($hits.Count -gt 0) {
    Write-Host "FAIL: Forbidden secret or backdoor string found in source:" -ForegroundColor Red
    foreach ($h in $hits) {
        Write-Host "$($h.Filename):$($h.LineNumber): $($h.Line.Trim())" -ForegroundColor Red
    }
    exit 1
}

Write-Host "PASS: Zero forbidden secrets or backdoors found in non-test source." -ForegroundColor Green
exit 0
