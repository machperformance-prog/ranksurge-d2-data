#!/usr/bin/env node
/* Daily RankSurge D2 data build: Bungie manifest -> data/*.json (served by jsDelivr).
   No secrets needed: the manifest index and content files are public. BUNGIE_API_KEY is optional. */
'use strict';
const fs = require('fs');
const path = require('path');
const { build } = require('./core.js');

const OUT = path.join(__dirname, '..', 'data');
const TABLES = ['DestinyInventoryItemDefinition', 'DestinyStatDefinition', 'DestinyStatGroupDefinition', 'DestinyPlugSetDefinition',
  'DestinyDamageTypeDefinition', 'DestinySandboxPerkDefinition', 'DestinyCollectibleDefinition', 'DestinyEquipableItemSetDefinition',
  'DestinySocketCategoryDefinition', 'DestinyBreakerTypeDefinition'];
const UA = 'RankSurge-D2-Data/1.0 (+https://ranksurge.games)';

async function getJSON(url, tries = 4) {
  const headers = { 'user-agent': UA, accept: 'application/json' };
  if (process.env.BUNGIE_API_KEY && url.includes('/Platform/')) headers['x-api-key'] = process.env.BUNGIE_API_KEY;
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      console.warn(`retry ${i}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 3000 * i));
    }
  }
}

(async () => {
  const idx = await getJSON('https://www.bungie.net/Platform/Destiny2/Manifest/');
  if (!idx || !idx.Response) throw new Error('Bad manifest index');
  const m = idx.Response;
  const version = m.version;
  const prev = fs.existsSync(path.join(OUT, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8')) : null;
  if (prev && prev.v === version && !process.env.FORCE) { console.log('Manifest unchanged:', version); return; }
  const paths = m.jsonWorldComponentContentPaths.en;
  const T = {};
  for (const t of TABLES) {
    if (!paths[t]) throw new Error('Missing table ' + t);
    T[t] = await getJSON('https://www.bungie.net' + paths[t]);
    console.log('got', t, Object.keys(T[t]).length);
  }
  const out = build(T, { version, built: new Date().toISOString() });
  // Sanity checks so a bad manifest never replaces good data.
  if (out.weapons.length < 500 || out.armor.length < 500) throw new Error(`Too few items: ${out.weapons.length} weapons, ${out.armor.length} armor`);
  fs.mkdirSync(OUT, { recursive: true });
  for (const k of ['weapons', 'armor', 'perks', 'sets', 'groups']) fs.writeFileSync(path.join(OUT, k + '.json'), JSON.stringify(out[k]));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(out.meta));
  console.log('built', version, out.meta.counts);
})().catch((e) => { console.error(e); process.exit(1); });
