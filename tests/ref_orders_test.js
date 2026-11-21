const Bible=require('../js/bible.js');
const o={exactOnly:true,needChapter:true,needVerse:true};
const cases=[
// English orders
['John chapter 3 verse 16','John 3:16'],['John 3 16','John 3:16'],['chapter 3 verse 16 of John','John 3:16'],['verse 16 chapter 3 John','John 3:16'],
['the book of John chapter 3 verse 16','John 3:16'],['the gospel according to John chapter 3 verse 16','John 3:16'],['gospel of John third chapter sixteenth verse','John 3:16'],
['John third chapter verse sixteen','John 3:16'],['verse 16 of John chapter 3','John 3:16'],['in the third chapter of John verse 16','John 3:16'],
['first Corinthians chapter 13 verse 4','1 Corinthians 13:4'],['1st Corinthians 13 4','1 Corinthians 13:4'],['second Timothy chapter 3 verse 16','2 Timothy 3:16'],
['Psalm 23 verse 1','Psalms 23:1'],['Psalms chapter 23 verse 1','Psalms 23:1'],['the letter to the Romans chapter 8 verse 28','Romans 8:28'],
['Romans eight twenty eight','Romans 8:28'],['John three sixteen','John 3:16'],['Genesis one one','Genesis 1:1'],['turn to Isaiah chapter 53 verse 5','Isaiah 53:5'],
['Revelation chapter 3 verses 20 to 22','Revelation 3:20'],['epistle to the Hebrews chapter 11 verse 1','Hebrews 11:1'],['Acts of the Apostles chapter 2 verse 38','Acts 2:38'],
['Song of Solomon chapter 2 verse 1','Song of Solomon 2:1'],['first John chapter 1 verse 9','1 John 1:9'],['third John verse 2','3 John 1:2'],['Jude verse 3','Jude 1:3'],
// Malayalam
['യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം','John 3:16'],['യോഹന്നാൻ എഴുതിയ സുവിശേഷം മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം','John 3:16'],
['യോഹന്നാന്റെ സുവിശേഷം 3-ാം അദ്ധ്യായം 16-ാം വാക്യം','John 3:16'],['ഉല്പത്തി പുസ്തകം ഒന്നാം അദ്ധ്യായം ഒന്നാം വാക്യം','Genesis 1:1'],
['ഉല്പത്തി പുസ്തകത്തിന്റെ ഒന്നാം അദ്ധ്യായം ഒന്നാം വാക്യം','Genesis 1:1'],['സങ്കീർത്തനം ഇരുപത്തിമൂന്ന് ഒന്നാം വാക്യം','Psalms 23:1'],
['സങ്കീർത്തനങ്ങൾ 23-ാം അദ്ധ്യായം ഒന്നാം വാക്യം','Psalms 23:1'],['ഇരുപത്തിമൂന്നാം സങ്കീർത്തനം ഒന്നാം വാക്യം','Psalms 23:1'],
['റോമർക്ക് എഴുതിയ ലേഖനം എട്ടാം അദ്ധ്യായം ഇരുപത്തിയെട്ടാം വാക്യം','Romans 8:28'],['റോമർ 8 28','Romans 8:28'],
['പതിനാറാം വാക്യം മൂന്നാം അദ്ധ്യായം യോഹന്നാൻ','John 3:16'],['മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം യോഹന്നാൻ','John 3:16'],
['ഒന്നാം കൊരിന്ത്യർ പതിമൂന്നാം അദ്ധ്യായം നാലാം വാക്യം','1 Corinthians 13:4'],['കൊരിന്ത്യർക്ക് എഴുതിയ ഒന്നാം ലേഖനം 13-ാം അദ്ധ്യായം 4-ാം വാക്യം','1 Corinthians 13:4'],
['1 കൊരിന്ത്യർ 13 4','1 Corinthians 13:4'],['യെശയ്യാ പ്രവാചകന്റെ പുസ്തകം 53-ാം അദ്ധ്യായം 5-ാം വാക്യം','Isaiah 53:5'],['യെശയ്യാവു അമ്പത്തിമൂന്നാം അദ്ധ്യായം അഞ്ചാം വാക്യം','Isaiah 53:5'],
['മത്തായി എഴുതിയ സുവിശേഷം അഞ്ചാം അദ്ധ്യായം മൂന്ന് മുതൽ പത്ത് വരെയുള്ള വാക്യങ്ങൾ','Matthew 5:3'],['മത്തായി 5-ാം അദ്ധ്യായം 3-ാം വാക്യം','Matthew 5:3'],
['അപ്പൊസ്തല പ്രവൃത്തികൾ രണ്ടാം അദ്ധ്യായം മുപ്പത്തിയെട്ടാം വാക്യം','Acts 2:38'],['വെളിപ്പാട് പുസ്തകം മൂന്നാം അദ്ധ്യായം ഇരുപതാം വാക്യം','Revelation 3:20'],
['എബ്രായർ പതിനൊന്നാം അദ്ധ്യായം ഒന്നാം വാക്യം','Hebrews 11:1'],['സദൃശവാക്യങ്ങൾ മൂന്നാം അദ്ധ്യായം അഞ്ചാം വാക്യം','Proverbs 3:5'],
['യോഹന്നാൻ എഴുതിയ ഒന്നാം ലേഖനം ഒന്നാം അദ്ധ്യായം ഒൻപതാം വാക്യം','1 John 1:9'],['ഒന്നാം യോഹന്നാൻ ഒന്നാം അദ്ധ്യായം ഒൻപതാം വാക്യം','1 John 1:9'],
['പുറപ്പാട് പുസ്തകം ഇരുപതാം അദ്ധ്യായം മൂന്നാം വാക്യം','Exodus 20:3'],['ഫിലിപ്പിയർ നാലാം അദ്ധ്യായം പതിമൂന്നാം വാക്യം','Philippians 4:13'],
// Tamil
['யோவான் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்','John 3:16'],['யோவான் எழுதின சுவிசேஷம் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்','John 3:16'],
['யோவான் 3-ஆம் அதிகாரம் 16-ஆம் வசனம்','John 3:16'],['யோவான் சுவிசேஷம் மூன்றாவது அதிகாரம் பதினாறாவது வசனம்','John 3:16'],
['ஆதியாகமம் புத்தகம் முதலாம் அதிகாரம் முதலாம் வசனம்','Genesis 1:1'],['ஆதியாகமம் புஸ்தகத்தில் முதலாம் அதிகாரம் முதல் வசனம்','Genesis 1:1'],
['சங்கீதம் இருபத்து மூன்று முதல் வசனம்','Psalms 23:1'],['சங்கீதம் 23 1','Psalms 23:1'],['இருபத்து மூன்றாம் சங்கீதம் முதலாம் வசனம்','Psalms 23:1'],
['ரோமர் எட்டாம் அதிகாரம் இருபத்தெட்டாம் வசனம்','Romans 8:28'],['ரோமருக்கு எழுதின நிருபம் 8-ஆம் அதிகாரம் 28-ஆம் வசனம்','Romans 8:28'],
['பதினாறாம் வசனம் மூன்றாம் அதிகாரம் யோவான்','John 3:16'],['மூன்றாம் அதிகாரம் பதினாறாம் வசனம் யோவான்','John 3:16'],
['1 கொரிந்தியர் 13 4','1 Corinthians 13:4'],['முதலாம் கொரிந்தியர் பதிமூன்றாம் அதிகாரம் நான்காம் வசனம்','1 Corinthians 13:4'],
['கொரிந்தியருக்கு எழுதின முதலாம் நிருபம் 13-ஆம் அதிகாரம் 4-ஆம் வசனம்','1 Corinthians 13:4'],['இரண்டாம் தீமோத்தேயு மூன்றாம் அதிகாரம் பதினாறாம் வசனம்','2 Timothy 3:16'],
['ஏசாயா தீர்க்கதரிசியின் புத்தகம் 53-ஆம் அதிகாரம் 5-ஆம் வசனம்','Isaiah 53:5'],['ஏசாயா ஐம்பத்து மூன்றாம் அதிகாரம் ஐந்தாம் வசனம்','Isaiah 53:5'],
['மத்தேயு ஐந்தாம் அதிகாரம் மூன்றாம் வசனம்','Matthew 5:3'],['அப்போஸ்தலர் நடபடிகள் இரண்டாம் அதிகாரம் முப்பத்தெட்டாம் வசனம்','Acts 2:38'],['அப்போஸ்தலர் 2 38','Acts 2:38'],
['வெளிப்படுத்தின விசேஷம் மூன்றாம் அதிகாரம் இருபதாம் வசனம்','Revelation 3:20'],['எபிரெயர் பதினொன்றாம் அதிகாரம் முதலாம் வசனம்','Hebrews 11:1'],
['நீதிமொழிகள் மூன்றாம் அதிகாரம் ஐந்தாம் வசனம்','Proverbs 3:5'],['யாத்திராகமம் இருபதாம் அதிகாரம் மூன்றாம் வசனம்','Exodus 20:3'],['பிலிப்பியர் நான்காம் அதிகாரம் பதிமூன்றாம் வசனம்','Philippians 4:13'],
['1 யோவான் 1 9','1 John 1:9'],['முதலாம் யோவான் முதலாம் அதிகாரம் ஒன்பதாம் வசனம்','1 John 1:9'],['யோவான் எழுதின முதலாம் நிருபம் முதலாம் அதிகாரம் ஒன்பதாம் வசனம்','1 John 1:9'],
// colloquial
['யோவான் மூணாவது அதிகாரம் பதினாறாவது வசனம்','John 3:16'],['യോഹന്നാൻ മൂന്നിന്റെ പതിനാറ്','John 3:16'],['யோவான் மூன்று பதினாறு','John 3:16'],['യോഹന്നാൻ മൂന്ന് പതിനാറ്','John 3:16'],
// more orders: book-chapter-verse, book-verse-chapter, chapter-verse-book, verse-chapter-book, with and without the book word
['John verse 16 chapter 3','John 3:16'],['chapter 3 verse 16 John','John 3:16'],['verse 16 of chapter 3 of John','John 3:16'],['the book of Romans verse 28 chapter 8','Romans 8:28'],
['chapter 8 verse 28 of the letter to the Romans','Romans 8:28'],['verse 1 of Psalm 23','Psalms 23:1'],['the 23rd Psalm verse 1','Psalms 23:1'],['Genesis one one and two','Genesis 1:1'],
['Matthew chapter 5 verses 3 to 10','Matthew 5:3'],['Isaiah fifty three five','Isaiah 53:5'],['verse 4 of first Corinthians chapter 13','1 Corinthians 13:4'],['the gospel of John chapter 3 verse 16','John 3:16'],
['യോഹന്നാൻ പതിനാറാം വാക്യം മൂന്നാം അദ്ധ്യായം','John 3:16'],['യോഹന്നാന്റെ സുവിശേഷം പതിനാറാം വാക്യം മൂന്നാം അദ്ധ്യായം','John 3:16'],['മൂന്നാം അദ്ധ്യായം പതിനാറാം വാക്യം യോഹന്നാൻ എഴുതിയ സുവിശേഷം','John 3:16'],
['പതിനാറാം വാക്യം യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം','John 3:16'],['റോമർ എട്ടിന്റെ ഇരുപത്തിയെട്ട്','Romans 8:28'],['ഉല്പത്തി പുസ്തകത്തിൽ ഒന്നാം അദ്ധ്യായം ഒന്നാം വാക്യം','Genesis 1:1'],
['ഉല്പത്തി പുസ്തകത്തിലെ ഒന്നാം അദ്ധ്യായത്തിലെ ഒന്നാം വാക്യം','Genesis 1:1'],['യോഹന്നാന്റെ സുവിശേഷത്തിലെ മൂന്നാം അദ്ധ്യായത്തിന്റെ പതിനാറാം വാക്യം','John 3:16'],
['റോമർക്ക് എഴുതിയ ലേഖനത്തിലെ എട്ടാം അധ്യായം ഇരുപത്തിയെട്ടാം വചനം','Romans 8:28'],['സങ്കീർത്തനം ഇരുപത്തിമൂന്നാം അദ്ധ്യായത്തിൽ ഒന്നാം വാക്യത്തിൽ','Psalms 23:1'],
['മത്തായി അഞ്ചാം അദ്ധ്യായം മൂന്നു മുതൽ പത്തു വരെ വാക്യങ്ങൾ','Matthew 5:3'],['പൗലോസ് കൊരിന്ത്യർക്ക് എഴുതിയ രണ്ടാം ലേഖനം അഞ്ചാം അദ്ധ്യായം പതിനേഴാം വാക്യം','2 Corinthians 5:17'],
['ulpathi pusthakam onnam adhyayam onnam vakyam','Genesis 1:1'],['റോമർക്ക് എഴുതിയ ലേഖനത്തിന്റെ എട്ടാം അദ്ധ്യായം ഇരുപത്തിയെട്ടാം വാക്യം','Romans 8:28'],['മത്തായി എഴുതിയ സുവിശേഷത്തിന്റെ അഞ്ചാം അദ്ധ്യായം മൂന്നാം വാക്യം','Matthew 5:3'],
['യോഹന്നാൻ മൂന്നാം അദ്ധ്യായം പതിനാറു മുതൽ പതിനെട്ടു വരെയുള്ള വാക്യങ്ങൾ','John 3:16'],
['யோவான் பதினாறாம் வசனம் மூன்றாம் அதிகாரம்','John 3:16'],['மூன்றாம் அதிகாரம் பதினாறாம் வசனம் யோவான் சுவிசேஷம்','John 3:16'],['பதினாறாம் வசனம் யோவான் மூன்றாம் அதிகாரம்','John 3:16'],
['ஆதியாகமம் புத்தகத்தில் முதலாம் அதிகாரம் முதலாம் வசனம்','Genesis 1:1'],['ஆதியாகமம் புஸ்தகம் முதலாம் அதிகாரத்தில் முதல் வசனத்தில்','Genesis 1:1'],
['ஆதியாகமம் புத்தகத்தின் முதலாம் அதிகாரத்தின் முதலாம் வசனம்','Genesis 1:1'],['ஆதியாகமம் புஸ்தகத்தின் முதலாம் அதிகாரம் முதலாம் வசனம்','Genesis 1:1'],
['யோவான் சுவிசேஷத்தில் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்','John 3:16'],['யோவான் சுவிசேஷத்தின் மூன்றாம் அதிகாரம் பதினாறாம் வசனம்','John 3:16'],
['ரோமருக்கு எழுதின நிருபத்தில் எட்டாம் அதிகாரம் இருபத்தெட்டாம் வசனம்','Romans 8:28'],['ரோமருக்கு எழுதின நிருபத்தின் எட்டாம் அதிகாரம் இருபத்தெட்டாம் வசனம்','Romans 8:28'],
['மத்தேயு ஐந்தாம் அதிகாரம் மூன்று முதல் பத்து வரையுள்ள வசனங்கள்','Matthew 5:3'],['இரண்டாம் கொரிந்தியர் ஐந்தாம் அதிகாரம் பதினேழாம் வசனம்','2 Corinthians 5:17'],
['கொரிந்தியருக்கு எழுதின இரண்டாம் நிருபம் ஐந்தாம் அதிகாரம் பதினேழாம் வசனம்','2 Corinthians 5:17'],['aathiyagamam puthagam mudhalam adhikaram mudhalam vasanam','Genesis 1:1'],
['aathiyagamam puththagam 1 adhikaram 1 vasanam','Genesis 1:1'],['ulpathi pustakam 1 adhyayam 1 vakyam','Genesis 1:1'],['ulpathi pusthagam 1 adhyayam 1 vakyam','Genesis 1:1'],
// negatives: ordinary sermon talk with numbers and a name that is also a book (must be null)
['John was 3 years old when 16 people came','null'],['Mark had 2 brothers and 5 sisters','null'],['James told me 3 times in 10 minutes','null'],['Ruth walked 2 miles in 30 minutes','null'],
['Job lost 7 sons and 3 daughters','null'],['the acts of 12 men in 3 days','null'],['the numbers are 40 and 50','null'],['judges sat for 3 days and 7 nights','null'],
['first John came and then 3 people followed after 16 days','null'],['in chapter 3 of my life I met John','null'],['யோவான் மூன்று நாள் பதினாறு பேருடன் இருந்தான்','null'],
['മർക്കൊസ് രണ്ടു ദിവസം അഞ്ചു പേരോടൊപ്പം','null'],['യോഹന്നാൻ മൂന്നു പേരോടൊപ്പം പതിനാറു ദിവസം താമസിച്ചു','null'],['we sang 3 songs and read 2 psalms','null'],
// negatives (must be null)
['John said to him three times','null'],['there were 3 men and 16 women','null'],['the book is on the table','null'],['അവൻ മൂന്നു ദിവസം അവിടെ പാർത്തു','null'],['அவர் மூன்று நாள் அங்கே இருந்தார்','null'],
];
let bad=0;for(const [s,want] of cases){const r=Bible.parseRef(s,o);const got=r?Bible.refLabel({book:r.book,ch:r.ch,v:r.v,ve:r.v},'en'):'null';if(got!==want){bad++;console.log('FAIL',JSON.stringify(s),'->',got,'want',want);}}
console.log(cases.length-bad,'ok of',cases.length);
if(bad)process.exitCode=1;
