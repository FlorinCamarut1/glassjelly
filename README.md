# GlassJelly

**A Liquid Glass theme for Jellyfin 12.** Clear glass everywhere — header capsules, buttons, menus, dialogs, the
player, the dashboard — with a bevelled specular rim and, in Chromium desktop browsers, **real refraction**: the
picture behind each pane bends and stretches at its edge like the rim of a glass slab, and round buttons are glass
beads that magnify what is under them. Graphite canvas, the current artwork glowing through as an ambient background,
a monochrome glass logo, white accent like tvOS.

![Home](screenshots/home.png)

| Library + sort menu | Details |
|---|---|
| ![Library](screenshots/library.png) | ![Details](screenshots/details.png) |
| **Player** | **Search** |
| ![Player](screenshots/player.png) | ![Search](screenshots/search.png) |

## Features

- **Clear glass, not frost** (Chromium desktop): the header capsules, library toolbar and search pill have no blur at
  all, only a strong lens; menus, action sheets, dialogs, drawers, toasts and the login form are glass slabs with a
  refracting rim and just enough tint (and a 4 px frost) to keep text readable; the player panel refracts the video.
- **Bevelled rim**: every glass surface is lit from the top-left with a reflection bottom-right, like iOS 26 Control
  Center. No opaque bars: once you scroll, the header capsules float over the content with a fading "scroll edge".
- **Refraction lens** (Chrome, Edge, Brave, Opera, Jellyfin Media Player on desktop): an SVG displacement filter built
  from each element's own box, so the rim has the same width on a 44 px button and a full-width player panel.
  Pure CSS, no script. Safari, Firefox, phones and TV boxes get frosted glass with the same rim instead.
- **Glass beads**: round buttons (details page, Media Bar, the play / ✓ / ♥ / ⋮ buttons on a hovered poster) magnify
  and bend the artwork underneath. Play / Resume are white glass.
- **Ambient background**: the current backdrop, tiny and blurred, behind the whole UI (details pages, Media Bar slides).
- **Player**: a floating glass control panel that actually blurs the video (Jellyfin's own `will-change` used to cut it
  off), Skip Intro / Recap docked into the panel.
- **Everything themed**: home, libraries, details, search, menus and action sheets, dialogs, login, settings, the
  admin dashboard, iOS-style switches. Styles the Media Bar Enhanced, Home Screen Sections and Jellyfin Enhanced plugins
  when you have them.
- **Liquid hover**: whatever is under the mouse — tabs, header icons, buttons, menu rows — becomes an untinted glass
  droplet that refracts what is behind it, lit from the cursor; posters get a glass rim and a highlight that follows
  the pointer. The selected tab is a glass lens drawn by light (outline, gloss, glint, caustic).
