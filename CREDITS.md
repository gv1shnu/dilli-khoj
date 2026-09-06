# Credits and asset attribution

Dilli Khoj uses open-source assets. Every third-party asset that ships in the game
is listed here with its source and license. Add an entry here whenever you import a
new asset, and keep any license text the asset requires.

## Art inspiration

Character Art inspired from [Exceletia by edusatyaki](https://github.com/edusatyaki/Exceletia). This credit does not replace the individual licenses for assets listed below.

## Engine & libraries

- **three.js** — 3D engine. MIT License. © mrdoob and three.js contributors.
  https://github.com/mrdoob/three.js

## 3D models

- **Soldier** (`public/models/soldier.glb`) — rigged character with baked Idle / Walk /
  Run animations. Sourced from the three.js example assets
  (`examples/models/gltf/Soldier.glb`), distributed under the three.js MIT License.
  https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb

  > Placeholder character. It is thematically a soldier, not a heritage explorer, and
  > is intended to be swapped for a more on-theme CC-BY / CC0 character before launch.
  > If the replacement's license requires attribution, add it here with the exact
  > credit line the author specifies.

## Textures

- All world textures (sandstone masonry, cracked earth, bark, foliage) are generated
  procedurally at runtime on an HTML canvas in `src/game/textures.ts`. No third-party
  image files are shipped.

## Audio

- All ambience (wind, birdcalls) is synthesized at runtime with the Web Audio API in
  `src/game/ambience.ts`. No third-party audio files are shipped.

## Fonts

- UI uses system font stacks only; no third-party web fonts are bundled.
