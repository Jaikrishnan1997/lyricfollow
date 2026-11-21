// Sentences that must never put a verse on screen as sure (en / ta / ml / hi): a book name used as a person or an
// ordinary word with numbers nearby, casual ordinals, days, years, times, people, money, a bare book, a bare chapter
// with no book, a shared ending alone (ஆகமம், പുസ്തകം, की पुस्तक). Used by tests/ref_orders_test.js (parsed whole: null
// or not sure) and tests/ref_stream_test.js (fed word by word: nothing reaches the screen).
module.exports = [
  // English
  'Peter denied him 3 times before the rooster crowed twice', 'Thomas waited 8 days to see him', 'Luke 2 people came late today',
  'we had 3 services on the 16th', 'Daniel is 12 and his sister is 9', 'in 2019 we started with 40 members', 'the first chapter of my life began in Kerala',
  'chapter 3 of this book is about prayer', 'Esther had 2 sons and 3 daughters', 'John paid 500 rupees for 2 tickets', 'there are 7 days in a week and 12 months in a year',
  'Abraham was 100 years old', 'the second time Jonah obeyed', 'James and John were 2 brothers', 'at 7 30 we will have dinner', 'Job had 7000 sheep and 3000 camels',
  'Joel came first and Amos came second', 'Mark 2 or 3 of you will be called', 'Genesis', 'chapter 5',
  // Tamil
  'யோவான் அண்ணன் மூணு மணிக்கு வருவார்', 'மத்தேயு ரெண்டு மூணு நாள் கழிச்சு வருவார்', 'பேதுரு மூன்று தடவை மறுதலித்தான்', 'எஸ்தர் பன்னிரண்டு மாசம் காத்திருந்தாள்',
  'நாம் மூணாவது தடவை ஜெபிக்கிறோம்', 'ரெண்டாவது பாட்டு பாடுவோம்', 'சங்கீதம் பாடிய பின் பத்து நிமிஷம் இடைவேளை', 'ஆகமம் மூன்று பதினாறு', 'வெளி ஏழு ஒன்று',
  'தானியேல் மூணு வேளை ஜெபித்தான்', 'அஞ்சு அப்பம் ரெண்டு மீன்', 'ஞாயிறு காலை பத்து மணி ஆராதனை', '2023 ஆம் வருஷம் சபை ஆரம்பித்தது', 'நூறு பேர் வந்தார்கள்',
  'யோபு ஏழு குமாரர்களையும் மூன்று குமாரத்திகளையும் இழந்தான்', 'லூக்கா டாக்டர் இருபத்தொண்ணாம் தேதி வருவார்', 'அதிகாரம் மூன்று பற்றி பிறகு பேசுவோம்', 'மூன்றாம் அதிகாரம்',
  'யோவான் வந்தான்', 'ஆதியாகமம்', 'நாம் ஆதியாகமம் பற்றி பேசினோம் மூணு வாரம்', 'ஆகமம் மூன்றாவது அதிகாரம் நான்காவது வசனம்',
  // Malayalam
  'യോഹന്നാൻ ചേട്ടൻ മൂന്നു മണിക്ക് വരും', 'പത്രോസ് മൂന്നു പ്രാവശ്യം തള്ളിപ്പറഞ്ഞു', 'രണ്ടാം ദിവസം അവർ വന്നു', 'മൂന്നാമത്തെ പാട്ട് പാടാം', 'സംഖ്യ മൂന്ന് നാല്',
  'പുസ്തകം രണ്ട് മൂന്ന്', 'എസ്ഥേർ പന്ത്രണ്ടു മാസം കാത്തിരുന്നു', 'അഞ്ച് അപ്പവും രണ്ട് മീനും', 'ഞായറാഴ്ച രാവിലെ പത്തു മണിക്ക് ആരാധന', '2023 ൽ സഭ തുടങ്ങി',
  'നൂറു പേർ വന്നു', 'ഇയ്യോബിന് ഏഴു പുത്രന്മാരും മൂന്നു പുത്രിമാരും ഉണ്ടായിരുന്നു', 'അദ്ധ്യായം മൂന്നിനെക്കുറിച്ച് പിന്നീട് പറയാം', 'മൂന്നാം അദ്ധ്യായം', 'ഉല്പത്തി',
  'യോഹന്നാൻ വന്നു', 'മത്തായി രണ്ടു മൂന്നു ദിവസം കഴിഞ്ഞ് വരും', 'ദാനീയേൽ മൂന്നു നേരം പ്രാർത്ഥിച്ചു', 'ലൂക്കോസ് ഡോക്ടർ ഇരുപത്തിയൊന്നാം തീയതി വരും', 'ഒന്നാം ക്ലാസ്സിൽ പഠിക്കുന്ന കുട്ടി',
  // Hindi
  'यूहन्ना तीन दिन वहाँ रहा', 'पतरस ने तीन बार इनकार किया', 'दूसरा दिन बहुत अच्छा था', 'तीसरी बार वह आया', 'गिनती तीन चार', 'की पुस्तक दो तीन',
  'एस्तेर बारह महीने रुकी', 'पाँच रोटियाँ और दो मछलियाँ', 'रविवार सुबह दस बजे आराधना', 'दो हज़ार तेईस में कलीसिया शुरू हुई', 'सौ लोग आए',
  'अय्यूब के सात बेटे और तीन बेटियाँ थीं', 'अध्याय तीन के बारे में बाद में बात करेंगे', 'तीसरा अध्याय', 'उत्पत्ति', 'यूहन्ना आया', 'मत्ती दो तीन दिन बाद आएगा',
  'दानिय्येल तीन बार प्रार्थना करता था', 'लूका इक्कीस तारीख को आएगा', 'पहली कक्षा का बच्चा', 'उपदेशक दो बातें कहता है'
];
