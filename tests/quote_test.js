// How well does the read-aloud verse matcher find a verse said without its reference?
const R=__dirname+'/../';
const Bible=require(R+'js/bible.js'), Core=require(R+'js/core.js');
for(const id of ['kjv','mal1910','tamov']) require(R+'bible/'+id+'.js');
const lead={kjv:'and so my dear brothers and sisters the word of God says',mal1910:'പ്രിയമുള്ളവരേ ദൈവവചനം ഇങ്ങനെ പറയുന്നു',tamov:'பிரியமானவர்களே தேவனுடைய வார்த்தை இப்படிச் சொல்லுகிறது'};
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const sure=q=>(q.ordN>=5&&q.ord>=.6)||(q.ordN>=4&&q.ord>=.8);
(async()=>{for(const id of ['kjv','mal1910','tamov']){await Bible.ensureIndex(id);
 const res={full:[0,0,0],first60:[0,0,0],drop20:[0,0,0]};let n=0;
 while(n<400){const b=Math.floor(rnd()*66),c=1+Math.floor(rnd()*Bible.chapterCount(id,b));const ch=Bible.chapter(id,b,c);if(!ch.length)continue;const v=1+Math.floor(rnd()*ch.length);const t=ch[v-1];
  const w=t.split(/\s+/);const kw=Core.keyWords(t).split(' ').filter(x=>x.length>=3);if(kw.length<6)continue;n++;
  const variants={full:t,first60:w.slice(0,Math.ceil(w.length*.6)).join(' '),drop20:w.filter(()=>rnd()>.2).join(' ')};
  for(const k in variants){const heard=(lead[id]+' '+variants[k]).slice(-400);const qs=Bible.quote(id,heard,3).sort((a,b)=>(b.ord||0)-(a.ord||0)||b.score-a.score);const q=qs[0];
   const same=q&&(q.book===b&&q.ch===c&&q.v===v||Bible.verse(id,q.book,q.ch,q.v)===t);
   if(q&&q.score>=.6){ if(same){res[k][0]++; if(sure(q))res[k][1]++;} else if(sure(q))res[k][2]++; }}}
 console.log(id,'of',n,Object.entries(res).map(([k,[top,s,wrong]])=>`${k}: top ${top}, on screen ${s}, wrong on screen ${wrong}`).join(' | '));}
})();
