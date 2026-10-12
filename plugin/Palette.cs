using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.GlassJelly.Configuration;

namespace Jellyfin.Plugin.GlassJelly;

/// <summary>
/// The colour options: a background (canvas + the dark ink of the glass, menus and dialogs), an accent and the strength
/// of the ambient background. They only override the source tokens of the stylesheet (section 1), so the defaults
/// (Graphite, White, Normal) emit nothing and the theme renders exactly as built. A background keeps the canvas dark
/// whatever colour is picked: only its hue and saturation are used, the lightness of every tone is the Graphite one.
/// </summary>
public static partial class Palette
{
    public const string Custom = "custom";

    /// <summary>Background presets: hue (degrees) and saturation (0..1) of the canvas. Graphite is the stylesheet's own.</summary>
    public static readonly IReadOnlyDictionary<string, (double Hue, double Sat)> Backgrounds = new Dictionary<string, (double, double)>(StringComparer.OrdinalIgnoreCase)
    {
        ["graphite"] = (230, .14),
        ["midnight"] = (220, .42),
        ["ocean"] = (192, .38),
        ["forest"] = (150, .24),
        ["plum"] = (282, .28),
        ["wine"] = (340, .30),
        ["espresso"] = (24, .24),
        ["oled"] = (0, 0),
    };

