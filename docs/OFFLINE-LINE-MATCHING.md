# Offline line matching with IndicConformer: research note

Status: a note for the owner to decide on. Nothing here is built or shipped, and the setup scripts do not
download anything new. All sizes, speeds and memory figures below are estimates that still have to be measured
on the church laptop.

## How Offline mode works today

- **Setup.** `setup-voice.ps1` (run by the "Setup offline voice (…).bat" files) downloads two things into `voice\`:
  the sherpa-onnx speech engine (Apache-2.0), which is the program `sherpa-onnx-offline-websocket-server`, and one
  OpenAI Whisper model in sherpa-onnx format (`voice\model\encoder*.onnx`, `decoder*.onnx`, `tokens.txt`).
- **Start.** `server.ps1` (run by "Start Lyric Follow.bat") starts one engine process for each language in
  `voice\languages.txt`, on ports ml 6011, ta 6012, en 6013, plus one on 6010 that only identifies the language.
  The flags are `--model-type=whisper --whisper-encoder=… --whisper-decoder=… --tokens=… --whisper-language=xx`.
- **App side.** `Local` in `js/app.js` opens a WebSocket to `ws://127.0.0.1:<port>` for the song's language and
  sends 16 kHz float audio (an 8-byte header, then the samples). Each phrase gets one JSON answer with `text`.
  When singing, `Local.clipTick` sends the last 4.5 s every 1.2 to 4 s (as fast as the engine answers). The text
  then goes the same way as Online text: `songClip` → `Trk.heard` (Core.trackStep picks the song and line) and
  `Lead.heard` (line timing).
- **Offline Whisper (whisper.cpp)**, when "Setup offline Whisper" was run, takes over singing on port 6020 (HTTP)
  and the WebSocket engines are kept for the preacher.

The weak point is the same in all of these: Whisper writes Malayalam and Tamil singing as text, often in the
wrong script or with many wrong letters, and the tracker then has to guess which lyric line that text was.

## What IndicConformer would add

AI4Bharat's IndicConformer (MIT licence) is a speech model trained on Indian languages, including Malayalam and
Tamil. It is a NeMo "Conformer" model with a CTC output (and a transducer output). A CTC output gives, for every
40 ms of audio, a score for every letter piece. That allows two uses.

### Option 1: IndicConformer as the recogniser in the existing engine (simplest)

sherpa-onnx's offline WebSocket server can already run NeMo CTC models, so the app side does not change: it still
gets `text` back, only better Malayalam and Tamil text.

- **Model files needed:** a sherpa-onnx-format export of IndicConformer for one language: `model.onnx` (ideally
  int8) and `tokens.txt`. One file per language (ml, ta); English keeps Whisper.
- **Engine flags (instead of the Whisper ones):** `--nemo-ctc-model="…\model.int8.onnx" --tokens="…\tokens.txt"`
  plus the existing `--port`, `--num-threads`, `--provider`. No language flag: the model is the language.
- **setup-voice.ps1:** a new choice (e.g. "Indian languages (IndicConformer)") that copies the two files into
  `voice\model-ml\` and `voice\model-ta\`. The download source is the owner's decision (below), so it is not
  written into the script now.
- **server.ps1:** in `Start-Voice`, for ml and ta, if `voice\model-<lang>\model*.onnx` exists, start that engine
  with the NeMo flags instead of the Whisper flags. The language-identification engine (6010) stays on Whisper.
- **App:** nothing required. Optional: label the engine in the status line.
- **Estimates:** the published IndicConformer models are around 120 M parameters (about 130 MB as int8 ONNX).
  Expected RAM per language engine about 0.4 to 0.7 GB; on a 4-core laptop CPU roughly 0.2 to 0.5 s for a 4.5 s
  clip (CTC decodes in one pass, no step-by-step decoding as Whisper does). To be measured.
- **Risk:** it is trained on speech, not singing over a band. It may still be much better than Whisper on Tamil
  and Malayalam words, but only a test on a recording of the church's own singing can say so.

### Option 2: true line scoring from the CTC scores (most accurate, more work)

Instead of turning the audio into text and then guessing the line, ask directly: "how well does this audio fit
lyric line 12, line 13, line 14 …?" With the CTC scores this is a standard forced-alignment score: for each
candidate line (the current line, the next few, the chorus lines, the lines this church usually jumps to), turn
its text into the model's letter pieces and compute the CTC probability of that line given the audio. The best
line wins, with a margin. Mishearings stop mattering, because the model never has to spell anything.

- **Why a helper is needed:** the sherpa-onnx WebSocket server returns only the final text, not the per-frame
  scores, so the scores cannot be read through it.
- **Helper on Windows:** a small local program, e.g. Python with `onnxruntime` and `numpy` packed with PyInstaller
  into one `lf-linescore.exe` (no Python install for the church), or a C# console app with the ONNX Runtime
  NuGet package. It listens on `127.0.0.1:6030`, receives `{audio, lines: [...]}` (16 kHz samples and up to ~20
  candidate line texts), runs the model once over the audio, and returns a score per line (CTC forward score
  normalised by length, plus the best-path text for the log).
- **App side:** a new path next to `Local` for singing: every clip, send the audio and the candidate lines chosen
  from the tracker's state (current, next 3, previous 2, chorus copies, learned jumps); feed the scores into
  Core.trackStep as line evidence (in place of the word scores for that clip).
- **Estimates:** one model run per clip (as Option 1) plus the line scoring, which is small (20 lines × ~40 letter
  pieces × ~110 frames). Expected under 0.6 s a clip on CPU, the same RAM as Option 1. To be measured.

Option 1 can be done first and kept: Option 2 uses the same model files.

## What the owner must decide

1. **Model source.** The official AI4Bharat IndicConformer files are on Hugging Face behind a licence click
   (gated), so downloading them needs the owner's own Hugging Face account and acceptance of their terms; they are
   NeMo `.nemo` files and must be exported to ONNX once (NeMo's export, then sherpa-onnx's metadata script).
   Community conversions to sherpa-onnx format exist on Hugging Face, but they are uploaded by people we do not
   know; using them means trusting files from an unknown source on the church laptop. The safe path is: the owner
   downloads the official files with his account, and the conversion is done once and checked.
2. **Which languages:** Malayalam and Tamil only (English stays on Whisper), or also Hindi.
3. **Option 1 only, or Option 2 as well** (Option 2 needs the helper program and more testing).
4. **Whether the setup script may download the model** once the source is chosen (today it must not).

## What must be measured on the laptop

- Memory per engine and in total with ml + ta + en running, and with Offline Whisper (6020) running as well.
- Time per 4.5 s clip, CPU and NVIDIA GPU, Malayalam and Tamil (from `voice\voice-ml.log`, and the app's
  `LF_DEBUG.timing()`).
- Accuracy on the church's own singing: record a service with "Record this service for testing", then compare
  Whisper and IndicConformer text on the same audio and replay both through `tests/timeline_replay.js`
  (right / one behind / wrong against the operator's corrections).
- For Option 2: how often the right line has the best score, and the score margin when it does not.
