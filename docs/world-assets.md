# World asset provenance

The open-world architecture, vehicles, market props, water, vegetation, signs and
landmarks are original procedural geometry authored in `src/game/world/kit.ts`
and `src/game/world/levels/`. Sign artwork is generated from local canvas text.
Existing procedural stone/ground textures are reused from `textures.ts`.

Environmental sound beds and localized detail sounds are original Web Audio
synthesis in `ambience.ts`. Profiles define wind, water wash, low machinery hum,
bird density, and bell/metal/drip/insect/wood/rail details. Profiles crossfade over
roughly two seconds on entering a place. Audio begins only after user interaction;
M toggles mute, hidden tabs are silenced, and archives lower the volume.
No new external recordings, model packs, paid services or attribution obligations.

The existing Soldier GLB is unchanged; retain its existing project provenance.
