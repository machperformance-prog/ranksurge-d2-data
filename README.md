# ranksurge-d2-data

Daily-built Destiny 2 weapon and armor data for [RankSurge](https://ranksurge.games/pages/destiny-2-weapons).

A GitHub Action reads Bungie's public Destiny 2 manifest after each daily reset. It writes slim JSON to `data/`, and jsDelivr serves those files:

- `data/meta.json`: manifest version, build time, counts, stat descriptions, element icons
- `data/weapons.json`: legendary and exotic weapons with base stats, frame, perk columns, source
- `data/armor.json`: legendary and exotic armor by class with exotic perk, archetypes, stat rolls and set
- `data/perks.json`: perk and plug names, descriptions, icons and stat changes
- `data/sets.json`: armor set bonuses (2 and 4 piece)
- `data/groups.json`: weapon stat interpolation tables (for perk and masterwork stat changes)

Field names are short to keep files small. See `scripts/core.js` for the format.

Destiny 2 content and materials are trademarks and copyrights of Bungie, Inc. RankSurge is not affiliated with Bungie.
