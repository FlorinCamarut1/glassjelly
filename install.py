#!/usr/bin/env python3
"""GlassJelly - Liquid Glass theme for Jellyfin 12: installer / updater / uninstaller.
Python 3.8+, standard library only. Talks to Jellyfin over its HTTP API: no restart, no file edits on the server.

  python3 install.py --url http://SERVER:8096                 install / update (asks for an admin login)
  python3 install.py --url ... --api-key KEY                  same, with an API key (Dashboard > API Keys)
  python3 install.py --dry-run                                show what would change, change nothing
  python3 install.py --uninstall                              remove everything GlassJelly added
  python3 install.py --restore backups/branding-<ts>.json     put back an exact earlier branding config

Environment instead of flags: JF_URL, JF_API_KEY.

What it writes
  1. Dashboard > General > Branding > Custom CSS: the theme, between the GLASSJELLY BEGIN/END markers (anything else
     you have there is kept). --cdn writes a one-line @import of the jsDelivr copy instead of the whole file.
  2. If the File Transformation plugin is installed, small scripts in index.html (all optional, see --no-*):
       ...0002 backdrops default + ambient background + favicon + Skip Intro dock + hover light   ...0003 dashboard CSS
       ...0004 early logo / startup screen (before </head>)
     Without the plugin you get the CSS-only theme (no ambient artwork background, admin pages stay stock).
  3. The login background (Branding > Splash screen) = assets/splash.png, unless --no-splash / --no-logo.
Every change is backed up to ./backups first (branding JSON, File Transformation JSON, the previous splash image).
"""
import argparse, base64, difflib, getpass, json, os, re, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = "FlorinCamarut1/glassjelly"
THEME_FILE = os.path.join(HERE, "dist", "glassjelly.css")
EARLY_FILE = os.path.join(HERE, "src", "early.css")
JS = {n: os.path.join(HERE, "src", "js", n + ".js") for n in ("backdrops", "ambient", "favicon", "player", "hover", "dashboard")}
SPLASH_FILE = os.path.join(HERE, "assets", "splash.png")
BACKUP_DIR = os.path.join(HERE, "backups")
SPLASH_ORIG_NOTE = os.path.join(BACKUP_DIR, "splashscreen-original.txt")
SPLASH_MARK = os.path.join(BACKUP_DIR, ".splash-installed")

BEGIN, END = "/* >>> GLASSJELLY BEGIN <<< */", "/* >>> GLASSJELLY END <<< */"
LEGACY_BLOCKS = [("/* >>> APPLETV THEME BEGIN <<< */", "/* >>> APPLETV THEME END <<< */")]   # v1 "Apple TV" theme
LOGO_BEGIN, LOGO_END = "/* >>> GJ-LOGO BEGIN <<<", "/* <<< GJ-LOGO END >>> */"
FONT_TAGS = ("/* GLASSJELLY-FONT */", "/* APPLETV-FONT */")
FT_PLUGIN = "5e87cc92-571a-4d8d-8d98-d2d4147f9f90"          # File Transformation (IAmParadox27)
THEME_ID = "d3f1c0a2-5b6e-4a7c-8d9e-000000000002"
DASHBOARD_ID = "d3f1c0a2-5b6e-4a7c-8d9e-000000000003"
EARLY_ID = "d3f1c0a2-5b6e-4a7c-8d9e-000000000004"
EARLY_MARK = 'id="gj-early"'
CLIENT = 'MediaBrowser Client="GlassJelly installer", Device="install.py", DeviceId="glassjelly-installer", Version="2"'


def die(msg):
    sys.exit("error: " + msg)


