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

    /// <summary>Before &lt;/head&gt;: the glass logo as favicon and the startup screen (splash logo + Media Bar loader), so the
    /// first frame is already themed. Only with the logo on (the same as install.py's transform ...0004).</summary>
    public static string HeadHtml(PluginConfiguration config)
    {
        if (!config.Logo)
        {
            return string.Empty;
        }

        Match logo = LogoRegex().Match(Read(Stylesheets["glassjelly.css"]));
        if (!logo.Success)
        {
            return string.Empty;
        }

        string uri = logo.Groups[1].Value;
        string early = CommentRegex().Replace(Read("GlassJelly.css.early.css"), string.Empty).Replace("\n", string.Empty).Replace("\r", string.Empty);
        return "<link rel=\"icon\" type=\"image/svg+xml\" href=\"" + uri + "\"><style id=\"gj-early\">"
            + ".splashLogo{background-image:url(\"" + uri + "\")!important;background-size:min(112px,100%) auto!important}"
            + early + "</style>";
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