    /// <summary>Accent presets (Apple's dark-mode system colours). White is the stylesheet's own.</summary>
    public static readonly IReadOnlyDictionary<string, string> Accents = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["white"] = "#ffffff",
        ["blue"] = "#0a84ff",
        ["indigo"] = "#5e5ce6",
        ["purple"] = "#bf5af2",
        ["pink"] = "#ff375f",
        ["red"] = "#ff453a",
        ["orange"] = "#ff9f0a",
        ["yellow"] = "#ffd60a",
        ["green"] = "#30d158",
        ["teal"] = "#40c8e0",
    };

    /// <summary>Ambient strength: brightness and saturation of the blurred artwork (Normal = the stylesheet's .42 / 1.4).</summary>
    public static readonly IReadOnlyDictionary<string, (double Brightness, double Saturate)> Ambients = new Dictionary<string, (double, double)>(StringComparer.OrdinalIgnoreCase)
    {
        ["subtle"] = (.30, 1.15),
        ["normal"] = (.42, 1.4),
        ["vivid"] = (.54, 1.7),
    };

    /// <summary>The token overrides for the head, or "" when every option is at its default.</summary>
    public static string Css(PluginConfiguration config)
    {
        StringBuilder css = new();
        AppendBackground(css, config);
        AppendAccent(css, config);
        AppendAmbient(css, config);
        // ":not(#gj)" = one id of weight: beats the stylesheet's ":root, html[data-theme]" although it comes first
        return css.Length == 0 ? string.Empty : "html:not(#gj){" + css + "}";
    }

    /// <summary>True when a colour accent is in use (the stylesheet's section 21u keys on html[data-gj-accent]).</summary>
    public static bool HasAccent(PluginConfiguration config) => AccentHex(config) is not null;

    private static void AppendBackground(StringBuilder css, PluginConfiguration config)
    {
        string id = config.Background ?? "graphite";
        if (id.Equals("oled", StringComparison.OrdinalIgnoreCase))
        {
            Token(css, "canvas-top", "#060607");
            Token(css, "canvas-bottom", "#000");
            Token(css, "canvas-lift", "rgba(255,255,255,.025)");
            Token(css, "bg", "#000");
            Token(css, "bg-rgb", "0,0,0");
            Token(css, "ink-deep", "0,0,0");
            Token(css, "ink", "18,18,20");
            Token(css, "ink-raised", "34,34,36");
            Token(css, "ink-hover", "64,64,68");
            Token(css, "surface-1", "#121214");
            Token(css, "surface-2", "#1f1f22");
            Token(css, "surface-3", "#2c2c2e");
            Token(css, "ambient-wash", "linear-gradient(rgba(0,0,0,.22),rgba(0,0,0,.22))");
            css.Append("--jf-palette-background-defaultChannel:0 0 0;--jf-palette-background-paperChannel:18 18 20;");
            return;
        }

        double hue, sat;
        if (id.Equals(Custom, StringComparison.OrdinalIgnoreCase))
        {
            if (ParseHex(config.BackgroundColor) is not { } rgb)
            {
                return;
            }

            (hue, sat, _) = ToHsl(rgb);
            sat = Math.Min(sat, .6);   // a fully saturated pick would glow; the canvas stays a tinted dark
        }
        else if (!id.Equals("graphite", StringComparison.OrdinalIgnoreCase) && Backgrounds.TryGetValue(id, out var preset))
        {
            (hue, sat) = preset;
        }
        else
        {
            return;
        }

        // the lightness of each tone is the Graphite one (canvas #15161b / #0d0e12, ink 10/26/40/72, surfaces #1c1c1e...)
        var bottom = Hsl(hue, sat * 1.1, .061);
        var paper = Hsl(hue, sat * .5, .114);
        Token(css, "canvas-top", Hex(Hsl(hue, sat, .094)));
        Token(css, "canvas-bottom", Hex(bottom));
        Token(css, "canvas-lift", "rgba(" + Channels(Hsl(hue, Math.Min(sat * 2.6, .7), .70), ",") + ",.075)");
        Token(css, "bg", Hex(bottom));
        Token(css, "bg-rgb", Channels(bottom, ","));
        Token(css, "ink-deep", Channels(Hsl(hue, sat * .9, .047), ","));
        Token(css, "ink", Channels(Hsl(hue, sat * .75, .114), ","));
        Token(css, "ink-raised", Channels(Hsl(hue, sat * .5, .165), ","));
        Token(css, "ink-hover", Channels(Hsl(hue, sat * .4, .294), ","));
        Token(css, "surface-1", Hex(paper));
        Token(css, "surface-2", Hex(Hsl(hue, sat * .4, .176)));
        Token(css, "surface-3", Hex(Hsl(hue, sat * .35, .23)));
        // the artwork behind Home / details would hide the canvas: a veil of the colour over it carries the choice there
        string wash = Channels(Hsl(hue, Math.Min(sat * 1.6, .75), .30), ",");
        Token(css, "ambient-wash", "linear-gradient(180deg,rgba(" + wash + ",.34),rgba(" + wash + ",.20))");
        css.Append("--jf-palette-background-defaultChannel:").Append(Channels(bottom, " "))
            .Append(";--jf-palette-background-paperChannel:").Append(Channels(paper, " ")).Append(';');
    }

    private static string? AccentHex(PluginConfiguration config)
    {
        string id = config.Accent ?? "white";
        string? hex = id.Equals(Custom, StringComparison.OrdinalIgnoreCase) ? config.AccentColor
            : Accents.TryGetValue(id, out string? preset) ? preset : null;
        return ParseHex(hex) is { } rgb && rgb != (255, 255, 255) ? Hex(rgb) : null;
    }

    private static void AppendAccent(StringBuilder css, PluginConfiguration config)
    {
        if (AccentHex(config) is not { } hex || ParseHex(hex) is not { } rgb)
        {
            return;
        }

        // dark label on light colours (yellow, orange, green, teal), white on the rest, like iOS
        bool light = Luminance(rgb) > .4;
        Token(css, "accent", hex);
        Token(css, "accent-channel", Channels(rgb, " "));
        Token(css, "on-accent", light ? "#000" : "#fff");
        Token(css, "accent-hover", Hex(Mix(rgb, light ? (0, 0, 0) : (255, 255, 255), .12)));
        Token(css, "accent-dark", Hex(Mix(rgb, (0, 0, 0), .18)));
    }

    private static void AppendAmbient(StringBuilder css, PluginConfiguration config)
    {
        string id = config.AmbientStrength ?? "normal";
        if (id.Equals("normal", StringComparison.OrdinalIgnoreCase) || !Ambients.TryGetValue(id, out var a))
        {
            return;
        }

        Token(css, "ambient-brightness", a.Brightness.ToString(CultureInfo.InvariantCulture));
        Token(css, "ambient-saturate", a.Saturate.ToString(CultureInfo.InvariantCulture));
    }

    private static void Token(StringBuilder css, string name, string value) => css.Append("--gj-").Append(name).Append(':').Append(value).Append(';');

    public static (int R, int G, int B)? ParseHex(string? hex)
    {
        if (hex is null || !HexRegex().IsMatch(hex.Trim()))
        {
            return null;
        }

        int v = int.Parse(hex.Trim().TrimStart('#'), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
        return ((v >> 16) & 255, (v >> 8) & 255, v & 255);
    }

    private static string Hex((int R, int G, int B) c) => string.Create(CultureInfo.InvariantCulture, $"#{c.R:x2}{c.G:x2}{c.B:x2}");

    private static string Channels((int R, int G, int B) c, string separator) => string.Join(separator, c.R, c.G, c.B);

    private static (int R, int G, int B) Mix((int R, int G, int B) a, (int R, int G, int B) b, double t)
        => ((int)Math.Round(a.R + ((b.R - a.R) * t)), (int)Math.Round(a.G + ((b.G - a.G) * t)), (int)Math.Round(a.B + ((b.B - a.B) * t)));

    private static double Luminance((int R, int G, int B) c)
    {
        static double Lin(int v)
        {
            double s = v / 255.0;
            return s <= .04045 ? s / 12.92 : Math.Pow((s + .055) / 1.055, 2.4);
        }

        return (.2126 * Lin(c.R)) + (.7152 * Lin(c.G)) + (.0722 * Lin(c.B));
    }

    private static (double H, double S, double L) ToHsl((int R, int G, int B) c)
    {
        double r = c.R / 255.0, g = c.G / 255.0, b = c.B / 255.0;
        double max = Math.Max(r, Math.Max(g, b)), min = Math.Min(r, Math.Min(g, b)), l = (max + min) / 2, d = max - min;
        if (d < 1e-9)
        {
            return (0, 0, l);
        }

        double s = l > .5 ? d / (2 - max - min) : d / (max + min);
        double h = max == r ? ((g - b) / d) + (g < b ? 6 : 0) : max == g ? ((b - r) / d) + 2 : ((r - g) / d) + 4;
        return (h * 60, s, l);
    }

    private static (int R, int G, int B) Hsl(double h, double s, double l)
    {
        s = Math.Clamp(s, 0, 1);
        double c = (1 - Math.Abs((2 * l) - 1)) * s, x = c * (1 - Math.Abs((h / 60 % 2) - 1)), m = l - (c / 2);
        (double r, double g, double b) = (h % 360) switch
        {
            < 60 => (c, x, 0d),
            < 120 => (x, c, 0d),
            < 180 => (0d, c, x),
            < 240 => (0d, x, c),
            < 300 => (x, 0d, c),
            _ => (c, 0d, x),
        };
        return ((int)Math.Round((r + m) * 255), (int)Math.Round((g + m) * 255), (int)Math.Round((b + m) * 255));
    }

    [GeneratedRegex("^#?[0-9a-fA-F]{6}$")]
    private static partial Regex HexRegex();
}
