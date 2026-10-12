using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.GlassJelly.Configuration;

namespace Jellyfin.Plugin.GlassJelly;

/// <summary>
/// The theme files embedded in the plugin (dist/*.css, src/early.css, src/js/*.js) and the HTML
/// snippets built from them. Everything is read once; the stylesheet URLs carry a content hash so browsers cache them
/// for good and pick up a new version as soon as the plugin is updated.
/// </summary>
public static partial class ThemeAssets
{
    private static readonly Assembly _assembly = typeof(ThemeAssets).Assembly;
    private static readonly Dictionary<string, string> _cache = new(StringComparer.Ordinal);
    private static readonly object _lock = new();

    /// <summary>Stylesheets served by the controller, by published file name.</summary>
    public static readonly IReadOnlyDictionary<string, string> Stylesheets = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["glassjelly.css"] = "GlassJelly.css.glassjelly.css",
        ["glassjelly-nologo.css"] = "GlassJelly.css.glassjelly-nologo.css",
    };

    public static string Read(string resourceName)
    {
        lock (_lock)
        {
            if (_cache.TryGetValue(resourceName, out string? text))
            {
                return text;
            }

            using Stream stream = _assembly.GetManifestResourceStream(resourceName)
                ?? throw new FileNotFoundException("embedded resource missing: " + resourceName);
            using StreamReader reader = new(stream, Encoding.UTF8);
            text = reader.ReadToEnd();
            _cache[resourceName] = text;
            return text;
        }
    }

    public static string Hash(string resourceName)
    {
        string key = "hash:" + resourceName;
        lock (_lock)
        {
            if (_cache.TryGetValue(key, out string? hash))
            {
                return hash;
            }
        }

        string value = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Read(resourceName))))[..12].ToLowerInvariant();
        lock (_lock)
        {
            _cache[key] = value;
        }

        return value;
    }

    /// <summary>Before &lt;/head&gt;: the colour options (<see cref="Palette"/>), then the glass logo as favicon and the startup
    /// screen (splash logo + Media Bar loader), so the first frame is already themed. The logo part only with the logo on
    /// (the same as install.py's transform ...0004).</summary>
    public static string HeadHtml(PluginConfiguration config)
    {
        StringBuilder html = new();
        string palette = Palette.Css(config);
        if (palette.Length > 0)
        {
            html.Append("<style id=\"gj-palette\">").Append(palette).Append("</style>");
        }

        // html.gj-lens = a Chromium that can refract (stylesheet 21v): the header lens on touch screens too. Not on iOS,
        // where every browser is WebKit ("CriOS" / "EdgiOS" carry no "Chrome/")
        html.Append("<script>(function(d){var u=navigator.userAgent;if(/Chrome\\//.test(u)&&!/iPhone|iPad|iPod/.test(u)&&window.CSS&&CSS.supports('backdrop-filter','url(#a)'))d.classList.add('gj-lens');")
            .Append(Palette.HasAccent(config) ? "d.setAttribute('data-gj-accent','');" : string.Empty)
            .Append("})(document.documentElement)</script>");

        Match logo = config.Logo ? LogoRegex().Match(Read(Stylesheets["glassjelly.css"])) : Match.Empty;
        if (logo.Success)
        {
            string uri = logo.Groups[1].Value;
            string early = CommentRegex().Replace(Read("GlassJelly.css.early.css"), string.Empty).Replace("\n", string.Empty).Replace("\r", string.Empty);
            html.Append("<link rel=\"icon\" type=\"image/svg+xml\" href=\"").Append(uri).Append("\"><style id=\"gj-early\">")
                .Append(".splashLogo{background-image:url(\"").Append(uri).Append("\")!important;background-size:min(112px,100%) auto!important}")
                .Append(early).Append("</style>");
        }

        return html.ToString();
    }

    /// <summary>Before &lt;/body&gt;: the stylesheet (after #reactRoot, so it comes after Jellyfin's theme.css and wins the
    /// cascade exactly like the Branding CSS did) and the theme scripts, inline, in the order install.py used.</summary>
    public static string BodyHtml(PluginConfiguration config, string urlPrefix)
    {
        string file = config.Logo ? "glassjelly.css" : "glassjelly-nologo.css";
        StringBuilder html = new();
        html.Append("<link rel=\"stylesheet\" id=\"gj-theme\" href=\"").Append(urlPrefix).Append("/GlassJelly/").Append(file)
            .Append("?v=").Append(Hash(Stylesheets[file])).Append("\">");

        (string Name, bool On)[] scripts =
        {
            ("backdrops", config.BackdropsDefault),
            ("ambient", config.Ambient),
            ("favicon", config.Logo),
            ("player", config.Player),
            ("hover", config.Hover),
            ("sublift", config.SubtitleLift),
        };
        foreach ((string name, bool on) in scripts)
        {
            if (on)
            {
                html.Append("<script>\n").Append(Read("GlassJelly.js." + name + ".js").Trim()).Append("\n</script>");
            }
        }

        return html.ToString();
    }

    [GeneratedRegex("--gj-logo:\\s*url\\(\"(data:image/svg\\+xml,[^\"]+)\"\\)")]
    private static partial Regex LogoRegex();

    [GeneratedRegex("/\\*[\\s\\S]*?\\*/")]
    private static partial Regex CommentRegex();
}
