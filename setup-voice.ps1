# Lyric Follow - one-time setup of the OFFLINE voice engine.
# Downloads free, open-source software (needs internet once, then works without internet):
#   - sherpa-onnx speech engine (Apache-2.0)  https://github.com/k2-fsa/sherpa-onnx
#   - OpenAI Whisper speech model (MIT), multilingual: understands Malayalam, Tamil, English and more
param([string]$Choice = '', [string]$Platform = '', [switch]$Full)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
$voice = Join-Path $root 'voice'
$ver = 'v1.13.8'
$rel = 'https://github.com/k2-fsa/sherpa-onnx/releases/download'
if (-not $Platform) { if ([Environment]::OSVersion.Platform -eq 'Win32NT') { $Platform = 'win' } else { $Platform = 'linux' } }
if ($Platform -eq 'win') { $pkg = "sherpa-onnx-$ver-win-x64-shared-MT-Release-no-tts" } else { $pkg = "sherpa-onnx-$ver-linux-x64-shared" }

Write-Host ''
Write-Host '  Lyric Follow - offline voice setup'
Write-Host '  ----------------------------------'
Write-Host '  Choose the speech model for this computer:'
Write-Host '    1) Fast      - for older / low-end laptops        (download ~120 MB)'
Write-Host '    2) Balanced  - recommended for most laptops        (download ~210 MB)'
Write-Host '    3) Accurate  - best for Malayalam/Tamil, needs a fast PC or an NVIDIA GPU (download ~640 MB)'
Write-Host '    4) Turbo     - top quality, for laptops with an NVIDIA GPU   (download ~560 MB)'
Write-Host '    5) Maximum   - Whisper large-v3, the most accurate; NVIDIA GPU needed for live use (download ~1 GB)'
Write-Host ''
while ($Choice -notin @('1', '2', '3', '4', '5')) { $Choice = Read-Host '  Type 1, 2, 3, 4 or 5 and press Enter' }
$model = @{ '1' = 'tiny'; '2' = 'base'; '3' = 'small'; '4' = 'turbo'; '5' = 'large-v3' }[$Choice]

# NVIDIA GPU present? Then use the CUDA build of the engine (needs the NVIDIA driver; CUDA 12 runtime is bundled).
$gpu = $false
if ($Platform -eq 'win' -and (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue)) { $gpu = $true }
if ($Platform -eq 'win' -and (Test-Path "$env:SystemRoot\System32\nvidia-smi.exe")) { $gpu = $true }
if ($gpu) { Write-Host '  NVIDIA graphics card found: installing the GPU version of the engine.'; $pkg = "sherpa-onnx-$ver-cuda-12.x-cudnn-9.x-onnxruntime1.28.2-win-x64-cuda" }
if (-not $gpu -and $Choice -eq '5') {
  Write-Host '  No NVIDIA graphics card found. The Maximum model is too slow on a CPU for live use (10-20 s per phrase).'
  $go = Read-Host '  Install it anyway? Type Y for yes, or N to install Accurate instead'
  if ($go -notmatch '^[Yy]') { $Choice = '3'; $model = 'small' }
}

