const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({deviceScaleFactor:1,viewport:{width:468,height:60}});
for(const f of fs.readdirSync('badges').filter(f=>f.endsWith('.svg'))){const svg=fs.readFileSync('badges/'+f,'utf8');
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await p.locator('svg').screenshot({path:'badges/'+f.replace('.svg','.png'),omitBackground:true});}
await b.close();})();
