// How well does the read-aloud verse matcher find a verse said without its reference?
// 400 random verses per Bible, read in full, the first 60% only, and with one word in five dropped (as a recogniser
// does), each after a few words of sermon. Fails (exit 1) when a figure falls below its floor or more wrong verses would
// reach the screen than before; then ordinary sermon sentences must put no verse on screen.
const R=__dirname+'/../';
const Bible=require(R+'js/bible.js'), Core=require(R+'js/core.js');
for(const id of ['kjv','mal1910','tamov','web','bsb','asv']) require(R+'bible/'+id+'.js');
const lead={kjv:'and so my dear brothers and sisters the word of God says',mal1910:'പ്രിയമുള്ളവരേ ദൈവവചനം ഇങ്ങനെ പറയുന്നു',tamov:'பிரியமானவர்களே தேவனுடைய வார்த்தை இப்படிச் சொல்லுகிறது'};
// floors: [full, first60, drop20] for "top" (found, score .6+), and the most "wrong on screen" allowed
const FLOOR={kjv:{top:[380,300,330],wrong:[0,1,1]},mal1910:{top:[400,312,374],wrong:[0,5,3]},tamov:{top:[398,352,376],wrong:[2,12,4]}};
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const sure=q=>(q.ordN>=5&&q.ord>=.6)||(q.ordN>=4&&q.ord>=.8);
const fails=[];
// Ordinary sermon talk with no verse read out: must give nothing the screen would show.
const talk=[
 'good morning church it is so good to see every one of you here this morning',
 'before we begin please make sure your phones are on silent and the children can go to the hall',
 'last week we started looking at how the early believers prayed together when things were hard',
 'I remember when I was a young man my father would wake us up at five to pray before school',
 'some of you came here today carrying a burden that nobody else knows about and that is alright',
 'the offering baskets will come around after the next song and you can also give online',
 'there is a youth meeting on Friday evening at seven and the snacks are on us',
 'we thank God for the family who just moved here from Chennai please make them welcome',
 'when the doctor told her the news she went home and sat in the car for an hour',
 'faith is not a feeling it is a decision you make again every single morning',
 'let me tell you a story about a fisherman I met in Kollam many years ago',
 'he had nothing in his hands but he still went out to the sea every day',
 'our building fund has reached half of the target thanks to your generous giving',
 'turn to the person next to you and tell them you are not here by accident',
 'many of us are waiting for a sign before we take one small step of obedience',
 'grace means you are accepted before you have done anything to earn it',
 'I want to speak today about three things patience gratitude and courage',
 'patience is hard when the bills arrive before the salary does',
 'gratitude changes the way you see the same house the same job and the same people',
 'courage is not the absence of fear it is walking forward while your knees shake',
 'the worship team will lead us in one more song and then we will pray for the sick',
 'if you need prayer the elders will be standing at the front after the service',
 'please remember the ladies fellowship is moving to Saturday afternoon this month',
 'the pastor is travelling this week so brother Thomas will lead the Wednesday study',
 'we will have lunch together after the service so please stay and eat with us',
 'there are forms at the back for anyone who wants to be baptised next month',
 'many young people today feel lonely even with hundreds of friends on their phones',
 'it is easy to judge others when you do not know what they are going through at home',
 'my grandmother could not read but she knew how to pray for every one of her children',
 'when the floods came our church opened its doors and people slept on these benches',
 'do not wait for the perfect moment to forgive because it will not come',
 'some of you have been praying for your children for years do not give up',
 'the choir has been practising for weeks for the Christmas program so please come',
 'we are collecting rice and clothes for the families affected by the landslide',
 'the bus will leave from the church gate at six thirty on Sunday morning',
 'I am not asking you to be perfect I am asking you to be honest with God today',
 'think about the last time you said thank you to someone who serves you every day',
 'it was raining heavily that night and the whole village had lost electricity',
 'he told me pastor I have tried everything and nothing has worked for me',
 'this is not about religion it is about a relationship that changes your whole life',
 'let us close our eyes and take a moment of silence before we continue',
 'the sound team needs two more volunteers so please speak to Joseph after the service',
 'we have three services now at seven nine and eleven thirty in the morning',
 'as we come to the end of the year let us remember all that has happened to us',
 'some people say they will come to church when their life is sorted out first'
];
(async()=>{
 for(const id of ['kjv','mal1910','tamov']){await Bible.ensureIndex(id);
  const res={full:[0,0,0],first60:[0,0,0],drop20:[0,0,0]};let n=0;
  while(n<400){const b=Math.floor(rnd()*66),c=1+Math.floor(rnd()*Bible.chapterCount(id,b));const ch=Bible.chapter(id,b,c);if(!ch.length)continue;const v=1+Math.floor(rnd()*ch.length);const t=ch[v-1];
   const w=t.split(/\s+/);const kw=Core.keyWords(t).split(' ').filter(x=>x.length>=3);if(kw.length<6)continue;n++;
   const variants={full:t,first60:w.slice(0,Math.ceil(w.length*.6)).join(' '),drop20:w.filter(()=>rnd()>.2).join(' ')};
   for(const k in variants){const heard=(lead[id]+' '+variants[k]).slice(-400);const qs=Bible.quote(id,heard,3).sort((a,b)=>(b.ord||0)-(a.ord||0)||b.score-a.score);const q=qs[0];
    const same=q&&(q.book===b&&q.ch===c&&q.v===v||Bible.verse(id,q.book,q.ch,q.v)===t);
    if(q&&q.score>=.6){ if(same){res[k][0]++; if(sure(q))res[k][1]++;} else if(sure(q))res[k][2]++; }}}
  const F=FLOOR[id];['full','first60','drop20'].forEach((k,j)=>{
   if(res[k][0]<F.top[j])fails.push(`${id} ${k}: top ${res[k][0]} below ${F.top[j]}`);
   if(res[k][2]>F.wrong[j])fails.push(`${id} ${k}: wrong on screen ${res[k][2]} above ${F.wrong[j]}`);});
  console.log(id,'of',n,Object.entries(res).map(([k,[top,s,wrong]])=>`${k}: top ${top}, on screen ${s}, wrong on screen ${wrong}`).join(' | '));}
 let fp=0;
 for(const id of ['kjv','web','bsb','asv']){await Bible.ensureIndex(id);
  for(const s of talk){
   // as the app sends it: the sermon so far, last 400 characters, so each sentence is tried after the one before it too
   const heard=(talk[talk.indexOf(s)-1]||'')+' '+s;
   for(const q of Bible.quote(id,heard.slice(-400),3)) if(sure(q)){fp++;fails.push(`${id} sermon talk put a verse on screen: "${s}" -> ${Bible.refLabel({book:q.book,ch:q.ch,v:q.v,ve:q.v},'en')}`);}}}
 console.log(`sermon talk: ${talk.length} sentences x 4 English Bibles, ${fp} on screen`);
 if(fails.length){fails.forEach(f=>console.log('FAIL',f));process.exitCode=1;}
 console.log(fails.length?`${fails.length} quote check(s) failed`:'quote checks passed');
})();
