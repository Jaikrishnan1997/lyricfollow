// node /home/claude/qgen/check.js <out file or dir> ...   checks generated quiz lines against the chapter text
const fs=require('fs'),path=require('path');
const files=[];for(const a of process.argv.slice(2)){const s=fs.statSync(a);if(s.isDirectory())fs.readdirSync(a).filter(f=>f.endsWith('.txt')).forEach(f=>files.push(path.join(a,f)));else files.push(a);}
let tot=0,bad=0,warn=0;const msgs=[];
for(const f of files){
  const book=path.basename(path.dirname(f)),ch=+path.basename(f,'.txt');
  const tf=`/home/claude/qgen/text/${book}/${String(ch).padStart(3,'0')}.txt`;
  if(!fs.existsSync(tf)){msgs.push(`${f}: no such chapter text`);bad++;continue;}
  const V={};let cur=null;for(const l of fs.readFileSync(tf,'utf8').split('\n')){const m=l.match(/^(\d+):(\d+)$/);if(m){cur=+m[2];V[cur]={};}else if(cur&&/^(EN|TA|ML) /.test(l))V[cur][l.slice(0,2)]=l.slice(3);}
  const seen=new Set();
  fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
    if(!l.trim()||l.startsWith('#'))return;tot++;
    const p=l.split('|').map(s=>s.trim());const where=`${book}/${ch}.txt:${i+1}`;
    if(p.length!==7){bad++;msgs.push(`${where} needs 7 fields, has ${p.length}`);return;}
    const m=p[0].match(/^(\d+):(\d+)$/);if(!m||+m[1]!==ch||!V[+m[2]]){bad++;msgs.push(`${where} bad ref ${p[0]}`);return;}
    if(p.some(x=>!x)){bad++;msgs.push(`${where} empty field`);return;}
    if(!/[஀-௿]/.test(p[3]+p[4])||!/[ഀ-ൿ]/.test(p[5]+p[6])){bad++;msgs.push(`${where} Tamil/Malayalam fields not in their script`);return;}
    if(!/[?？]$/.test(p[1])||!/\?$/.test(p[3])||!/\?$/.test(p[5])){bad++;msgs.push(`${where} questions must end with ?`);return;}
    if(p[2].split(/\s+/).length>8){warn++;msgs.push(`${where} long answer: ${p[2]}`);}
    const k=p[1].toLowerCase();if(seen.has(k)){bad++;msgs.push(`${where} duplicate question`);return;}seen.add(k);
    // answer names should be spelled as in that Bible (checked loosely: the start of a word within 3 verses)
    const v=+m[2];for(const [fi,lg] of [[4,'TA'],[6,'ML']]){let t='';for(let d=-3;d<=3;d++)t+=' '+((V[v+d]||{})[lg]||'');
      const ws=p[fi].split(/[\s,()\-–:;.]+/).filter(w=>w.length>=4&&!/\d/.test(w));
      if(ws.length&&!ws.some(w=>t.includes(w.slice(0,Math.max(3,Math.ceil(w.length*.6))))))warn++;}
  });
}
console.log(`files ${files.length}, lines ${tot}, errors ${bad}, answer words not found near the verse ${warn}`);msgs.slice(0,40).forEach(x=>console.log('  '+x));
process.exit(bad?1:0);
