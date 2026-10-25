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

### Best offline singing: offline Whisper (whisper.cpp)
Double-click **Setup offline Whisper (best).bat** once (internet needed this once, ~1.8 GB). It installs
[whisper.cpp](https://github.com/ggml-org/whisper.cpp) (MIT) with Whisper large-v3 – the model the Online mode uses –
or large-v3-turbo on graphics cards under 4 GB, and uses the NVIDIA GPU (CUDA 12) when there is one.
**Start Lyric Follow.bat** then starts it too (port 6020, log in `voice\whisper.log`). In **Offline** mode, singing is
followed exactly like Online – the lyrics hint, the service tracker, line timing – but on this laptop: no internet, no
key, no daily limit, and a clip every 1–2 s instead of every 3 s. If it is not installed or stops answering, the app
uses the offline voice engine below. The preacher (Bible) mode keeps using the offline voice engine.
**Setup offline Whisper (fast).bat** installs the turbo model instead (keeps the program): use it on cards under 6 GB –
on a 4 GB GTX 1650, large-v3 took about 3 s a clip (with the shorter 15 s context the app asks for), too slow to beat
Online. `setup-whisper.ps1 -Turbo` / `-Large` / `-Cpu` / `-Reinstall` choose explicitly.

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

### Claps, shouting and noise (measured, Oct 2026)

Real live clips of Alleluya (captured by the app over laptop speakers) were sent to Sarvam as they are, with hand
claps mixed in, and with claps plus a shouting crowd ("Praise the Lord!", "Hallelujah!", "ആമേൻ!") mixed in - then
through each noise remover. Words of the song that came back, from 27 clips (2 minutes):

| | as heard | clap remover | RNNoise | vocal separation (UVR MDX, 66 MB) |
|---|---|---|---|---|
| clean | **26** | 24 | - | 24 |
| claps (as loud as the singing) | **20** | 12 | 1 | 7 |
| claps + shouting crowd | 3 | 5 | 3 | 3 |
| same, crowd 6 dB quieter | 5 | 3 | 1 | 5 |

- Sarvam copes with claps by itself; every remover made it worse (they cut the singing too).
- A shouting crowd is speech, and the recogniser prefers speech to singing: it writes down the shouts. No filter can
  take them out, vocal separation included (the crowd is voices too).
- So the one fix that works is the **mixer feed** (step 2 above): the singer's mic from the desk carries no claps and
  no crowd. With that feed, turn off *Browser noise filter on the microphone* in Settings.
- The follower ignores what crowds shout and what the recogniser writes for bare music ("Praise the Lord", "Amen",
  "Thank you", "ஸ்தோத்திரம்", "music"...) unless a song of today's service has that word.

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
- **Psalm reading** (📜 next to Preacher): pick a Psalm and a starting verse (or say "Psalm 91" / "சங்கீதம் 91" / "സങ്കീർത്തനം 91"). One verse is on screen and moves to the next as the church reads it. A repeated verse stays; one skipped verse (or going back one) moves only when it is heard clearly twice; nothing further ever moves; other references, the passage finder and the quiz are switched off. Followed in the Bible of the language being read (Malayalam 1910, Tamil OV, or the chosen English version) whatever versions are on the projector.
- **Bible quiz** (Preacher mode): when the preacher asks "who is the son of Abraham?", "ஆபிரகாமின் மகன் யார்?" or "അബ്രാഹാമിന്റെ മകൻ ആര്?", the question goes on screen and the answer follows after a pause (0/4/8/15 s, so the church can answer aloud first) in every language the church shows, with the verse it comes from. 189 questions in `vendor/quiz.json`, each in English, Tamil and Malayalam, with names spelled as in the Tamil OV and Malayalam 1910 Bibles; every reference was checked against the Bible text (`node tools/build_quiz.js`). Matching is local: a question word must be heard (who/what/how many, யார்/என்ன/எத்தனை, ആര്/എന്ത്/എത്ര) and most of the question's own words, with a clear lead over any other question. Measured: every question finds its answer in all three languages; read-out Bible verses trigger a question 0.03% of the time (KJV, 10,770 verses). Settings: Show the answer / Ask me first (the operator taps Show) / Off. Add your own questions to `tools/quiz_src.txt` and run the build. **Every book, verse by verse** (setting "Questions from every book", on by default): 38,878 more questions, every chapter of all 66 books in English, Tamil and Malayalam (`vendor/quiz/<book>.json`, loaded in the background after the app starts). Names and terms in each answer were checked against that verse in the Tamil OV and Malayalam 1910 text (`tools/quizgen/check.js`); about 4.6% of answers use a different word form from the verse (an ending or a synonym) and were left as written. The well-known questions above always come first. A verse-by-verse question needs a closer fit (two of its less common words heard and most of what was heard belonging to it), and a verse being read aloud never triggers a question about itself. Measured with all 39,000 questions loaded: common sermon sentences ("what a mighty God we serve", "how many times should we forgive") show nothing; read-out verses trigger a question 0.7% of the time in English and 0% in Tamil and Malayalam; 78% of questions asked exactly as written are found. Tools to add more: `tools/quizgen` (brief, chapter texts, checker, builder).
- **Microphone health** (operator screen only, never on the projector): no signal / weak / too loud (clipping) / good, from the last few seconds of input.
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

## Following measurements and what was tried (22 Oct 2026)

Recorded live runs (Alleluya then Enthan, laptop speakers, Sarvam without key words) are kept in
`tests/live_two_songs*.json` and replayed two ways: the tracker alone (`node tests/two_songs_replay.js`, RUN=file)
and the whole app in real time (`python3 tests/two_songs_e2e.py`, RUN/R0/END), which also prints display delay
(p50/p95), the longest stretch on a wrong line, and whether the timing helper and the tracker undo each other.
`tests/tracker_bench.js` simulates many singing patterns (lines twice, choruses repeated, random go-backs, a verse
skipped, a 15 s break, a song that speeds up, song switches) at three tempos; `SPARSE=1` gives 1-2 words a clip.

- **Joining the clip before with this one (Core.trackWin) was measured and not used.** On the four live runs it
  lowered the right-line share from 64-68% to 45-56% (and the simulated bench from 59% to 35-43%): the previous
  line's words pull the screen back. Evidence across clips is already kept by the tracker itself (per-song
  evidence, the pending second clip, the run of clips in order, and the line filter).
