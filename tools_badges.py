# Generates static hosted badges (SVG) for every game. PNGs are rendered by tools_badges_png.js
import json, html
G=json.load(open('badges/games.json'))
def glyph(x,y,c):
    # original bar-chart + arrow glyph (no game logos)
    return (f'<g transform="translate({x},{y})"><rect x="0" y="18" width="7" height="14" rx="1.5" fill="{c}"/>'
            f'<rect x="10" y="11" width="7" height="21" rx="1.5" fill="{c}" opacity=".85"/>'
            f'<rect x="20" y="4" width="7" height="28" rx="1.5" fill="{c}" opacity=".7"/>'
            f'<path d="M1 12 L11 6 L18 9 L28 1" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>')
def sig(g):
    n=html.escape(g['name'].upper()); c=g['c']
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="468" height="60" viewBox="0 0 468 60" role="img" aria-label="My {html.escape(g['name'])} stats on RankSurge">
<defs><linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#0B0E17"/><stop offset="1" stop-color="#151A2B"/></linearGradient>
<linearGradient id="n" x1="0" x2="1"><stop offset="0" stop-color="#22D3EE"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>
<rect width="468" height="60" rx="8" fill="url(#b)"/><rect x="0" y="0" width="6" height="60" rx="3" fill="{c}"/>
<rect x=".5" y=".5" width="467" height="59" rx="7.5" fill="none" stroke="url(#n)" stroke-opacity=".55"/>
{glyph(20,14,c)}
<text x="62" y="28" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="17" font-weight="800" fill="#fff" letter-spacing=".5">MY {n} STATS</text>
<text x="62" y="46" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="#A9B4CC">Rank, stats and AI compare · free</text>
<text x="452" y="36" text-anchor="end" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="15" font-weight="800" fill="url(#n)">RankSurge</text>
</svg>'''
for g in G:
    open(f"badges/{g['id']}-468x60.svg","w").write(sig(g))
open("badges/ranksurge-468x60.svg","w").write(sig({'name':'Game','c':'#22D3EE','id':'ranksurge'}).replace('MY GAME STATS','MY GAME STATS').replace('aria-label="My Game stats','aria-label="My game stats'))
print(len(G))
