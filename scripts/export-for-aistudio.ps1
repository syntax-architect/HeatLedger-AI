# HeatLedger AI: Google AI Studio UI Exporter
# Generates a pure frontend bundle in 'aistudio-ui/' for visual redesigns without backend/test baggage.

param(
    [string]$OutputDir = "aistudio-ui"
)

$ErrorActionPreference = "Stop"

# Determine Repo Root
$RepoRoot = if ($PSScriptRoot) { (Resolve-Path "$PSScriptRoot\..").Path } else { (Get-Location).Path }
$TargetDir = Join-Path $RepoRoot $OutputDir

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " [HeatLedger AI] Exporting Frontend for Google AI Studio" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan
Write-Host "Repo Root : $RepoRoot" -ForegroundColor Gray
Write-Host "Target Dir: $TargetDir" -ForegroundColor Gray

# 1. Clean up previous export
if (Test-Path $TargetDir) {
    Write-Host "[1/6] Cleaning existing $OutputDir folder..." -ForegroundColor Yellow
    Remove-Item -Path $TargetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

# 2. Copy root configuration files
Write-Host "[2/6] Copying core frontend configuration files..." -ForegroundColor Green
$RootFiles = @("index.html", "tailwind.config.js", "postcss.config.js", "tsconfig.json")
foreach ($file in $RootFiles) {
    $srcFile = Join-Path $RepoRoot $file
    if (Test-Path $srcFile) {
        Copy-Item -Path $srcFile -Destination (Join-Path $TargetDir $file) -Force
    } else {
        Write-Warning "File not found: $file"
    }
}

# 3. Copy public assets (filtering out files > 2MB)
Write-Host "[3/6] Copying public/ assets..." -ForegroundColor Green
$PublicSrc = Join-Path $RepoRoot "public"
$PublicDst = Join-Path $TargetDir "public"
New-Item -ItemType Directory -Path $PublicDst -Force | Out-Null

Get-ChildItem -Path $PublicSrc -Recurse -File | ForEach-Object {
    $relPath = $_.FullName.Substring($PublicSrc.Length).TrimStart('\', '/')
    $targetFile = Join-Path $PublicDst $relPath
    $targetFolder = Split-Path $targetFile -Parent
    if (!(Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    }
    
    # Check if file is PDF > 2MB
    if ($_.Extension -eq ".pdf" -and $_.Length -gt (2 * 1024 * 1024)) {
        Write-Host "  -> Skipping large PDF: $relPath ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor DarkYellow
    } else {
        Copy-Item -Path $_.FullName -Destination $targetFile -Force
    }
}

# 4. Copy src/ excluding test suites and test files
Write-Host "[4/6] Copying src/ files (stripping __tests__ and *.test/*spec files)..." -ForegroundColor Green
$SrcDir = Join-Path $RepoRoot "src"
$DstDir = Join-Path $TargetDir "src"

Get-ChildItem -Path $SrcDir -Recurse -File | ForEach-Object {
    $fullName = $_.FullName
    $name = $_.Name
    
    # Exclude __tests__ folder and any test/spec files
    if ($fullName -match "[\\/]?__tests__[\\/]" -or $name -match "\.(test|spec)\.(ts|tsx|js|jsx)$") {
        # Skip test files
        return
    }
    
    $relPath = $fullName.Substring($SrcDir.Length).TrimStart('\', '/')
    $targetFile = Join-Path $DstDir $relPath
    $targetFolder = Split-Path $targetFile -Parent
    if (!(Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    }
    Copy-Item -Path $fullName -Destination $targetFile -Force
}

# 5. Generate clean package.json and vite.config.ts
Write-Host "[5/6] Generating minimal package.json and vite.config.ts..." -ForegroundColor Green

$PackageJsonContent = @'
{
  "name": "heatledger-ai-ui",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fontsource/jetbrains-mono": "^5.3.0",
    "@fontsource/plus-jakarta-sans": "^5.3.0",
    "@radix-ui/react-dialog": "^1.3.1",
    "@tanstack/react-query": "^5.108.0",
    "@tanstack/react-virtual": "^3.14.26",
    "canvas-confetti": "^1.9.4",
    "clsx": "^2.1.1",
    "framer-motion": "^11.11.17",
    "i18next": "^27.2.2",
    "lenis": "^1.3.27",
    "lucide-react": "^0.460.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^18.0.3",
    "react-router-dom": "^7.18.6",
    "tailwind-merge": "^2.5.4",
    "vaul": "^1.1.2",
    "zod": "^4.6.7",
    "zustand": "^5.1.0"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "~5.6.2",
    "vite": "^5.4.10"
  }
}
'@
Set-Content -Path (Join-Path $TargetDir "package.json") -Value $PackageJsonContent -Encoding UTF8

$ViteConfigContent = @'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone Vite configuration for Google AI Studio UI previews
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
});
'@
Set-Content -Path (Join-Path $TargetDir "vite.config.ts") -Value $ViteConfigContent -Encoding UTF8

# Generate .env with VITE_UI_PREVIEW_MODE=true
$EnvContent = @"
VITE_UI_PREVIEW_MODE=true
VITE_BACKEND_URL=http://127.0.0.1:8000
"@
Set-Content -Path (Join-Path $TargetDir ".env") -Value $EnvContent -Encoding UTF8

# 6. Generate UI_REDESIGN_RULES.md
Write-Host "[6/6] Generating UI_REDESIGN_RULES.md (Contracts & Compliance Safeguards)..." -ForegroundColor Green

$RulesContent = @'
# HeatLedger AI: Google AI Studio UI Redesign Guide & Rules

Welcome to the pure frontend bundle of **HeatLedger AI**. This isolated environment is optimized for Google AI Studio Build Mode, allowing you to rapidly iterate on aesthetics, layouts, typography, micro-interactions, and visual polish without touching or breaking the Python backend or automated test suites.

---

## 1. Operating Rules for AI Studio

1. **Auto-Hydrated Mock Session Active:**
   - `.env` specifies `VITE_UI_PREVIEW_MODE=true`.
   - The application automatically logs in as QA Inspector **R. K. Chatterjee** (`QA_INSPECTOR`, Liluah Works, `org_howrah_steel_01`).
   - All dashboard views (`/app`, `/design`, `/verify/:code`, `/share/:token`, `/supplier-request/:token`) render offline immediately without requiring the FastAPI Python server.

2. **Routes Must Be Preserved Exactly:**
   The following routes are strictly required:
   - `/` : Public Marketing Landing Page & Hero
   - `/login` : Inspector & Exporter Authentication
   - `/app` : Factory QA Console & Command Center
   - `/verify/:code` : Public Customs & Verifier QR Code Verification Screen
   - `/share/:token` : Buyer & Customs-Broker Shared Dossier Portal
   - `/supplier-request/:token` : Supplier Precursor Ingestion Portal
   - `/design` : Live Design System Tokens & Component Kit

3. **Component Prop Contracts:**
   - Do NOT delete or rename props on views inside `src/components/dashboard/views/` (e.g., `MtcWorkbenchView`, `CbamDossierView`, `HeatInventoryView`, `SignOffQueueView`, `SupplierIntelligenceView`).
   - Preserve existing form input types, data attributes, and callback parameters (`onSelect`, `onSave`, `onClose`, `onSubmit`).

4. **Style & Aesthetics Principles:**
   - **Industrial Precision:** Clean dark-slate console backgrounds (`#0B0F19`, `#111827`) paired with crisp slate hairline borders (`#334155`).
   - **Signal Colors:**
     - Emerald (`#10B981`): ASTM/CBAM pass, valid signatures, compliant emission intensity.
     - Molten Amber (`#F59E0B`): Upstream heat trace, melt-and-pour lineage, warnings.
     - Cobalt Blue (`#2563EB`): EN 10204 Clause 6 telemetry, PDF coordinates, verification seals.
     - Crimson Oxide (`#EF4444`): Metallurgical rejections, off-spec chemistry, missing proofs.
   - **Typography:**
     - Body & Headings: `Plus Jakarta Sans`
     - Metrics, Heat Numbers, Coordinates & Hashes: `JetBrains Mono`

---

## 2. Mandatory Compliance Lexicon (Statutory Claims Register)

HeatLedger AI is built under strict compliance with Regulation (EU) 2023/956 (CBAM), Implementing Regulation (EU) 2025/2621 (Statutory Markups), Implementing Regulation (EU) 2026/1963 (Melt-and-Pour Origin), and EN 10204:2004 Clause 6.

### Prohibited Words (DO NOT USE in copy or labels):
| ❌ Prohibited Word / Phrase | ✅ Mandatory Compliant Replacement | Reason |
|---|---|---|
| `"Guaranteed"` / `"100% Audit Guaranteed"` | `"Verifiable SHA-256 audit trail"` or `"Supports verifier audit readiness"` | Software does not guarantee third-party regulatory certification. |
| `"Zero-Forgery"` | `"Byte-identical original preservation"` or `"EN 10204 Clause 6 deliverable"` | Unprovable superlative. |
| `"Certified & Locked"` | `"Digitally Signed (Ed25519)"` | Software cannot certify engineering properties on its own authority. |
| `"Tamper-Proof"` | `"Tamper-evident"` or `"cryptographically verifiable with SHA-256"` | Cryptography provides tamper-evidence, not physical impossibility. |
| `"penalty"` / `"punitive fine"` | `"statutory markup under Implementing Regulation (EU) 2025/2621"` | CBAM default adjustments are border adjustments, not criminal penalties. |
| `"tax savings"` | `"estimated cost difference versus default values"` | Creates legal and tax liability. |
| `"Eliminate"` | `"Defend against"` or `"Reduce exposure to"` | Overpromises operational outcomes. |
| `"ZDR guarantee"` | `"Zero-Data-Retention processing"` | Avoid commercial warranty exposure. |

### Mandatory Legal Disclaimer:
All public and shared footers must retain the canonical notice:
> *"HeatLedger supports compliance preparation. It is not legal advice and not an accredited verification body."*

---

## 3. How to Preview & Redesign Locally

```bash
# 1. Enter the exported UI directory
cd aistudio-ui

# 2. Install pure UI dependencies
npm install

# 3. Start Vite dev server
npm run dev
```

Visit `http://localhost:3000` to interact with every screen offline.

When you finish your redesign in Google AI Studio, simply download the updated files or `.zip` and use:
```powershell
.\scripts\import-from-aistudio.ps1 -SourcePath <path-or-zip>
```
'@
Set-Content -Path (Join-Path $TargetDir "UI_REDESIGN_RULES.md") -Value $RulesContent -Encoding UTF8

# Summary stats
$AllExportedFiles = Get-ChildItem -Path $TargetDir -Recurse -File
$TotalSize = ($AllExportedFiles | Measure-Object -Property Length -Sum).Sum
$TotalSizeMB = [math]::Round($TotalSize / 1MB, 2)
$FileCount = $AllExportedFiles.Count

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " EXPORT COMPLETE!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Destination: $TargetDir" -ForegroundColor White
Write-Host "Total Files: $FileCount" -ForegroundColor White
Write-Host "Total Size : $TotalSizeMB MB" -ForegroundColor White
Write-Host "`nNext Steps for Google AI Studio Build Mode:" -ForegroundColor Cyan
Write-Host "  1. You can now open or upload '$OutputDir' to Google AI Studio." -ForegroundColor Gray
Write-Host "  2. In AI Studio, prompt for visual polish, modern layouts, micro-interactions, or sleek redesigns." -ForegroundColor Gray
Write-Host "  3. When done, download the resulting code (or zip) and run:" -ForegroundColor Gray
Write-Host "     .\scripts\import-from-aistudio.ps1 -SourcePath <path-to-folder-or-zip>" -ForegroundColor Yellow
Write-Host "=======================================================`n" -ForegroundColor Green
