# Changelog

## v2.4.0 — 2026-10-09 · Clear capsules

- Header capsules, the library toolbar and the search pill are a glass rod in Chromium: no blur any more, only a strong
  lens (`--gj-lens-cap`) that bends and stretches what scrolls underneath, with a light tint, white labels and a
  stronger text shadow for legibility. Safari / Firefox keep frosted capsules.
- The header scroll edge no longer blurs (it fogged everything under the capsules); the dark fade stays.

## v2.3.1 — 2026-10-09

- The selected tab is a glass lens instead of a grey pill (it read as a blur): bright outline and bevel, gloss over
  the top half, a glint and a caustic glow at the bottom; refracting rim in Chromium. Hovering it keeps that look.

## v2.3.0 — 2026-10-09 · Clear glass hover

- Hover in Chromium desktop browsers is pure glass, like Apple's Liquid Glass artwork: no tint, no frost, a thick
  refracting rim with colour dispersion (`bubbleCA()`: red, green and blue bend by different amounts), a thin bright
  outline and a small glint. Pills/menu rows use `--gj-bubble`, round buttons `--gj-bubble-s`.
- The capsule around a hovered item drops its frost, so the droplet bends the real picture instead of a blur.
- Safari / Firefox keep the lit droplet of v2.1 (a clear droplet would be invisible without the lens).

## v2.2.0 — 2026-10-09 · Control Center glass

- Thick bevelled rim on every glass surface, lit from the top-left with a reflection bottom-right (iOS 26 Control
  Center look); capsules, header icons, search, details and Media Bar buttons are clear glass now.
- Hollow-glass lens: a shape-aware "bubble" displacement (`bubble()` in `tools/glassfilter.mjs`: clear magnified
  centre, strongly bending rim). Round buttons are glass beads at rest (no more square artefact of the box lens on
  circles) and every hovered control or menu row becomes a hollow glass droplet (Chromium desktop).

## v2.1.0 — 2026-10-09 · Liquid hover

- Hover is glass now: tabs, header icons, toolbar, details and Media Bar buttons, poster buttons, menu rows and
  drawer items turn into a droplet of brighter glass with a specular rim and a springy grow.
- The light follows the cursor: new `src/js/hover.js` (File Transformation ...0002, `--no-hover-light` to skip) sets
  `--gj-mx` / `--gj-my` on the hovered element; without it the light sits at the top centre (CSS-only installs).
- Posters: glass rim + a highlight that follows the pointer on the lifted card.
- Menus: rows sit inside the glass with a 6px inset and no hairlines; the delete row lights up red.

## v2.0.0 — 2026-10-09 · Liquid Glass

First public release, as **GlassJelly** (v1 was a private "Apple TV" theme).

- New materials: lighter tint, shorter blur with more saturation and brightness, specular rim, top sheen;
  dialogs keep a denser "sheet" material for forms.
- Refraction lens on the header capsules, library toolbar, search pill, details buttons, player panel, now-playing
  bar, menus and action sheets (Chromium desktop; plain glass elsewhere).
- No header bar on scroll: floating capsules over a fading scroll edge. The header icons and the avatar are glass
  capsules too; the selected tab is a glass droplet instead of a white pill.
- Player: the control panel really blurs the video now (Jellyfin's `will-change: opacity` on `.videoOsdBottom` made it
  the panel's backdrop root, so the glass only ever saw the overlay gradient).
- Menus no longer black out the page (lighter dim behind action sheets).
- "Jelly" press feedback on glass buttons; `prefers-reduced-transparency` support.
- Portable installer `install.py` (`--url`, `--api-key` or login prompt, `--cdn`, `--uninstall`, `--restore`), CSS on
  jsDelivr, `--no-logo` variant. Migrates a v1 install in place.
- Renamed: `--atv-*` tokens → `--gj-*`, markers `APPLETV THEME` → `GLASSJELLY`.

## v1.3.2 — 2026-10-08 (private)

Performance: blur on card buttons only on hover, Media Bar buttons without blur, ambient background pre-rendered on a
small canvas (Home: 1495 → 421 compositor layers).

## v1.0 – v1.3.1 — 2026-10-07/08 (private)

Apple TV-style frosted glass theme: graphite canvas, ambient background, themed dashboard and menus, search,
custom logo and startup screen, Skip Intro docked in the player.
