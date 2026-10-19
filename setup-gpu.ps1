# Lyric Follow - installs the NVIDIA CUDA 12 / cuDNN 9 runtime files the GPU voice engine needs.
# They are downloaded from NVIDIA's official packages on PyPI (free to use; needs internet once, ~1.7 GB).
# Nothing is installed system-wide: the files are copied next to the engine in voice\bin.
param([string]$Platform = '')

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bin = Join-Path $root 'voice\bin'
if (-not $Platform) { if ([Environment]::OSVersion.Platform -eq 'Win32NT') { $Platform = 'win' } else { $Platform = 'linux' } }

Write-Host ''
Write-Host '  Lyric Follow - GPU runtime setup (NVIDIA CUDA 12 + cuDNN 9)'
Write-Host '  -----------------------------------------------------------'

if ($Platform -ne 'win') { Write-Host '  This step is only needed on Windows.'; exit 0 }
if (-not (Test-Path $bin)) { Write-Host '  Run "Setup offline voice" first.'; Read-Host '  Press Enter to close' | Out-Null; exit 1 }

# package name -> major version that ONNX Runtime 1.28 (CUDA 12 build) links against
$wanted = [ordered]@{
  'nvidia-cuda-runtime-cu12' = 12; 'nvidia-cublas-cu12' = 12; 'nvidia-cudnn-cu12' = 9
  'nvidia-cufft-cu12' = 11; 'nvidia-curand-cu12' = 10; 'nvidia-cuda-nvrtc-cu12' = 12
}
$tmp = Join-Path $root 'voice\download'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

function Get-File([string]$url, [string]$out) {
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) { & curl.exe -L --fail --retry 3 -o $out $url; if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" } }
  else { Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing }
}

try {
  foreach ($pkg in $wanted.Keys) {
    $major = $wanted[$pkg]
    Write-Host "  Looking up $pkg ..."
    $meta = Invoke-RestMethod -Uri "https://pypi.org/pypi/$pkg/json" -UseBasicParsing
    $best = $null; $bestVer = [version]'0.0'
    foreach ($prop in $meta.releases.PSObject.Properties) {
      $v = $null; if (-not [version]::TryParse($prop.Name, [ref]$v)) { continue }
      if ($v.Major -ne $major -or $v -le $bestVer) { continue }
      $f = @($prop.Value | Where-Object { $_.filename -like '*win_amd64.whl' -and -not $_.yanked }) | Select-Object -First 1
      if ($f) { $best = $f; $bestVer = $v }
    }
    if (-not $best) { throw "No Windows package found for $pkg" }
    $zip = Join-Path $tmp ($pkg + '.zip')
    Write-Host "  Downloading $($best.filename) ($([math]::Round($best.size / 1MB)) MB) ..."
    Get-File $best.url $zip
    $dest = Join-Path $tmp $pkg
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    $dlls = Get-ChildItem -Path $dest -Recurse -Filter '*.dll'
    if (-not $dlls) { throw "No DLL files inside $($best.filename)" }
    $dlls | Copy-Item -Force -Destination $bin
    Write-Host "  Installed $($dlls.Count) files from $pkg"
    Remove-Item -Recurse -Force $dest, $zip
  }
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  Set-Content -Path (Join-Path $root 'voice\gpu.txt') -Value 'cuda'
  Write-Host ''
  Write-Host '  Done. The voice engines will use the NVIDIA GPU the next time "Start Lyric Follow.bat" runs.'
} catch {
  Write-Host ''
  Write-Host "  GPU setup did not finish: $($_.Exception.Message)"
  Write-Host '  The app still works on the CPU. Check the internet connection and run this setup again.'
}
if (-not $env:LF_NO_PAUSE) { Read-Host '  Press Enter to close' | Out-Null }
