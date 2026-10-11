using Jellyfin.Plugin.GlassJelly.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.GlassJelly;

/// <summary>
/// GlassJelly: the Liquid Glass theme for jellyfin-web, as a plugin. It serves the theme stylesheet and scripts from
/// /GlassJelly/* and adds them to the web app's index.html at request time (see <see cref="Web.IndexInjectionStartupFilter"/>);
/// nothing is written to Branding or to the web folder, so uninstalling the plugin removes the theme completely.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "GlassJelly";

    public override Guid Id => Guid.Parse("b3a397c3-d76f-4a9a-8980-3ad430af041f");

    public override string Description => "Liquid Glass theme for the Jellyfin web client.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = "GlassJelly.configPage.html"
            }
        };
    }
}
