# Lyric Follow - offline Whisper for singing (whisper.cpp, MIT licence, https://github.com/ggml-org/whisper.cpp)
# Installs the Whisper large-v3 model the Online mode uses (or its smaller turbo version), running on this laptop: no internet,
# no API key, no daily limit. With an NVIDIA graphics card it uses the GPU (CUDA 12 build).
# Needs internet once: ~690 MB program (GPU build, includes the CUDA files) + ~1.1 GB model (large-v3) or ~550 MB (turbo).
param([switch]$Cpu, [switch]$Turbo, [switch]$Large, [switch]$Reinstall)
$ErrorActionPreference = 'Stop'
$root = (Split-Path -Parent $MyInvocation.MyCommand.Path).TrimEnd('\', '/')
$dir = Join-Path $root 'voice\whisper'
$tmp = Join-Path $root 'voice\tmp-whisper'
$rel = 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454'
$hf = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'

function Get-File([string]$url, [string]$out) {
  Write-Host "  Downloading $(Split-Path -Leaf $url) ..."
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) { & curl.exe -L --fail --retry 3 -o $out $url; if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" } }
  else { Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing }
}

Write-Host ''
Write-Host '  Lyric Follow - offline Whisper for singing'
Write-Host '  ------------------------------------------'
$gpu = (-not $Cpu) -and ((Test-Path "$env:SystemRoot\System32\nvidia-smi.exe") -or [bool](Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue))
$vram = 0
if ($gpu) {
  $zip = 'whisper-bin-win-cuda-12.4.0-x64.zip'
  try { $q = (& nvidia-smi.exe --query-gpu=name,memory.total --format=csv,noheader,nounits | Select-Object -First 1) -split ','; $vram = [int]$q[1].Trim(); Write-Host "  NVIDIA graphics card found: $($q[0].Trim()), $vram MB - installing the GPU (CUDA 12) version." }
  catch { Write-Host '  NVIDIA graphics card found: installing the GPU (CUDA 12) version.' }
} else { Write-Host '  No NVIDIA graphics card: installing the CPU version (slower: a clip every 3-6 s).'; $zip = 'whisper-blas-bin-x64.zip' }
# Model: large-v3 (best for Tamil/Malayalam singing - it wrote clearer lines than turbo in our tests) on a card with
# 6 GB or more; turbo (several times faster to write, a little less accurate) otherwise - measured on a 4 GB GTX 1650:
# large-v3 took about 3 s a clip even with the shorter context. -Turbo / -Large choose explicitly.
$big = $Large -or (-not $Turbo -and $gpu -and $vram -ge 5800)
if ($big) { $mname = 'ggml-large-v3-q5_0.bin'; $mtag = 'whisper large-v3 (q5_0)'; $msize = 900MB } else { $mname = 'ggml-large-v3-turbo-q5_0.bin'; $mtag = 'whisper large-v3-turbo (q5_0)'; $msize = 450MB }
Write-Host "  Model: $mtag"
$modelUrl = "$hf/$mname"

Get-Process -Name 'whisper-server' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
New-Item -ItemType Directory -Force -Path $dir, $tmp | Out-Null
try {
  # 1) Program (kept when already installed with the same kind of build; -Reinstall downloads it again)
  $kind = if ($gpu) { 'cuda' } else { 'cpu' }
  $haveKind = if (Test-Path (Join-Path $dir 'gpu.txt')) { 'cuda' } else { 'cpu' }
  if (-not $Reinstall -and (Test-Path (Join-Path $dir 'whisper-server.exe')) -and $kind -eq $haveKind) { Write-Host '  Program already installed.' } else {
  $zf = Join-Path $tmp $zip
  Get-File "$rel/$zip" $zf
  $ex = Join-Path $tmp 'x'; if (Test-Path $ex) { Remove-Item -Recurse -Force $ex }
  Expand-Archive -LiteralPath $zf -DestinationPath $ex -Force
  $srv = Get-ChildItem $ex -Recurse -Filter 'whisper-server.exe' | Select-Object -First 1
  if (-not $srv) { throw 'whisper-server.exe was not found in the download.' }
  Copy-Item -Force (Join-Path $srv.DirectoryName '*') $dir
  # The CUDA build needs the CUDA 12 runtime: reuse the files "Setup GPU support.bat" installed, if they are missing.
  if ($gpu) {
    foreach ($f in 'cudart64_12.dll', 'cublas64_12.dll', 'cublasLt64_12.dll') {
      $have = Join-Path $dir $f; $src = Join-Path $root "voice\bin\$f"
      if (-not (Test-Path $have) -and (Test-Path $src)) { Copy-Item -Force $src $have }
      if (-not (Test-Path $have)) { Write-Host "  Note: $f is missing - run ""Setup GPU support.bat"" once, then this setup again." }
    }
  }
  }
  # 2) Model (kept when already downloaded)
  $mf = Join-Path $dir 'model.bin'
  $had = (Get-Content (Join-Path $dir 'model.txt') -ErrorAction SilentlyContinue) -join ''
  if (-not (Test-Path $mf) -or (Get-Item $mf).Length -lt $msize -or $had -ne $mtag) { Get-File $modelUrl (Join-Path $tmp 'model.bin'); Move-Item -Force (Join-Path $tmp 'model.bin') $mf }
  Set-Content -Path (Join-Path $dir 'model.txt') -Value $mtag
  if ($gpu) { Set-Content -Path (Join-Path $dir 'gpu.txt') -Value 'cuda' } else { Remove-Item -Force (Join-Path $dir 'gpu.txt') -ErrorAction SilentlyContinue }
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
Write-Host ''
Write-Host '  Done. Close Lyric Follow and start it again with "Start Lyric Follow.bat",'
Write-Host '  choose Offline at the top and press Start listening - singing now uses Whisper on this laptop.'
Write-Host ''
if ($Host.Name -eq 'ConsoleHost') { Read-Host '  Press Enter to close' | Out-Null }