- **The timing helper and the tracker do not fight:** in all replays no lead/timer move was undone by a "back"
  move within 4 s; two lines in 1.5 s happened 1-4 times a run.
- **Stale answers:** clips are sent one at a time, so answers cannot arrive out of order. An answer that arrives
  after the operator moved the screen or opened a song is now ignored for following
  (`tests/stale_result_e2e.py`: before, a late clip moved the screen back from 13 to 10).
- **Timing in the app:** `LF_DEBUG.timing()` gives p50/p95 of audio end -> answer and answer -> screen;
  `LF_DEBUG.clips()` the per-clip log (provider, text, score, line before/after, reason). Memory only - nothing is
  saved or sent.
- **Audio capture:** the ScriptProcessor buffer is 2048 samples at 16 kHz = 128 ms, against clips every 2.4 s and
  answers 0.25-0.35 s after sending; an AudioWorklet would save under 0.13 s. Not changed.
- **Every listening mode is timed** (v77): `LF_DEBUG.timing()` now groups by mode and service - Sarvam/Groq/
  Cloudflare clips, the preacher's Sarvam live stream, the browser recogniser, Gemini, the offline engine - with
  audio end -> answer where the audio end is known, answer -> screen, and the hand-overs between services
  (`LF_DEBUG.handoffs()`: which service stopped, why, and how long the screen had no words).
- **Hand-over between services** (v77): when a service fails (no credit, busy, no answer) the same clip goes to the
  next one at once, and a service that fails twice in a row is paused for 2 minutes (three times before). The
  status line shows which service is paused and why. `tests/fallback_gap_e2e.py` (MODE=500|402|net): the time
  without words at a hand-over fell from 14.4 s (server error, cut connection) and 7.2 s (no credit) to 3.7 s.
- **Tests run anywhere**: browser tests take their paths from `tests/lfpaths.py` (LF_ROOT, LF_AUDIO, LF_SCRATCH)
  and use `tests/fixtures/fake_mic.wav` as the microphone; `node tests/ci.js` runs the replays and the bench with
  floors they must not fall below (also on every push: `.github/workflows/replays.yml`).
