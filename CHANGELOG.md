# Changelog

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
