# Lyric Follow

Church projection for songs and the Bible, in Malayalam, Tamil and English.
It listens to the singer and moves the projector to the line being sung.

Everything is free and open source. No account, no subscription.

## Offline and Online

Use the **💻 Offline / 🌐 Online** switch at the top. You can change it at any time, even during a service.

| | Offline (default) | Online |
|---|---|---|
| Songs, Bible (6 versions), projector, backgrounds, backup | ✅ | ✅ |
| Photo / screenshot → lyrics (Malayalam, Tamil, English) | ✅ on this computer | ✅ |
| Listening to singing and to the preacher | ✅ free Whisper model on this computer (after the one-time voice setup) | ✅ Chrome/Edge online speech service |
| Language | detected automatically, can change song to song | follows each song's language |

**How the offline voice copes with Malayalam/Tamil:** the free Whisper model often writes Malayalam/Tamil in English or even Urdu letters. The app reads all of these (consonant-sound matching), so songs are still followed and spoken references like "യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം" are still found. Book names spoken in Malayalam that come out badly garbled can be missed offline.

**Accuracy, honestly:** the offline model understands English very well and Malayalam/Tamil reasonably, because
the app only has to find which known line is being sung, it tolerates many mistakes.
For Malayalam/Tamil the Online service is still more accurate. Use the "Accurate" offline model on a good laptop,
or switch to Online when internet is available.

### One-time offline voice setup
Double-click **Setup offline voice (Balanced).bat** or **Setup offline voice (Accurate).bat** (no questions), or **Setup offline voice.bat** to choose. Close Lyric Follow before changing the model. Needs internet only this once:
1. Fast – older/low-end laptops (~120 MB download)
2. Balanced – most laptops (~210 MB)
3. Accurate – fast laptops, best for Malayalam/Tamil (~640 MB)
4. Turbo – top quality, for laptops with an NVIDIA GPU (~560 MB). The setup installs the GPU engine automatically when an NVIDIA card is found, together with NVIDIA's CUDA 12 / cuDNN 9 runtime files (~1.7 GB, free). If the launcher says the GPU files are missing, run **Setup GPU support.bat** once. After changing the model or GPU settings, **Restart voice engines.bat** restarts only the engines (the app window can stay open). To compare, `voice/cpu.txt` containing `cpu` forces the CPU; put `gpu` in it (or delete it) to use the GPU again.
5. Maximum – Whisper large-v3, the most accurate Whisper model (~1 GB). Live use needs an NVIDIA GPU; on a CPU each phrase takes 10–20 s, so the setup offers Accurate instead when no GPU is found. Each language engine loads its own copy of the model, so with Maximum keep `voice/languages.txt` to the languages you really use (e.g. `ml ta`) unless the card has 8 GB or more.

It downloads the free sherpa-onnx speech engine (Apache-2.0) and an OpenAI Whisper model (MIT) into the `voice` folder.
After that, **Start Lyric Follow.bat** starts one recogniser per language (Malayalam, Tamil, English) automatically;
the app uses the one matching the song or the preacher. Edit `voice\languages.txt` to change the set (e.g. `ml en`).

**Important:** the `voice` folder is NOT inside the zip. If you unzip the app again over the folder, run the voice setup again.

**Which model?** Balanced follows songs well in all three languages. For Malayalam/Tamil *preaching* and for noisy halls,
**Accurate** is clearly better (tested: it still read a Malayalam song correctly with loud clapping and talking mixed in).
Accurate needs about 1 GB of RAM per language and a reasonably fast PC; if the app shows the engine falling behind, go back to Balanced.

## How to run it

**Windows (recommended): double-click `Start Lyric Follow.bat`**
- It starts a tiny local web server built into Windows (nothing to install) and opens the app in its own Edge/Chrome window at `http://localhost:8765`.
- The browser then **remembers the microphone permission**: choose "Allow" once and it won't ask again.
- A small minimised window named "Lyric Follow" stays open; closing it stops the app.
- If Windows shows a blue "Windows protected your PC" box the first time, click *More info* → *Run anyway*.
- Tip: right-click the .bat → *Send to* → *Desktop (create shortcut)*.

**Opening `index.html` directly** still works for songs, Bible and projector,
but the browser treats it as a file: it forgets the microphone permission and keeps asking. The app shows a warning when opened this way.

**Moving songs you already added** while using `index.html` directly: in that old window go to Settings → Export backup,
then in the app started from the .bat go to Settings → Import backup. (Each way of opening keeps its own storage.)

**Free website option**: upload the folder to a GitHub repository and turn on GitHub Pages; open the link in Chrome and click Install.
After the first visit it also works offline.

**Phones and tablets (iPhone 12+, iPad, Android):** open the app from a free HTTPS host (GitHub Pages, see above) in Safari or Chrome and use **Online** mode; the phone's own speech service does the listening. Offline voice engines run only on Windows/Mac/Linux computers.

Mac/Linux: run `python3 -m http.server 8765` in this folder and open `http://localhost:8765`.

## Setting up at church

1. Laptop → projector with HDMI. In Windows display settings choose **Extend**.
2. Mixer aux/monitor output with **only the lead vocal mic** → USB audio interface → laptop.
   Make it the default microphone in Windows sound settings. The level bar in the app should move about halfway when singing.
3. In the app: **Open projector**, drag that window to the projector screen, press **Full screen**.
4. Add today's songs in the Live tab, pick the song, press **Start listening**.
5. In the AI follow panel choose **Singing** or **Preacher (Bible)**. The app also switches by itself:
   picking a song listens to singing; showing a Bible verse listens to the preacher.
   For the preacher, set the speaker's language (Malayalam, Tamil or English). English book names spoken
   in a Tamil/Malayalam sermon ("ஜான் 3 வெர்சஸ் 16", "ജോൺ 3 16") are understood too.

