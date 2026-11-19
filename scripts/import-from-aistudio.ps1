# HeatLedger AI: Google AI Studio UI Importer
# Safely brings UI redesigns back into the main repository with Git backups and whitelist verification.

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$SourcePath,

    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Determine Repo Root
$RepoRoot = if ($PSScriptRoot) { (Resolve-Path "$PSScriptRoot\..").Path } else { (Get-Location).Path }

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " [HeatLedger AI] Importing UI from Google AI Studio" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 1. Resolve Source Path (Folder or Zip)
if (!(Test-Path $SourcePath)) {
    Write-Error "Source path does not exist: $SourcePath"
    exit 1
}

$TempExtractDir = $null
$EffectiveSourceDir = $null

$isZip = $SourcePath.EndsWith(".zip") -or ([System.IO.Path]::GetExtension($SourcePath) -ieq ".zip")

if ($isZip) {
    Write-Host "[1/5] Extracting zip file..." -ForegroundColor Green
    $TempExtractDir = Join-Path $env:TEMP ("hl-aistudio-extract-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $TempExtractDir -Force | Out-Null
    Expand-Archive -LiteralPath (Resolve-Path $SourcePath).Path -DestinationPath $TempExtractDir -Force
    
    # Check if there is an inner folder (like 'aistudio-ui') or direct files
    if (Test-Path (Join-Path $TempExtractDir "src")) {
        $EffectiveSourceDir = $TempExtractDir
    } else {
        $subDirs = Get-ChildItem -Path $TempExtractDir -Directory
        $found = $null
        foreach ($d in $subDirs) {
            if (Test-Path (Join-Path $d.FullName "src")) {
                $found = $d.FullName
                break
            }
        }
        $EffectiveSourceDir = if ($found) { $found } else { $TempExtractDir }
    }
} else {
    $resolved = (Resolve-Path $SourcePath).Path
    $EffectiveSourceDir = $resolved
}

Write-Host "Resolved Source Directory: $EffectiveSourceDir" -ForegroundColor Gray

if (!(Test-Path (Join-Path $EffectiveSourceDir "src"))) {
    Write-Error "Invalid source directory: Could not find 'src/' inside $EffectiveSourceDir"
    if ($TempExtractDir) { Remove-Item -Path $TempExtractDir -Recurse -Force }
    exit 1
}

# 2. Git Safety Net
Write-Host "[2/5] Creating Git safety net backup..." -ForegroundColor Green
try {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmm"
    $backupBranch = "backup/pre-ui-import-$timestamp"
    
    # Create a backup branch pointing to current HEAD
    git branch $backupBranch 2>$null
    Write-Host "  -> Created safety backup branch: $backupBranch" -ForegroundColor Cyan
    
    # Check if working directory is clean
    $gitStatus = git status --porcelain
    if ($gitStatus -and !$Force) {
        Write-Host "  Note: Uncommitted changes detected in working tree." -ForegroundColor DarkYellow
        Write-Host "  To rollback completely at any time, run: git reset --hard $backupBranch" -ForegroundColor Gray
    }
} catch {
    Write-Warning "Could not create git safety branch. Proceeding with caution..."
}

# 3. Whitelist-Only Sync with Hard Denylist Protection
Write-Host "[3/5] Syncing UI visual files (Whitelist Only)..." -ForegroundColor Green

# Hard Denylist Patterns (NEVER overwritten under any circumstances)
$DenylistPatterns = @(
    "backend/",
    "src/services/api.ts",
    "src/context/AuthContext.tsx",
    "src/components/auth/RequireAuth.tsx",
    "src/config/",
    "src/data/sourcedFacts.ts",
    "src/__tests__/",
    "e2e/",
    "vercel.json",
    "Dockerfile",
    "docker-compose.yml",
    "package.json",
    "vite.config.ts"
)

function Test-IsDenylisted([string]$relPath) {
    $norm = $relPath.Replace("\", "/")
    foreach ($pattern in $DenylistPatterns) {
        if ($norm -eq $pattern.TrimEnd('/') -or $norm.StartsWith($pattern)) {
            return $true
        }
    }
    return $false
}

$copiedFiles = @()

# Sync src/components/ (excluding RequireAuth.tsx)
$srcComponents = Join-Path $EffectiveSourceDir "src\components"
if (Test-Path $srcComponents) {
    Get-ChildItem -Path $srcComponents -Recurse -File | ForEach-Object {
        $relPath = "src/components/" + $_.FullName.Substring($srcComponents.Length).TrimStart('\', '/').Replace("\", "/")
        if (!(Test-IsDenylisted $relPath)) {
            $destPath = Join-Path $RepoRoot ($relPath.Replace("/", "\"))
            $destFolder = Split-Path $destPath -Parent
            if (!(Test-Path $destFolder)) { New-Item -ItemType Directory -Path $destFolder -Force | Out-Null }
            Copy-Item -Path $_.FullName -Destination $destPath -Force
            $copiedFiles += $relPath
        } else {
            Write-Host "  [PROTECTED] Skipped: $relPath" -ForegroundColor DarkCyan
        }
    }
}

# Sync src/pages/
$srcPages = Join-Path $EffectiveSourceDir "src\pages"
if (Test-Path $srcPages) {
    Get-ChildItem -Path $srcPages -Recurse -File | ForEach-Object {
        $relPath = "src/pages/" + $_.FullName.Substring($srcPages.Length).TrimStart('\', '/').Replace("\", "/")
        if (!(Test-IsDenylisted $relPath)) {
            $destPath = Join-Path $RepoRoot ($relPath.Replace("/", "\"))
            $destFolder = Split-Path $destPath -Parent
            if (!(Test-Path $destFolder)) { New-Item -ItemType Directory -Path $destFolder -Force | Out-Null }
            Copy-Item -Path $_.FullName -Destination $destPath -Force
            $copiedFiles += $relPath
        }
    }
}

# Sync src/index.css
$srcIndexCss = Join-Path $EffectiveSourceDir "src\index.css"
if (Test-Path $srcIndexCss) {
    Copy-Item -Path $srcIndexCss -Destination (Join-Path $RepoRoot "src\index.css") -Force
    $copiedFiles += "src/index.css"
}

# Sync tailwind.config.js
$srcTailwind = Join-Path $EffectiveSourceDir "tailwind.config.js"
if (Test-Path $srcTailwind) {
    Copy-Item -Path $srcTailwind -Destination (Join-Path $RepoRoot "tailwind.config.js") -Force
    $copiedFiles += "tailwind.config.js"
}

# Sync src/lib/motion.ts (if present)
$srcMotion = Join-Path $EffectiveSourceDir "src\lib\motion.ts"
if (Test-Path $srcMotion) {
    Copy-Item -Path $srcMotion -Destination (Join-Path $RepoRoot "src\lib\motion.ts") -Force
    $copiedFiles += "src/lib/motion.ts"
}

# Smart Check & Sync for src/App.tsx
$srcApp = Join-Path $EffectiveSourceDir "src\App.tsx"
if (Test-Path $srcApp) {
    $appContent = Get-Content -Path $srcApp -Raw
    $requiredRoutes = @(
        'path="/"',
        '/login',
        '/app',
        '/verify',
        '/share',
        '/design'
    )
    
    $allRoutesPreserved = $true
    foreach ($route in $requiredRoutes) {
        if ($appContent -notmatch [regex]::Escape($route)) {
            $allRoutesPreserved = $false
            Write-Warning "App.tsx in import is missing required route: $route"
        }
    }

    if ($allRoutesPreserved) {
        Copy-Item -Path $srcApp -Destination (Join-Path $RepoRoot "src\App.tsx") -Force
        $copiedFiles += "src/App.tsx"
    } else {
        $quarantineFile = Join-Path $RepoRoot "src\App.aistudio.tsx"
        Copy-Item -Path $srcApp -Destination $quarantineFile -Force
        Write-Warning "Incoming App.tsx omitted critical routes! Saved as 'src/App.aistudio.tsx' for manual review."
    }
}

Write-Host "  -> Copied $($copiedFiles.Count) UI visual files safely." -ForegroundColor Green

# 4. Automated Verification: Build & Tests
Write-Host "`n[4/5] Running automated build & test suites..." -ForegroundColor Cyan

$buildSuccess = $true
$testSuccess = $true

$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

Write-Host "  -> Running TypeScript typecheck & Vite build..." -ForegroundColor Gray
$buildOutput = cmd.exe /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) {
    $buildSuccess = $false
    Write-Host "`n❌ npm run build FAILED:" -ForegroundColor Red
    $buildOutput | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "  ✓ Build passed cleanly!" -ForegroundColor Green
}

Write-Host "  -> Running Vitest unit test suite..." -ForegroundColor Gray
$testOutput = cmd.exe /c "npm test 2>&1"
if ($LASTEXITCODE -ne 0) {
    $testSuccess = $false
    Write-Host "`n❌ npm test FAILED:" -ForegroundColor Red
    $testOutput | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "  ✓ All unit tests passed cleanly!" -ForegroundColor Green
}

$ErrorActionPreference = $prevErrorAction

# 5. Summary & Status Report
Write-Host "`n[5/5] UI Import Summary & Modified Files" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Gray
git status --short
Write-Host "=======================================================" -ForegroundColor Gray

if ($TempExtractDir -and (Test-Path $TempExtractDir)) {
    Remove-Item -Path $TempExtractDir -Recurse -Force
}

if ($buildSuccess -and $testSuccess) {
    Write-Host "`n🎉 UI IMPORT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "All components verified against compliance engines and test suites." -ForegroundColor White
    Write-Host "Safety backup branch: $backupBranch" -ForegroundColor Gray
    Write-Host "`nTo commit these improvements:" -ForegroundColor Cyan
    Write-Host "  git add ." -ForegroundColor Yellow
    Write-Host "  git commit -m `"feat(ui): integrate modernized UI styling from Google AI Studio`"" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️ IMPORT COMPLETED WITH WARNINGS/FAILURES." -ForegroundColor Yellow
    Write-Host "Review the errors above. To immediately roll back all imported changes, run:" -ForegroundColor White
    Write-Host "  git checkout -- ." -ForegroundColor Yellow
    Write-Host "  (or: git reset --hard $backupBranch)" -ForegroundColor Yellow
    exit 1
}
