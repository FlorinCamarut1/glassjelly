# GlassJelly plugin (Jellyfin 12)

The theme as a Jellyfin server plugin: no Branding Custom CSS, no File Transformation, no install script.

- `Web/IndexInjectionStartupFilter.cs` adds the theme to the web app's `index.html` at request time: the logo and
  startup-screen style before `</head>`, the stylesheet and the scripts before `</body>` (after `#reactRoot`, so it
  comes after Jellyfin's `theme.css`, like the Branding CSS did).
- `Api/GlassJellyController.cs` serves `/GlassJelly/glassjelly.css` (and `-nologo.css`) anonymously, cached for good
  under a content-hash URL.
- `Configuration/configPage.html`: Dashboard → Plugins → GlassJelly (theme on/off, logo, ambient background, backdrops
  by default, hover light, player tweaks). Changes apply on the next page load, no restart.
- The theme files are embedded from `../dist` and `../src` at build time: run `node tools/build.mjs` first.

## Build

No .NET SDK needed locally, Docker is enough:

```bash
node tools/build.mjs
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e DOTNET_CLI_HOME=/tmp \
  -v "$PWD":/src -w /src/plugin mcr.microsoft.com/dotnet/sdk:10.0 dotnet publish -c Release -o /src/plugin/out
```

## Install by hand

Copy `out/Jellyfin.Plugin.GlassJelly.dll` to `<jellyfin config>/data/plugins/GlassJelly_<version>/` and restart
Jellyfin. If the theme was installed with `install.py` before, remove that copy first so it is not loaded twice:
`python3 install.py --uninstall --no-splash` (keeps the login background).