Keyboard: ← → line (or verse) · PgUp/PgDn slide · B black · C background only · A auto follow · L listen.
A presentation clicker works too.

## Features

- **Follows the singer**: matches what is heard against the lyrics using sound-alike matching, so Malayalam/Tamil script, Manglish and Tanglish spellings all match. Prefers the next line and can jump back to a chorus.
- **Church noise**: microphone input goes through noise suppression, a voice-band filter (cuts rumble and the sharp edge of claps) and clap rejection before recognition; phrases are cut at natural pauses.
- **Preacher mode**: the speaker's language is detected automatically (Auto) and every finished phrase is checked by the Malayalam, Tamil and English engines, so references are found whatever language they are said in. A reference goes on screen by itself only when it is certain (chapter/verse words said, or a confident transcript); doubtful ones are listed with a "?" for the operator to click. Singing heard during preacher mode switches back to the songs automatically, and a clear reference during singing switches to the preacher.
- **Preacher mode details**: hears references in Malayalam, Tamil or English (also English book names inside Malayalam/Tamil speech, and run-together numbers like "828"); keeps the last 10 references with a Clear button; tested with 100 references in a row without a stall.
- **Song index**: every song in the library is indexed. When the singing moves to another song, the app finds it and jumps to the right line automatically (it also adds it to today's service). Works across languages.
- **No wrong lyrics**: when singing doesn't match any line for a few seconds, only the background is shown.
- **Backgrounds**: 12 built-in, plus your own photos and videos. Church default, Bible background, and a background per song.
- **Bible**: type a few letters in any language or spelling (`jo`, `യോ`, `யோ`, `mat`) and pick the book from the list, shown in all three languages. MAL 1910, Tamil Union, KJV, WEB, BSB, ASV. Up to 3 versions side by side. Type `John 3:16`, `jn 3 16-18`, `യോഹന്നാൻ 3:16`, `யோவான் 3:16`, even `yohannan 3 16`. Word search with a fast index.
- **Voice Bible**: hears "യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം" or "John 3:16", or a verse read aloud, and offers it ready to show.
- **Photo to lyrics**: reads Malayalam, Tamil and English from a photo or pasted screenshot. Doubtful words are marked in orange to check before saving.
- **Light mode** for slow computers.

## What was left out, and why

- **Licensed Bible versions** (NIV, ESV, newer Malayalam/Tamil translations): they need permission from the publishers. Only public-domain versions are included.
- **Fetching lyrics from websites**: most song lyrics are copyrighted and lyric sites don't allow copying. Build your own library (photo import makes this quick) and share it with Export backup.
- **Higher-accuracy offline Malayalam/Tamil**: AI4Bharat IndicConformer (MIT licence) is the strongest free model for Indian languages, but it needs a powerful PC (~1 GB memory). It can be added as a 4th offline choice later.
- **Phone remote over Wi-Fi and rehearsal recording**: need a small local server; planned for a desktop version.

## Credits and licences

- Malayalam Bible (Sathyavedapusthakam 1910) and Tamil Bible (Old Version/Union): data from github.com/godlytalias/Bible-Database. Both texts are over 100 years old / public domain.
- KJV, WEB, BSB, ASV: public domain, data from github.com/seven1m/open-bibles.
- Tesseract.js and Tesseract language data (Apache-2.0) for photo reading, included.
- sherpa-onnx (Apache-2.0) offline speech engine and OpenAI Whisper models (MIT), downloaded by the voice setup.
- Anek fonts (SIL Open Font License) when online; Windows "Nirmala UI" / Noto fonts offline.

Other free church software worth knowing: FreeShow, OpenLP and Quelea are complete open-source presentation programs.
Lyric Follow focuses on the AI following and Indian-language Bible, and can be used alongside them.

The Malayalam and Tamil app text was written by Claude; please have a native speaker check it before wide use.

## How the song follower decides (v30)

Each song in the service is prepared once (per-line sound keys, trigrams, consonant skeletons and a word list, with the
words unique to each line marked) — the primary index. The whole library has a trigram index — the secondary index — used
to find which song is being sung; songs in today's service list get a head start. While singing, every recognised
phrase is scored against the lines in two ways (sound trigrams and fuzzy word matches with recency weighting) and the
screen moves to the next line as soon as it is clearly heard; a jump to any other line must be heard twice in a row
(three times for a long jump), so one noisy phrase never makes the screen skip around.

## Optional: Gemini AI listening (Online mode)

Settings → *AI listening (Gemini)*: paste your own Gemini API key (free at https://aistudio.google.com/apikey) and tick
*Use Gemini*. Short microphone clips are then sent to Gemini together with the current song's lyrics and the service
list; it returns the words heard, the lyric line being sung and any Bible reference. This understands Malayalam, Tamil,
English and mixtures, and sung words in a noisy hall, far better than the browser's speech recogniser. The key never
leaves your browser. One clip is sent about every 5 seconds while there is sound; the free tier has a daily request cap
(shown in AI Studio), so a long service may need the paid tier (a few rupees per service). If Gemini stops answering,
the app falls back to the browser recogniser automatically.

## Backing tracks (YouTube)

A song can carry a YouTube link with a start time (song editor → *Backing track*, or *Choose* to pick from the
Thalaimuraigalin Sangeetham (Tamil) / Thalamurakalude Sangeetham (Malayalam) episodes by LightHouse Records, whose
chapter times are bundled in `vendor/yt-tracks.json`). *Match all my songs automatically* attaches tracks to songs whose
titles sound like an episode chapter. On the Live tab the track plays through the official embedded YouTube player
(internet needed; nothing is downloaded), with play/stop, volume and an option to start it whenever a song opens.
