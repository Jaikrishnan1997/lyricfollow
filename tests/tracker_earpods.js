const Core=require('/home/claude/lyricfollow/js/core.js');
const T0=require('./earpods_alleluya.json');
const ta=require('/home/claude/lyricfollow/vendor/songs-ta-fgs.json').songs, ch=require('/home/claude/lyricfollow/vendor/songs-church.json').songs;
const pick=t=>ch.concat(ta).find(s=>s.title.startsWith(t));
const parse=text=>{const ls=[];text.split(/\n\s*\n/).map(b=>b.split('\n').map(x=>x.trim()).filter(Boolean)).forEach((b,si)=>b.forEach(x=>ls.push({text:x,slide:si})));const indic=t=>/[ऀ-෿]/.test(t),latin=t=>/[a-z]/i.test(t)&&!indic(t);for(let i=1;i<ls.length;i++){const a=ls[i-1],b=ls[i];if(a.slide===b.slide&&!a.alt&&(indic(a.text)&&latin(b.text)||latin(a.text)&&indic(b.text)))(indic(a.text)?b:a).alt=true;}return ls;};
const svc=['அல்லேலூயா கர்த்தரையே','எந்தன் நாவில்','அழகாய் நிற்கும்','அழைத்தீரே'].map(pick).map((s,i)=>({id:'S'+i,lines:parse(s.lyrics)}));
let LIB=null; if(process.env.LIB){const all=['songs-ta-fgs','songs-church','songs-ml-wikisource','songs-en-wikisource'].flatMap(f=>require('../vendor/'+f+'.json').songs);LIB=Core.libIndex(all.map((s,i)=>{const ls=parse(s.lyrics);Core.prepare(ls.map(l=>l.text)).forEach((p,j)=>Object.assign(ls[j],p));return{id:'L'+i,lines:ls};}));}
const T=Core.trackIndex(svc,LIB); const st={song:'S0',cur:-1}; let bad=0; const path=[]; const V=process.argv[2];
const same=(a,b)=>a===b||(a>=4&&b>=4&&(a-4)%8<4&&(b-4)%8<4&&(a-4)%8===(b-4)%8);
T0.forEach(([t,tr],i)=>{const c0=st.cur; const r=Core.trackStep(T,st,t,i*3300); if(r){st.song=r.song;st.cur=r.line;} path.push(st.song==='S0'?st.cur:'X'+st.cur); if(tr>=0&&(st.song!=='S0'||(tr-st.cur>=2||st.cur-tr>=2)&&!same(tr,st.cur)))bad++; if(V)console.log(i,tr,c0,'->',st.cur,r?r.why:'',st.mineTop.toFixed(2),st.otherTop.toFixed(2),t);});
console.log('bad',bad,path.join(' '));
