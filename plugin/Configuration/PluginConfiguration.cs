using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.GlassJelly.Configuration;

/// <summary>Settings of the GlassJelly plugin. Read on every index.html request, so changes apply on the next reload.</summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Master switch: when off, index.html is served untouched.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>The glass logo (header, splash, favicon). Off = the stylesheet without the logo block, Jellyfin's own logo.</summary>
    public bool Logo { get; set; } = true;

    /// <summary>Ambient background: the current item's art, blurred, behind the whole UI.</summary>
    public bool Ambient { get; set; } = true;

    /// <summary>Turns backdrops on once per device for users who never chose (the theme is built around them).</summary>
    public bool BackdropsDefault { get; set; } = true;

    /// <summary>Hover light that follows the pointer, and no hover flashes while the page scrolls.</summary>
    public bool Hover { get; set; } = true;

    /// <summary>Video player tweaks (Skip Intro docked into the glass control bar).</summary>
    public bool Player { get; set; } = true;

    /// <summary>Subtitles rise above the player controls while they are visible, and the Subtitle Appearance dialog
    /// applies to every subtitle type. Off by default: it sets every user's subtitle styling to "Custom".</summary>
    public bool SubtitleLift { get; set; }

    /// <summary>Canvas colour: graphite (the stylesheet's own), midnight, ocean, forest, plum, wine, espresso, oled or
    /// custom (<see cref="BackgroundColor"/>). Also tints the dark glass of menus and dialogs.</summary>
    public string Background { get; set; } = "graphite";

    /// <summary>The custom background, #rrggbb: only its hue and saturation are used, the canvas stays dark.</summary>
    public string BackgroundColor { get; set; } = "#1e3a5f";

    /// <summary>Accent: white (the stylesheet's own), blue, indigo, purple, pink, red, orange, yellow, green, teal or
    /// custom (<see cref="AccentColor"/>). Fills progress bars, sliders, checkboxes and the Save / Sign In buttons.</summary>
    public string Accent { get; set; } = "white";

    /// <summary>The custom accent, #rrggbb.</summary>
    public string AccentColor { get; set; } = "#0a84ff";

    /// <summary>Ambient background strength: subtle, normal or vivid.</summary>
    public string AmbientStrength { get; set; } = "normal";
}
