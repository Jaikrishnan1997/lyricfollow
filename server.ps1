# Lyric Follow - tiny local web server (no install needed, built into Windows).
# Serving the app from http://localhost lets the browser remember the microphone permission,
# makes listening reliable, and keeps your songs in one place.
param([int]$Port = 8765, [switch]$NoBrowser, [switch]$ForceTcp)

$root = (Split-Path -Parent $MyInvocation.MyCommand.Path).TrimEnd('\', '/')
$url = "http://localhost:$Port/index.html"
$isWin = [Environment]::OSVersion.Platform -eq 'Win32NT'

function Open-App {
  if ($NoBrowser) { return }
  if (-not $isWin) { Write-Host "Open $url in Chrome or Edge."; return }
  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path -LiteralPath $c)) { Start-Process -FilePath $c -ArgumentList "--app=$url"; return }
  }
  Start-Process $url
}

# Offline voice engines (installed by "Setup offline voice.bat"). One recogniser per language gives far better
# Malayalam/Tamil results than automatic language detection. Ports: ml 6011, ta 6012, en 6013, hi 6014.
function Start-Voice {
  $exe = Join-Path $root 'voice/bin/sherpa-onnx-offline-websocket-server'
  if ($isWin) { $exe += '.exe' }
  $m = Join-Path $root 'voice/model'
  if (-not (Test-Path -LiteralPath $exe) -or -not (Test-Path -LiteralPath (Join-Path $m 'encoder.int8.onnx'))) { return }
  $langFile = Join-Path $root 'voice/languages.txt'
  $langs = @('ml', 'ta', 'en')
  if (Test-Path -LiteralPath $langFile) { $langs = @((Get-Content $langFile -Raw) -split '[\s,]+' | Where-Object { $_ }) }
  $ports = @{ ml = 6011; ta = 6012; en = 6013; hi = 6014; auto = 6010 }
  $langs = @($langs) + @('auto')      # the "auto" engine only identifies the language being spoken
  $cores = [Environment]::ProcessorCount
  $threads = [Math]::Max(1, [Math]::Min(4, [Math]::Floor(($cores - 1) / [Math]::Max(1, $langs.Count - 1))))
  $provider = 'cpu'
  if (Test-Path -LiteralPath (Join-Path $root 'voice/gpu.txt')) {
    if (Test-Path -LiteralPath (Join-Path $root 'voice/bin/cublasLt64_12.dll')) { $provider = 'cuda'; $threads = 2 }
    else { Write-Host '  NVIDIA GPU files are missing - run "Setup GPU support.bat" once. Using the CPU for now.' }
  }
  $started = @()
  foreach ($lang in $langs) {
    $port = $ports[$lang]; if (-not $port) { continue }
    try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $port); $c.Close(); $started += "$lang (already running)"; continue } catch { }
    $voiceArgs = @("--port=$port", "--num-threads=$threads", '--model-type=whisper', '--whisper-tail-paddings=300', "--provider=$provider",
      "--whisper-encoder=`"$(Join-Path $m 'encoder.int8.onnx')`"", "--whisper-decoder=`"$(Join-Path $m 'decoder.int8.onnx')`"",
      "--tokens=`"$(Join-Path $m 'tokens.txt')`"")
    if ($lang -ne 'auto') { $voiceArgs += "--whisper-language=$lang" }
    # Engine output goes to voice/voice-<lang>.log so a failed start can be diagnosed.
    $sp = @{ FilePath = $exe; ArgumentList = $voiceArgs; WorkingDirectory = (Split-Path $exe)
             RedirectStandardOutput = (Join-Path $root "voice/voice-$lang.log"); RedirectStandardError = (Join-Path $root "voice/voice-$lang-err.log") }
    if ($isWin) { $sp.WindowStyle = 'Minimized' }
    Start-Process @sp
    $started += $lang
  }
  Write-Host "  Offline voice engines started ($((Get-Content (Join-Path $m 'model.txt') -ErrorAction SilentlyContinue)), $provider): $($started -join ', ')"
}
Start-Voice

# Already running (second double-click)? Just open the app window.
try {
  $probe = New-Object System.Net.Sockets.TcpClient
  $probe.Connect('127.0.0.1', $Port); $probe.Close()
  Write-Host "Lyric Follow is already running."
  Open-App; exit 0
} catch { }

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
  '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'; '.svg' = 'image/svg+xml';
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
}

function Resolve-File([string]$rawPath) {
  $p = [Uri]::UnescapeDataString(($rawPath -split '\?')[0]).TrimStart('/')
  if ($p -eq '') { $p = 'index.html' }
  $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $p))
  if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { return $null }
  return $full
}
function Get-Type([string]$file) {
  $t = $types[[System.IO.Path]::GetExtension($file).ToLower()]
  if ($t) { return $t } else { return 'application/octet-stream' }
}

Write-Host ""
Write-Host "  Lyric Follow is running:  $url"
Write-Host "  Keep this window open during the service. Close it to stop."
Write-Host ""

# 1) Preferred: the Windows HTTP server (handles many requests at once).
$http = $null
if (-not $ForceTcp) {
  try {
    $http = New-Object System.Net.HttpListener
    $http.Prefixes.Add("http://localhost:$Port/")
    $http.Start()
  } catch { $http = $null }
}

if ($http) {
  Open-App
  while ($http.IsListening) {
    $ctx = $http.GetContext()
    try {
      $file = Resolve-File $ctx.Request.Url.AbsolutePath
      $res = $ctx.Response
      $res.Headers.Add('Cache-Control', 'no-cache')
      if ($file) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $res.ContentType = Get-Type $file
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else { $res.StatusCode = 404 }
      $res.OutputStream.Close()
    } catch { }
  }
  exit 0
}

# 2) Fallback: plain socket server (works without any Windows permissions).
$tcp = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try { $tcp.Start() } catch { Write-Host "Port $Port is busy. Close other copies of Lyric Follow and try again."; Read-Host 'Press Enter to close'; exit 1 }
Open-App
while ($true) {
  $client = $tcp.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    # Browsers open spare connections that never send anything; don't wait on them for long.
    $waited = 0
    while (-not $stream.DataAvailable -and $waited -lt 800) { Start-Sleep -Milliseconds 20; $waited += 20 }
    if (-not $stream.DataAvailable) { $client.Close(); continue }
    $stream.ReadTimeout = 2000
    $buf = New-Object byte[] 8192
    $n = $stream.Read($buf, 0, $buf.Length)
    $req = [System.Text.Encoding]::ASCII.GetString($buf, 0, $n)
    $path = '/'
    if ($req -match '^(GET|HEAD) (\S+)') { $path = $Matches[2] }
    $file = Resolve-File $path
    if ($file) {
      $body = [System.IO.File]::ReadAllBytes($file)
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $(Get-Type $file)`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    }
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if ($req -notmatch '^HEAD') { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