- **Crowd noise** (`tests/live_crowd.json`, `node tests/crowd_replay.js`, `tests/crowd_e2e.py`): 2 minutes of a
  real capture of Alleluya under a synthetic hall crowd - 100 or 150 people clapping in time, murmuring and
  shouting "Praise the Lord", "Hallelujah", "Amen", "സ്തോത്രം" - sent to Sarvam:

  | condition (singing : crowd) | clips with words | right line | one off | wrong place | other song |
  |---|---|---|---|---|---|
  | clean | 42 / 49 | 67% | 24% | 6% | 0% |
  | 100 clapping (+6 dB) | 27 / 49 | 16% | 24% | 35% | 0% |
  | 150 clapping (+3 dB) | 23 / 49 | 16% | 12% | 47% | 0% |
  | 100 shouting (+6 dB) | 25 / 49 | 24% | 14% | 31% | 0% (18% before v77) |
  | 150 shouting + clapping (+3 dB) | 12 / 49 | 0% | 0% | 71% | 0% |
  | 150 shouting + clapping (0 dB) | 6 / 49 | - | - | - | 0% |

  Sarvam writes almost nothing a crowd covers ("ஆமென்", "ராம் ராம் ராம்" instead), so the screen stays where it
  is instead of following; it no longer jumps to another song on such words (one did, "ராம் ராம் ராம்" -> Enthan,
  fixed in v77). Following through a loud congregation needs the mixer feed.
- **Not measured yet:** shorter send intervals or windows need recorded church audio sent to Sarvam again
  (cost and accuracy together); to be done with a recording from the mixer feed.

## Which song is being sung

Today's service list is tried first, on its own. Only when nothing in the service list has matched for 5 seconds is the
whole library consulted, and then a song is chosen only when a whole line matches clearly (score ≥ 0.72, confirmed on
a second phrase) - a few shared words never switch the screen.

## One clean slide layout for every song (js/tidy.js)

Every bundled song is stored in the same layout, and your own songs can be put in it with one tap
(**Songs → ✨ Tidy my own songs**, with **Undo tidy**; or **✨ Tidy slides** in the song editor; imports are tidied
on the way in):
- one stanza per slide, at most 4 lines (a longer stanza is split evenly - at sentence ends where there are any,
  keeping Tamil/Malayalam couplets together); a one-line stanza joins its neighbour when that fits;
- headings and notes that are not sung are taken out: பல்லவி / சரணங்கள் / അനുപല്ലവി / ചരണങ്ങൾ / Chorus, tala and
  raga names, "sung to the tune of", Music##, (2x), "- 2", echoes in brackets; verse numbers come off the text;
- chorus cues ("- திறவுண்ட", "(എന്തു...)", "......എന്നാളും") are resolved: the chorus is written out after each verse,
  in the order it is sung (the follower and the screen move through the song the way it is sung);
- an English translation or English-letter copy pasted under a Tamil/Malayalam song is kept apart (not on the slides);
- slides are labelled Chorus / Verse 2 / Anupallavi on the console.
`node tools/tidy-packs.js` re-tidies the packs and raises their versions; browsers then update every bundled song the
user has not changed (each pack song carries fingerprints of its earlier texts) and keep the ones the user edited.
Measured on the tracker benchmark: right line 65% -> 72%, wrong line 8.9% -> 4.5%.

## Bundled song collections (vendor/packs.json)

Every copy of the app ships the free collections and loads them into the browser's library on first open (also in a
new browser, an incognito window or a new phone): Malayalam hymns from Wikisource (427), classic English hymns from
Wikisource (260) and the Tamil pack below (159). Loading takes about a second (one database transaction);
duplicates are skipped by sound, so the buttons under *Free song collections* can be pressed again safely.

## Tamil & Malayalam song pack (vendor/songs-ta-fgs.json)

227 songs (217 Tamil, 10 Malayalam) from freegospelsongs.in - every song on the site that has lyrics, as of October 2026 (68 added in this update, mojibake-encoded pages repaired). Published by their rights holders for free personal, church and outreach use, not commercial use.

159 Tamil songs whose rights holders published them on freegospelsongs.in (a non-profit site that describes them as
copyright-free and invites sharing; terms: free for personal devotion, church and outreach programs, no commercial use).
Each song carries its album page as source. Voice & Import → *தமிழ் · local pack* loads them into the library.

## Best accuracy for Tamil and Malayalam: Sarvam AI (paid, optional)

[Sarvam AI](https://www.sarvam.ai) Saaras v4 is a speech recogniser built for the 22 Indian languages (Tamil,
Malayalam, and speech mixed with English). Make an account at **dashboard.sarvam.ai** (₹100 free credit), create an
API key and paste it in **Settings → Song listening → Sarvam API key**. Then, in Online mode:
- **Singing:** every clip goes to Sarvam first, with up to 50 key words from the song being sung (from all of today's
  service songs until the song is confirmed). Groq, Cloudflare and the laptop stay as automatic backups (also when the
  Sarvam credit runs out).
