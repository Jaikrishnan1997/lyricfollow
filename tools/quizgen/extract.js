const fs=require('fs'),vm=require('vm'),P='/home/claude/lyricfollow/';
global.LFCore=require(P+'js/core.js');const Bible=require(P+'js/bible.js');
const D={};for(const id of ['kjv','tamov','mal1910'])vm.runInNewContext(fs.readFileSync(P+'bible/'+id+'.js','utf8'),{LF_BIBLE_LOAD:b=>D[id]=b});
let n=0;Bible.BOOKS.forEach((bk,b)=>{const dir=`/home/claude/qgen/text/${String(b+1).padStart(2,'0')}-${bk.en.replace(/ /g,'_')}`;fs.mkdirSync(dir,{recursive:true});
 D.kjv.data[b].forEach((ch,c)=>{const L=[`# ${bk.en} ${c+1} | ${bk.ta} | ${bk.ml}`];ch.forEach((v,i)=>{n++;L.push(`${c+1}:${i+1}\nEN ${v}\nTA ${((D.tamov.data[b]||[])[c]||[])[i]||''}\nML ${((D.mal1910.data[b]||[])[c]||[])[i]||''}`)});fs.writeFileSync(`${dir}/${String(c+1).padStart(3,'0')}.txt`,L.join('\n')+'\n')})});
console.log('verses',n);