function Get-File([string]$url, [string]$out) {
  Write-Host "  Downloading $(Split-Path -Leaf $url) ..."
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl -and $Platform -eq 'win') { & curl.exe -L --fail --retry 3 -o $out $url; if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" } }
  elseif (Get-Command curl -CommandType Application -ErrorAction SilentlyContinue) { & curl -sL --fail --retry 3 -o $out $url; if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" } }
  else { Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing }
}
function Expand-Bz2([string]$file, [string]$dest) {
  $tar = 'tar'; if ($Platform -eq 'win') { $tar = "$env:SystemRoot\System32\tar.exe" }
  & $tar -xjf $file -C $dest
  if ($LASTEXITCODE -ne 0) { throw "Could not unpack $file" }
}

try {
  # Running engines keep the model files open; stop them so the files can be replaced.
  Get-Process -Name 'sherpa-onnx-offline-websocket-server' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $tmp = Join-Path $voice 'download'
  New-Item -ItemType Directory -Force -Path $tmp, (Join-Path $voice 'bin'), (Join-Path $voice 'model') | Out-Null

  # 1) Speech engine program
  $exe = 'sherpa-onnx-offline-websocket-server'; if ($Platform -eq 'win') { $exe += '.exe' }
  if (-not (Test-Path (Join-Path $voice "bin\$exe")) -and -not (Test-Path (Join-Path $voice "bin/$exe"))) {
    $f = Join-Path $tmp "$pkg.tar.bz2"
    Get-File "$rel/$ver/$pkg.tar.bz2" $f
    Write-Host '  Unpacking engine ...'
    Expand-Bz2 $f $tmp
    Copy-Item -Force (Join-Path $tmp "$pkg/bin/$exe") (Join-Path $voice 'bin')
    Get-ChildItem (Join-Path $tmp "$pkg/bin"), (Join-Path $tmp "$pkg/lib") -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '\.(dll|so)(\.|$)' } | Copy-Item -Force -Destination (Join-Path $voice 'bin')
    if ($gpu) { Set-Content -Path (Join-Path $voice 'gpu.txt') -Value 'cuda' } else { Remove-Item -Force (Join-Path $voice 'gpu.txt') -ErrorAction SilentlyContinue }
  }

  # 2) Speech model
  $mf = Join-Path $tmp "sherpa-onnx-whisper-$model.tar.bz2"
  Get-File "$rel/asr-models/sherpa-onnx-whisper-$model.tar.bz2" $mf
  Write-Host '  Unpacking model (this can take a minute) ...'
  Expand-Bz2 $mf $tmp
  $src = Join-Path $tmp "sherpa-onnx-whisper-$model"
  # The compact int8 files are used by default: in testing they transcribed Malayalam better than the full-precision
  # files (which sometimes return nothing for a phrase). -Full installs the full-precision files for an NVIDIA GPU,
  # where they run several times faster.
  $enc8 = Get-ChildItem $src -Filter '*encoder.int8.onnx' | Select-Object -First 1
  $dec8 = Get-ChildItem $src -Filter '*decoder.int8.onnx' | Select-Object -First 1
  $enc32 = Get-ChildItem $src -Filter '*encoder.onnx' | Where-Object { $_.Name -notlike '*int8*' } | Select-Object -First 1
  $dec32 = Get-ChildItem $src -Filter '*decoder.onnx' | Where-Object { $_.Name -notlike '*int8*' } | Select-Object -First 1
  $useFull = $Full -and $gpu -and $enc32 -and $dec32
  if (-not $useFull -and -not $enc8) { $enc8 = $enc32; $dec8 = $dec32 }
  Remove-Item -Force (Join-Path $voice 'model/encoder.onnx'), (Join-Path $voice 'model/decoder.onnx'), (Join-Path $voice 'model/encoder.int8.onnx'), (Join-Path $voice 'model/decoder.int8.onnx') -ErrorAction SilentlyContinue
  if ($useFull) {
    Copy-Item -Force $enc32.FullName (Join-Path $voice 'model/encoder.onnx')
    Copy-Item -Force $dec32.FullName (Join-Path $voice 'model/decoder.onnx')
    $tag = "whisper-$model (GPU, full precision)"
  } else {
    Copy-Item -Force $enc8.FullName (Join-Path $voice 'model/encoder.int8.onnx')
    Copy-Item -Force $dec8.FullName (Join-Path $voice 'model/decoder.int8.onnx')
    $tag = "whisper-$model"
    if ($gpu -and $Full) { Write-Host '  Note: this model is only available in compact (int8) form.' }
  }
  Copy-Item -Force (Get-ChildItem $src -Filter '*tokens.txt' | Select-Object -First 1).FullName (Join-Path $voice 'model/tokens.txt')
  Set-Content -Path (Join-Path $voice 'model/model.txt') -Value $tag
  if (-not (Test-Path (Join-Path $voice 'languages.txt'))) { Set-Content -Path (Join-Path $voice 'languages.txt') -Value 'ml ta en' }

  Remove-Item -Recurse -Force $tmp
  Write-Host ''
  Write-Host "  Done. Offline voice is ready (whisper-$model)."
  # The GPU build of the engine also needs NVIDIA's CUDA/cuDNN runtime files.
  if ($gpu -and -not (Test-Path (Join-Path $voice 'bin\cublasLt64_12.dll'))) {
    Write-Host ''
    $env:LF_NO_PAUSE = '1'
    & (Join-Path $root 'setup-gpu.ps1')
  }
  Write-Host '  Start the app with "Start Lyric Follow.bat" and choose Offline at the top.'
} catch {
  Write-Host ''
  Write-Host "  Setup did not finish: $($_.Exception.Message)"
  Write-Host '  Check the internet connection and run this setup again.'
}
if ($Platform -eq 'win' -and -not $env:LF_NO_PAUSE) { Read-Host '  Press Enter to close' | Out-Null }