def read_text(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def read_bytes(p):
    try:
        with open(p, "rb") as f:
            return f.read()
    except OSError:
        return None


class Api:
    def __init__(self, base, key=None):
        self.base, self.key = base.rstrip("/"), key

    def req(self, method, path, body=None, auth=True, raw=False, data=None, ctype=None, missing_ok=False):
        headers = {"Accept": "application/json"}
        if auth:
            headers["Authorization"] = CLIENT + (', Token="%s"' % self.key if self.key else "")
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif data is not None:
            headers["Content-Type"] = ctype or "application/octet-stream"
        r = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(r, timeout=30) as resp:
                txt = resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if missing_ok and e.code == 404:
                return None
            if e.code in (401, 403):
                die("%s %s: HTTP %s - the login / API key is not an administrator's" % (method, path, e.code))
            die("%s %s failed: HTTP %s" % (method, path, e.code))
        except urllib.error.URLError as e:
            die("cannot reach %s (%s) - check --url" % (self.base, e.reason))
        if raw:
            return txt
        return json.loads(txt) if txt.strip() else None

    def login(self, user, password):
        r = self.req("POST", "/Users/AuthenticateByName", {"Username": user, "Pw": password})
        if not r or not r.get("AccessToken"):
            die("login failed")
        if not (r.get("User") or {}).get("Policy", {}).get("IsAdministrator"):
            die("%s is not an administrator" % user)
        self.key = r["AccessToken"]


def connect(a):
    api = Api(a.url, a.api_key or os.environ.get("JF_API_KEY") or None)
    info = api.req("GET", "/System/Info/Public", auth=False)
    ver = (info or {}).get("Version", "?")
    print("Jellyfin %s at %s (%s)" % (ver, api.base, (info or {}).get("ServerName", "")))
    if not ver.startswith("12."):
        print("  ! GlassJelly is made for Jellyfin 12.x; on %s parts of the layout may not match" % ver)
    if not api.key:
        if not sys.stdin.isatty():
            die("no credentials: pass --api-key, set JF_API_KEY, or run interactively to log in")
        user = input("Admin username: ").strip()
        api.login(user, getpass.getpass("Password for %s: " % user))
    return api


# ---------- CSS ----------
def strip_block(css, b, e):
    return re.sub(r"[ \t]*" + re.escape(b) + r".*?" + re.escape(e) + r"[ \t]*\n?", "", css, flags=re.S)


def strip_ours(css):
    """Everything this installer (or the v1 Apple TV theme) ever added; the rest of Custom CSS is left alone."""
    for b, e in [(BEGIN, END)] + LEGACY_BLOCKS:
        css = strip_block(css, b, e)
    css = re.sub(r"[ \t]*@import\s+url\(\s*['\"]?[^)]*abyss[^)]*\)\s*;[ \t]*\n?", "", css)              # v1 removed abyss
    css = re.sub(r"[ \t]*html\s*,\s*\.backgroundContainer\s*\{[^{}]*radial-gradient[^{}]*\}[ \t]*\n?", "", css)
    css = "\n".join(l for l in css.split("\n") if not any(t in l for t in FONT_TAGS))
    return css.strip()


def build_css(old, theme, font, cdn_url):
    lines = theme.strip("\n").split("\n")
    font_line = lines.pop(0).strip() if lines and lines[0].lstrip().startswith("@import") else ""
    body = ('@import url("%s");' % cdn_url) if cdn_url else "\n".join(lines).strip("\n")
    rest, out = strip_ours(old), ""
    # @import must come before every other rule of the <style>, so the font line goes first
    if font and font_line and not cdn_url:
        out += font_line + " " + FONT_TAGS[0] + "\n"
    if cdn_url:
        out += body + " " + FONT_TAGS[0] + "\n"
        body = "/* theme loaded from jsDelivr by the @import on the first line */"
    return out + (rest + "\n\n" if rest else "") + BEGIN + "\n" + body + "\n" + END + "\n"


def strip_logo(theme):
    out = re.sub(re.escape(LOGO_BEGIN) + r".*?" + re.escape(LOGO_END) + r"[ \t]*\n?", "", theme, flags=re.S)
    if out == theme:
        die("logo block not found in %s" % THEME_FILE)
    return out


# ---------- index.html scripts (File Transformation) ----------
def script(name):
    js = read_text(JS[name]).strip()
    if "$" in js or "</script" in js.lower():
        die("src/js/%s.js must not contain '$' or '</script' (File Transformation replacement text)" % name)
    return "<script>\n" + js + "\n</script>"


def theme_js(o):
    parts = [script(n) for n, on in (("backdrops", o["backdrops"]), ("ambient", o["ambient"]), ("favicon", o["logo"]),
                                    ("player", o["player"]), ("hover", o["hover"])) if on]
    return ("".join(parts) + "</body>") if parts else None


def early_head(theme, on):
    m = re.search(r'--gj-logo:\s*url\("(data:image/svg\+xml,[^"]+)"\)', theme) if on else None
    if not m:
        return None
    uri, css = m.group(1), re.sub(r"/\*.*?\*/", "", read_text(EARLY_FILE), flags=re.S).replace("\n", "")
    if "$" in uri or "$" in css:
        die("early logo/CSS must not contain '$'")
    return ('<link rel="icon" type="image/svg+xml" href="' + uri + '"><style ' + EARLY_MARK + '>'
            '.splashLogo{background-image:url("' + uri + '")!important;background-size:min(112px,100%) auto!important}'
            + css + '</style></head>')


def norm_id(i):
    return (i or "").replace("-", "").lower()


def backup(name, obj):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%SZ", time.gmtime())
    p, n = os.path.join(BACKUP_DIR, "%s-%s.json" % (name, stamp)), 1
    while os.path.exists(p):
        n += 1
        p = os.path.join(BACKUP_DIR, "%s-%s-%d.json" % (name, stamp, n))
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    return p


def set_transformations(api, wanted, dry):
    """wanted = [(id, replace_text or None, label, search_text)]; None removes the entry. Entries that are not ours
    (any other script you or another plugin added) are kept exactly as they are, in their place.
    Returns False when the File Transformation plugin is not installed."""
    cfg = api.req("GET", "/Plugins/%s/Configuration" % FT_PLUGIN, missing_ok=True)
    if cfg is None:
        return False
    trs, changed, notes = cfg.get("Transformations") or [], False, []
    for tid, text, label, search in wanted:
        cur = [t for t in trs if norm_id(t.get("Id")) == norm_id(tid)]
        if text is not None and len(cur) == 1 and cur[0].get("ReplaceText") == text and \
                cur[0].get("FilenamePattern") == "index.html" and cur[0].get("SearchText") == search:
            notes.append("...%s (%s): up to date" % (tid[-4:], label)); continue
        if text is None and not cur:
            continue
        new_t = {"Id": tid, "FilenamePattern": "index.html", "SearchText": search, "ReplaceText": text}
        out, done = [], False
        for t in trs:
            if norm_id(t.get("Id")) == norm_id(tid):
                if text is not None and not done:
                    out.append(new_t); done = True
                continue
            out.append(t)
        if text is not None and not done:
            out.append(new_t)
        trs, changed = out, True
        notes.append("...%s: %s" % (tid[-4:], ("set (%s)" % label) if text is not None else "removed"))
    if changed and not dry:
        p = backup("filetransformation", api.req("GET", "/Plugins/%s/Configuration" % FT_PLUGIN))
        cfg["Transformations"] = trs
        api.req("POST", "/Plugins/%s/Configuration" % FT_PLUGIN, cfg)
        notes.append("(backup: %s)" % os.path.relpath(p, HERE))
    for n in notes:
        print("  index.html scripts%s %s" % (" (dry run)" if dry and changed else "", n))
    return True


# ---------- login background (splash screen) ----------
def current_splash(api):
    """bytes of the custom splash screen, or None when Jellyfin's generated one is in use."""
    if not (api.req("GET", "/System/Configuration/branding") or {}).get("SplashscreenLocation"):
        return None   # Jellyfin generates its own (the endpoint still serves an image then)
    try:
        r = urllib.request.Request(api.base + "/Branding/Splashscreen", headers={"Accept": "image/*"})
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.read()
    except (urllib.error.HTTPError, urllib.error.URLError):
        return None


def upload_splash(api, data):
    api.req("POST", "/Branding/Splashscreen", data=base64.b64encode(data), ctype="image/png", raw=True)


def set_splash(api, want, dry):
    ours, cur = read_bytes(SPLASH_FILE), current_splash(api)
    same = cur is not None and ours is not None and cur == ours
    if want:
        if ours is None:
            print("  login background: assets/splash.png missing, skipped"); return
        if same:
            if not dry and not os.path.exists(SPLASH_MARK):   # remember it is ours, so a later version replaces it cleanly
                os.makedirs(BACKUP_DIR, exist_ok=True)
                open(SPLASH_MARK, "w").close()
            print("  login background: up to date"); return
        if dry:
            print("  login background (dry run): would upload assets/splash.png"); return
        if cur is not None and not os.path.exists(SPLASH_MARK) and not os.path.exists(SPLASH_ORIG_NOTE):
            os.makedirs(BACKUP_DIR, exist_ok=True)
            p = os.path.join(BACKUP_DIR, "splashscreen-before-glassjelly-%s.img" % time.strftime("%Y%m%d-%H%M%SZ", time.gmtime()))
            with open(p, "wb") as f:
                f.write(cur)
            with open(SPLASH_ORIG_NOTE, "w", encoding="utf-8") as f:
                f.write(os.path.basename(p) + "\n")
            print("  login background: the previous custom image is saved as %s" % os.path.relpath(p, HERE))
        upload_splash(api, ours)
        os.makedirs(BACKUP_DIR, exist_ok=True)
        open(SPLASH_MARK, "w").close()
        print("  login background: assets/splash.png uploaded")
        return
    if not same:   # ours is not active (never installed, or replaced in the dashboard since): leave it alone
        if os.path.exists(SPLASH_MARK) and not dry:
            os.remove(SPLASH_MARK)
        return
    if dry:
        print("  login background (dry run): would be reverted"); return
    orig = None
    if os.path.exists(SPLASH_ORIG_NOTE):
        orig = read_bytes(os.path.join(BACKUP_DIR, read_text(SPLASH_ORIG_NOTE).strip()))
    if orig:
        upload_splash(api, orig)
        os.remove(SPLASH_ORIG_NOTE)
        print("  login background: the previous custom image is back")
    else:
        api.req("DELETE", "/Branding/Splashscreen", raw=True)
        print("  login background: removed (Jellyfin's own is used again)")
    try:
        os.remove(SPLASH_MARK)
    except OSError:
        pass


# ---------- verify ----------
def verify(api, expect_theme, expect, had_sub_rule):
    ok = True
    css = api.req("GET", "/Branding/Css", auth=False, raw=True)
    if (BEGIN in css) != expect_theme:
        print("  ! /Branding/Css: theme present=%s, expected %s" % (BEGIN in css, expect_theme)); ok = False
    for b, _ in LEGACY_BLOCKS:
        if b in css:
            print("  ! /Branding/Css still contains the v1 theme block"); ok = False
    if had_sub_rule and ".videoSubtitlesInner" not in css:
        print("  ! your subtitle rule went missing from Custom CSS"); ok = False
    if expect:
        html = api.req("GET", "/web/index.html", auth=False, raw=True)
        scripts = re.findall(r"<script\b.*?</script>", html, flags=re.S | re.I)
        for marker, want in expect.items():
            n = html.count(marker) if marker == EARLY_MARK else sum(1 for s in scripts if marker in s)
            if (n > 0) != want:
                print("  note: index.html %s present=%s, expected %s (File Transformation can need a Jellyfin restart "
                      "to pick up changes)" % (marker, n > 0, want))
            elif want and n != 1:
                print("  ! index.html has %d copies of %s, expected 1" % (n, marker)); ok = False
    print("  verify: %s" % ("OK" if ok else "PROBLEMS (see above)"))
    return ok


def main():
    ap = argparse.ArgumentParser(description="Install / update / remove the GlassJelly Jellyfin theme",
                                 formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split("What it writes")[0])
    ap.add_argument("--url", default=os.environ.get("JF_URL", "http://localhost:8096"), help="Jellyfin address (default %(default)s)")
    ap.add_argument("--api-key", help="admin API key (Dashboard > API Keys); otherwise JF_API_KEY or a login prompt")
    ap.add_argument("--dry-run", action="store_true", help="show the changes, write nothing")
    ap.add_argument("--uninstall", action="store_true", help="remove the theme, its scripts and its login background")
    ap.add_argument("--restore", metavar="BACKUP_JSON", help="put back a branding backup from ./backups")
    ap.add_argument("--cdn", nargs="?", const="latest", metavar="REF",
                    help="load the CSS from jsDelivr (@import) instead of pasting it; REF = tag, e.g. v2.0.0 (default latest)")
    ap.add_argument("--no-font", action="store_true", help="system fonts only (no Inter from jsDelivr)")
    ap.add_argument("--no-logo", action="store_true", help="keep Jellyfin's logo and server name, favicon and login background")
    ap.add_argument("--no-splash", action="store_true", help="keep your login background")
    ap.add_argument("--no-ambient", action="store_true", help="no blurred-artwork background (graphite canvas only)")
    ap.add_argument("--no-dashboard", action="store_true", help="leave the admin dashboard stock")
    ap.add_argument("--no-backdrops-default", action="store_true", help="do not switch Backdrops on for new devices")
    ap.add_argument("--no-skip-dock", action="store_true", help="leave Skip Intro where Jellyfin puts it")
    ap.add_argument("--no-hover-light", action="store_true", help="hover highlights stay centred (no cursor-following script)")
    a = ap.parse_args()

    if not a.uninstall and not a.restore and not os.path.exists(THEME_FILE):
        die("dist/glassjelly.css is missing - run this from a full copy of the repository")
    api = connect(a)
    cur = api.req("GET", "/System/Configuration/branding")
    old = cur.get("CustomCss") or ""
    had_sub_rule = ".videoSubtitlesInner" in old
    theme = read_text(THEME_FILE) if os.path.exists(THEME_FILE) else ""
    if a.no_logo and theme:
        theme = strip_logo(theme)
    cdn = None
    if a.cdn:
        cdn = "https://cdn.jsdelivr.net/gh/%s@%s/dist/%s" % (REPO, a.cdn, "glassjelly-nologo.css" if a.no_logo else "glassjelly.css")

    if a.restore:
        target = json.loads(read_text(a.restore))
        new = target.get("CustomCss") or ""
        new_obj = dict(cur)
        new_obj.update({k: target[k] for k in ("CustomCss", "LoginDisclaimer", "SplashscreenEnabled") if k in target})
        action = "restore " + a.restore
    elif a.uninstall:
        new = strip_ours(old) + "\n"; new_obj = dict(cur, CustomCss=new); action = "uninstall"
    else:
        new = build_css(old, theme, not a.no_font, cdn); new_obj = dict(cur, CustomCss=new)
        action = "install" + (" (CDN: %s)" % cdn if cdn else "")
    ver = (re.search(r'--gj-version:\s*"([^"]+)"', theme) or [None, "?"])[1]
    print("GlassJelly %s: %s" % (ver, action))
    print("  Custom CSS: %d -> %d chars%s" % (len(old), len(new), " (unchanged)" if new == old else ""))
    if a.dry_run:
        diff = list(difflib.unified_diff(old.splitlines(), new.splitlines(), "current", "new", lineterm="", n=1))
        print("\n".join(diff[:60]) + ("\n  ... (%d more diff lines)" % (len(diff) - 60) if len(diff) > 60 else ""))
    elif new != old or a.restore:
        p = backup("branding", cur)
        api.req("POST", "/System/Configuration/branding", new_obj)
        print("  branding saved (backup: %s)" % os.path.relpath(p, HERE))

    expect = {}
    if not a.restore:
        on = not a.uninstall
        o = {"backdrops": on and not a.no_backdrops_default, "ambient": on and not a.no_ambient,
             "logo": on and not a.no_logo, "player": on and not a.no_skip_dock, "hover": on and not a.no_hover_light,
             "dashboard": on and not a.no_dashboard}
        label = " + ".join(n for n in ("backdrops", "ambient", "favicon", "player", "hover") if o["logo" if n == "favicon" else n]) or "none"
        has_ft = set_transformations(api, [(THEME_ID, theme_js(o), label, "</body>"),
                                           (DASHBOARD_ID, (script("dashboard") + "</body>") if o["dashboard"] else None, "dashboard", "</body>"),
                                           (EARLY_ID, early_head(theme, o["logo"]), "early logo", "</head>")], a.dry_run)
        if not has_ft and on:
            print("  File Transformation plugin not installed: CSS-only theme (no ambient background, stock dashboard).\n"
                  "  Add it from https://www.iamparadox.dev/jellyfin/plugins/manifest.json and run this again for the full theme.")
        if has_ft:
            expect = {"__gjBackdrops": o["backdrops"], "__gjAmbient": o["ambient"], "__gjLogo": o["logo"],
                      "__gjSkipDock": o["player"], "__gjHover": o["hover"], "__gjDashCss": o["dashboard"], EARLY_MARK: o["logo"]}
        set_splash(api, o["logo"] and not a.no_splash, a.dry_run)
    if not a.dry_run:
        verify(api, BEGIN in new, expect, had_sub_rule)
        print("Done. Reload Jellyfin in the browser (Ctrl+F5 / Cmd+Shift+R); on phones close and reopen the app.")


if __name__ == "__main__":
    main()
