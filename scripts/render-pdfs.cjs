// Run with Node and Playwright available. CHROMIUM_PATH may select an installed browser.
const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto('file:///'+path.join(root,'slides.html').replaceAll('\\','/'));
 await page.emulateMedia({media:'screen'});
 await page.addStyleTag({content:`
 @page{size:1920px 1080px;margin:0} html,body{height:auto!important;overflow:visible!important;background:#0c0e14!important}
 .deck{position:static!important} .slide{position:relative!important;inset:auto!important;width:1920px!important;height:1080px!important;min-height:0!important;padding:75px 130px!important;opacity:1!important;visibility:visible!important;transform:none!important;break-after:page;overflow:hidden!important}
 .g2{grid-template-columns:repeat(2,1fr)!important}.g3{grid-template-columns:repeat(3,1fr)!important}.g4{grid-template-columns:repeat(4,1fr)!important}.g5{grid-template-columns:repeat(5,1fr)!important}.g6{grid-template-columns:repeat(3,1fr)!important}.wrap{max-width:1184px!important;max-height:none!important;zoom:1.25} #progress,#counter,#dots,#brandMark,.navhint,#navzoneL,#navzoneR,button{display:none!important}
 *,*::before,*::after{animation:none!important;transition:none!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .reveal-up,.reveal,.fade-in{opacity:1!important;transform:none!important} .card p,.card li{font-size:18px!important;line-height:1.55!important}.card h3{font-size:22px!important}.lead{font-size:24px!important;max-width:1300px!important}.note{color:#b0bad0!important;font-size:16px!important}.slide::after{content:'@MOYI · ASTRA / 2026.09';position:absolute;right:90px;bottom:30px;font:16px Consolas;color:#a4b0ca}
 `});
 await page.evaluate(()=>document.querySelectorAll('.slide .wrap').forEach(w=>{if(w.getBoundingClientRect().height>910)w.style.setProperty('zoom',String(1.25*910/w.getBoundingClientRect().height),'important');}));
 const records=await page.evaluate(()=>Array.from(document.querySelectorAll('.slide')).map((s,i)=>{
  const w=s.querySelector('.wrap')||s;
  const title=w.querySelector('h1,h2');
  const text=w.innerText;
  const units=[];
  function add(el){if(el===title||el.classList.contains('badge')||el.tagName==='BUTTON')return;
   if(el.matches('.grid,.row,.pipe')&&el.children.length>1){Array.from(el.children).forEach(add);return;}
   const t=el.innerText?.trim();if(t)units.push(t);
  } Array.from(w.children).forEach(add);
  const r=w.getBoundingClientRect(),sr=s.getBoundingClientRect();
  return {number:i+1,links:Array.from(w.querySelectorAll('a[href]')).map(a=>({text:a.innerText.trim(),href:new URL(a.getAttribute('href'),'https://jayinsightfactory.github.io/ai-lecture/slides.html').href})),title:title?.innerText||'AI 업무자동화',text,units,overflow:Math.max(0,r.bottom-sr.bottom+50),top:r.top-sr.top};
 }));
 const overflow=records.filter(x=>x.overflow>1||x.top<30); if(overflow.length)console.log('PC overflow:',JSON.stringify(overflow.map(({number,overflow,top})=>({number,overflow,top}))));
 await page.pdf({path:path.join(root,'downloads/ai-automation-vibe-coding-moyi.pdf'),printBackground:true,preferCSSPageSize:true,width:'1920px',height:'1080px'});
 fs.writeFileSync(path.join(root,'downloads/slides-text.md'),'# Astra 기준 AI 업무자동화 강의 · 2026-09-09\n\n'+records.map(x=>`## ${x.number}. ${x.title.replaceAll('\n',' ')}\n\n${x.text}\n`).join('\n'));
 // Reading edition: reflow the same source text into semantic cards, with real pagination.
 const mobile=await browser.newPage({viewport:{width:1080,height:1920}});
 const style=`@page{size:1080px 1920px;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#0c0e14;color:#eff3fc;font-family:'Malgun Gothic',sans-serif;font-size:34px;line-height:1.6}.page{height:1920px;padding:70px 65px 95px;position:relative;break-after:page;overflow:hidden;background:#0c0e14}.eyebrow{color:#7cafff;font-size:25px;letter-spacing:2px;font-weight:bold}h1{font-size:58px;word-break:keep-all;line-height:1.28;letter-spacing:-2px;margin:22px 0 35px;white-space:pre-line}article{background:#182033;border:2px solid #34425e;border-left:7px solid #61a1ff;border-radius:22px;padding:30px;margin:0 0 22px;white-space:pre-wrap;overflow-wrap:anywhere}article:first-of-type{border-left-color:#36d9b0}a{color:#8ec0ff;text-decoration:underline}.footer{position:absolute;bottom:35px;left:65px;color:#acb8d0;font-size:24px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
 const split=t=>{const parts=[];let p='',lines=0;for(const line of t.split('\n').filter(l=>l.trim())){if((p+'\n'+line).length>430&&p||lines>=13){parts.push(p);p='';lines=0;}if(line.length>430){if(p){parts.push(p);p='';lines=0;}for(let i=0;i<line.length;i+=400)parts.push(line.slice(i,i+400));}else{p+=(p?'\n':'')+line;lines++;}}if(p)parts.push(p);return parts;};
 await mobile.setContent('<!doctype html><html lang="ko"><meta charset="utf-8"><style>'+style+'</style><body></body></html>');
 const mobileInfo=await mobile.evaluate(({records,splitUnits})=>{
  let count=0;const failures=[];
  for(let n=0;n<records.length;n++){
   const rec=records[n];let sheet,body,part=0;
   function newPage(){sheet=document.createElement('section');sheet.className='page';document.body.append(sheet);const badge=document.createElement('div');badge.className='eyebrow';badge.textContent='ASTRA · CODEX / '+String(rec.number).padStart(3,'0')+(part?' · 이어서':'');const h=document.createElement('h1');h.textContent=rec.title;body=document.createElement('div');const foot=document.createElement('div');foot.className='footer';foot.textContent='@MOYI · 모바일 읽기판 / '+(++count);sheet.append(badge,h,body,foot);part++;}
   newPage();
   for(const text of splitUnits[n]){const card=document.createElement('article');card.textContent=text;for(const link of rec.links){if(link.text.length>2&&text.includes(link.text)){const a=document.createElement('a');a.href=link.href;a.textContent=' → '+link.text;a.style.display='block';card.append(a);}}body.append(card);if(card.getBoundingClientRect().bottom-sheet.getBoundingClientRect().top>1790){card.remove();newPage();body.append(card);}if(card.getBoundingClientRect().bottom-sheet.getBoundingClientRect().top>1790)failures.push(rec.number);}
  }return {pages:count,overflow:failures};
 },{records,splitUnits:records.map(x=>x.units.filter(t=>!/^['→↓↑←›>\s]+$/.test(t)).flatMap(split))});
 if(mobileInfo.overflow.length)throw new Error('Mobile overflow '+JSON.stringify(mobileInfo));
 await mobile.pdf({path:path.join(root,'downloads/ai-automation-vibe-coding-moyi-mobile.pdf'),printBackground:true,preferCSSPageSize:true});
 console.log('mobile',JSON.stringify(mobileInfo));
 console.log(JSON.stringify({slides:records.length,overflow:overflow.map(x=>x.number)}));
 await browser.close();
})();