- **Preacher (Bible):** live streaming recognition from Sarvam (Malayalam, Tamil, English, mixed; automatic language
  when "auto" is chosen), feeding the verse finder, with the Bible book names and the words for chapter/verse of the
  preaching language as key words; the browser recogniser takes over if Sarvam stops.
Price: ₹30 per hour of audio **sent** (billed by the second). To keep that low:
- only the sound since the last clip is sent (0.8 s overlap while unsure, none while following with confidence);
- nothing is sent in a silent room; during music breaks (no words in the last clips) one short clip every 4–5 s;
- during talk or prayer (no song line for 25 s) one 4 s clip every 4.5 s until a song line is heard again;
- the preacher stream sends nothing after 1.5 s without a voice (the 0.4 s before the voice returns is sent with it).
Settings shows the minutes and rupees used today and this month, and takes an optional **daily limit** (minutes):
after it, the free services (Groq, Cloudflare, laptop) take over until the next day. A 2-hour service with about an
hour of singing costs roughly ₹30–45.
- **Songs not in today's list:** when no song of the service fits what is sung, the whole library is searched (letter
  index finds a few candidates in ~20 ms, each checked word by word); the same song on top in two clips (or one very
  clear clip) opens it and adds it to today's list. Tested on 849 bundled songs: found in about 2 clips, no false
  switches on recorded talk.

## Whisper all day for free (Online mode)

Each clip of singing goes to the first free service that still has room, in this order:
1. **Groq whisper-large-v3** (most accurate) – 2,000 clips a day, 20 a minute
2. **Groq whisper-large-v3-turbo** – another 2,000 a day
3. **Your Cloudflare Worker** (Workers AI whisper-large-v3-turbo) – about 214 audio minutes a day free, reset 00:00 UTC
4. **Whisper on this laptop** (Setup offline Whisper) – no limit, needs the app opened from Start Lyric Follow.bat

When a service answers "limit reached" it is skipped until the limit has passed (1 min / 30 min / 3 h for Groq,
00:00 UTC for Cloudflare), remembered across reloads. Settings → "Try all services again now" clears that.
While the screen is following with confidence, clips go out every ~4–6 s (about one sung line) instead of every
3.2 s; at once back to 3.2 s when unsure or when the song may have changed. Measured: 12–15 clips a minute instead
of 18. Together roughly 8 hours of cloud Whisper a day for free, then the laptop.

Please use one account per service – several accounts to get more free clips breaks their terms.

### More free Whisper: Cloudflare Worker (one-time, ~10 minutes, free, no card)
1. Make a free account at **dash.cloudflare.com**.
2. **Workers & Pages → Create → Create Worker**, name it `lyricfollow-whisper`, **Deploy**, then **Edit code**:
   replace everything with the contents of **cloudflare-worker.js** (in this folder) and **Deploy**.
3. In the Worker: **Settings → Bindings → Add → Workers AI**, variable name `AI`.
4. **Settings → Variables and Secrets → Add**, type **Secret**, name `KEY`, value: a password you choose. Deploy.
5. Copy the Worker's address (`https://lyricfollow-whisper.<your-name>.workers.dev`) and in Lyric Follow
   **Settings → Song listening** paste it into **Worker address** and the password into **Worker password**.

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
(internet needed; nothing is downloaded), with play/stop, volume and a Music (small 200 px player) / Video (large player) choice. The track never starts by itself: opening a song, a song switched automatically by the listener, or a song restored at start-up only loads its track, paused - it plays only when ▶ is pressed. YouTube's terms require the player to stay visible, so "music only" is the smallest allowed player rather than a hidden one.

## Later: a hosted version for many churches (notes, not built)

Planned: each church signs in, loads its own songs, and no songs are bundled (copyright). What it needs, keeping today's app as the projector client:

- **Accounts and churches**: sign-in (email link or Google), one church = one workspace, roles pastor / operator / viewer.
- **Songs per church**: the song library moves from this browser's storage to the church's workspace (a small database such as Supabase/Postgres with row-level security per church); the app keeps an offline copy so a service never depends on the internet. The bundled packs (`vendor/songs-*.json`) are removed from the hosted build; churches import their own lyrics (typed, pasted, Word/PowerPoint, photo).
- **Keys stay server-side**: Sarvam/Groq keys belong to the church and are used through a small proxy (like `cloudflare-worker.js`), with the per-church ₹ budget enforced there instead of in the browser.
- **Bibles and quiz**: public-domain Bibles and the quiz list stay bundled; licensed versions only where the church holds the licence.
- **Nothing changes in the follower**: matching, Psalm reading and the quiz run in the browser exactly as now.
