# Bible quiz generation brief (Lyric Follow)

You write Bible quiz questions a pastor might ask the congregation during a sermon, in English, Tamil and Malayalam.
The app listens to the pastor, matches the spoken question against this list and shows the answer on the projector.

## Input
Chapter texts: /home/claude/qgen/text/<NN-Book>/<CCC>.txt. Each verse block is `ch:v`, then `EN` (KJV), `TA` (Tamil
Old Version, BSI) and `ML` (Malayalam 1910 Sathyavedapusthakam, BSI). Read every verse of your chapters.

## Output
One file per chapter: /home/claude/qgen/out/<NN-Book>/<ch>.txt (ch without leading zeros, e.g. `22.txt`).
One question per line, 7 fields separated by ` | `, nothing else in the file:

    ch:v | English question? | English answer | Tamil question? | Tamil answer | Malayalam question? | Malayalam answer

Example:

    22:2 | Which son did God ask Abraham to offer as a sacrifice? | Isaac | ஆபிரகாமிடம் தேவன் பலியிடச் சொன்ன மகன் யார்? | ஈசாக்கு | ദൈവം അബ്രാഹാമിനോട് യാഗം കഴിപ്പാൻ പറഞ്ഞ മകൻ ആര്? | യിസ്ഹാക്ക്
    22:2 | To which land did God send Abraham to offer Isaac? | The land of Moriah | ஈசாக்கைப் பலியிட ஆபிரகாம் எந்த தேசத்துக்குப் போனான்? | மோரியா தேசம் | യിസ്ഹാക്കിനെ യാഗം കഴിപ്പാൻ അബ്രാഹാം ഏതു ദേശത്തേക്കു പോയി? | മോരിയാദേശം

## Rules
1. Verse by verse: go through every verse. Write a question for every fact a pastor could ask about: who, what,
   where, when, why, how many, to whom, what was the name of. Several questions when a verse has several facts.
   Verses with no askable fact (greetings, repeated formulas, lists already asked) get none; never invent facts.
   Poetry and teaching (Psalms, Proverbs, prophets, letters): ask what the verse teaches or completes, e.g.
   "What is the beginning of wisdom?" | "The fear of the Lord".
2. Questions sound like a pastor speaking from the pulpit: short, direct, natural. Each question must make sense on
   its own (name the people; no "he", "this", "the above"). Every question must contain a question word
   (who/whom/whose/what/which/where/when/why/how; யார்/என்ன/எது/எந்த/எங்கே/எப்போது/ஏன்/எத்தனை/எப்படி;
   ആര്/എന്ത്/ഏത്/എവിടെ/എപ്പോൾ/എന്തുകൊണ്ട്/എത്ര/എങ്ങനെ) and end with `?`.
3. Answers: 1 to 5 words, exact, taken from the verse. Numbers as in the verse.
4. Tamil and Malayalam: natural spoken church language, but every biblical name, place and term spelled EXACTLY as in
   the TA / ML text of that verse (copy the spelling from the text given; for example ஈசாக்கு / യിസ്ഹാക്ക്, மோசே / മോശെ,
   எகிப்து / മിസ്രയീം). The answer in each language is the answer in that language, not English.
5. No `|` inside any field. No duplicate questions within a chapter; across chapters avoid asking the same fact twice.
6. Accuracy over quantity: every answer must be what the verse actually says.

## Check
After each chapter run: `node /home/claude/qgen/check.js /home/claude/qgen/out/<NN-Book>/<ch>.txt`
Fix every error it lists. Its "answer words not found near the verse" count should be small: when it is not, the
Tamil or Malayalam names are probably not spelled as in that Bible - fix them.