- **Glass logo**: the Jellyfin triangle as a slab of clear glass with a drop of white light inside — in the header,
  the tab icon, the startup screen, the login page and the login background (`--no-logo` keeps Jellyfin's own).
- **Jelly press**: glass buttons squash a little when pressed and spring back.
- **Accessible**: honours *Reduce transparency* (solid materials) and *Reduce motion*.
- **Fast**: glass only on single, large surfaces — never on the hundreds of per-card buttons (each blurred element is a
  GPU layer).

## Requirements

- **Jellyfin 12.x** (web client). Older versions have a different header and are not supported.
- Optional, for the full theme: the **File Transformation** plugin
  (repository `https://www.iamparadox.dev/jellyfin/plugins/manifest.json`). Without it you get the CSS-only theme:
  no ambient artwork background, stock admin dashboard, Skip Intro stays where Jellyfin puts it.

## Install

### Option A — one line of CSS (any server, 30 seconds)

Dashboard → General → **Branding** → **Custom CSS**, paste, **Save**, then reload the page (Ctrl+F5):

```css
@import url("https://cdn.jsdelivr.net/gh/FlorinCamarut1/glassjelly@v2.5.3/dist/glassjelly.css");
```

Keep Jellyfin's own logo and your server name in the header? Use `dist/glassjelly-nologo.css` instead.
Pin a tag (`@v2.5.3`) so an update never surprises you; change it when you want a new version.

### Option B — installer (full theme)

Needs Python 3.8+ on any machine that can reach the server (no extra packages).

```bash
git clone https://github.com/FlorinCamarut1/glassjelly.git
cd glassjelly
python3 install.py --url http://YOUR-SERVER:8096
```

It asks for an administrator login (or pass `--api-key KEY` from Dashboard → API Keys, or set `JF_API_KEY`). It
applies live — no restart — and backs up everything it changes to `./backups`. Run it with `--dry-run` first to see
the changes.

| Option | Effect |
|---|---|
| `--cdn [TAG]` | write the one-line `@import` instead of pasting the whole CSS |
| `--no-logo` | keep Jellyfin's logo + server name, favicon and login background |
| `--no-splash` | keep your own login background |
| `--no-ambient` | no artwork background (graphite canvas only) |
| `--no-dashboard` | leave the admin dashboard stock |
| `--no-skip-dock` | leave Skip Intro where Jellyfin puts it |
| `--no-backdrops-default` | do not switch *Backdrops* on for devices that never chose |
| `--no-hover-light` | hover highlights stay centred (no cursor-following script) |
| `--no-font` | system fonts only (no Inter from jsDelivr) |

**Update**: `git pull && python3 install.py --url ...` (same options). **Remove**: `python3 install.py --uninstall`;
`--restore backups/branding-<date>.json` puts back an exact earlier state.

## Customize

Everything is driven by tokens at the top of the CSS. Override them *after* the `@import` in Custom CSS, with the
same selector the theme uses (`:root, html[data-theme]`) so yours win:

```css
:root, html[data-theme] {
  --gj-mat-thin: rgba(26,26,32,.40);           /* more tint on the capsules */
  --gj-blur-s: blur(14px) saturate(180%);      /* frostier glass */
  --gj-lens: saturate(1); --gj-lens-cap: saturate(1); --gj-lens-panel: saturate(1);   /* refraction off ... */
  --gj-lens-s: saturate(1); --gj-bubble: saturate(1); --gj-bubble-s: saturate(1); --gj-bubble-fab: saturate(1);   /* ... everywhere */
  --gj-liquid-menu: rgba(12,12,16,.78);        /* darker menus (more legible over busy art) */
  --gj-accent: #0a84ff; --gj-accent-channel: 10 132 255; --gj-on-accent: #fff;   /* blue accent */
}
```

Lite mode (no blur anywhere, for weak devices): `--gj-blur-s: none; --gj-blur-m: none; --gj-blur-l: none;`.

## Browser support

| | Glass | Refraction lens |
|---|---|---|
| Chrome / Edge / Brave / Opera (desktop) | ✓ | ✓ |
| Jellyfin Media Player | ✓ | ✓ |
| Safari (macOS, iOS), Firefox | ✓ (frosted) | — |
| Phones, tablets, TV boxes (touch) | ✓ (lighter) | — |

## How the lens works

`tools/glassfilter.mjs` builds an SVG filter that is used straight from a `data:` URI in `backdrop-filter`:
the element's box is eroded and blurred into a soft slab, two convolutions turn it into surface normals, and
`feDisplacementMap` shifts the backdrop along them near the rim; a half-pixel blur at the end smooths the stair steps
of the displacement. Because it is derived from the box itself, the rim keeps the same width at any size or aspect
ratio, and with a large blur radius the field becomes nearly radial, which is how round buttons turn into beads.
Lens strengths live in `tools/build.mjs` (`LENS_CAP`, `LENS_PANEL`, `BUBBLE*`); the build writes them into the CSS.

Two things that do **not** work, in case you want to experiment: a displacement *image* (`feImage`, the usual
"liquid glass" recipe) barely displaces anything inside `backdrop-filter` in current Chromium, and `clip-path` on a
lensed element draws pixelated edges — Chromium already clips `url()` backdrop filters to `border-radius`.

## Development

```bash
node tools/logo.mjs      # (only when the logo changes) write assets/logo/glassjelly.svg
node tools/build.mjs     # regenerate the lens + logo tokens in src/, write dist/*.css, run sanity checks
```

`src/glassjelly.css` is the source (sections are numbered; v2 Liquid Glass lives in section 21), `src/js/` holds the
index.html scripts, `src/early.css` the startup-screen CSS. Never put a `$` in a script: File Transformation treats the
replacement text as a regex.

## Credits

Made by [FlorinCamarut1](https://github.com/FlorinCamarut1). The glass triangle logo is a reinterpretation of the Jellyfin
logo (see [jellyfin-ux](https://github.com/jellyfin/jellyfin-ux) for its licence); GlassJelly is not affiliated with the
Jellyfin project. Inter font by Rasmus Andersson (SIL OFL), served by jsDelivr / Fontsource.
Theme code: MIT, see [LICENSE](LICENSE).
