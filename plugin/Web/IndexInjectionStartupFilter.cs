using System.Text;
using Jellyfin.Plugin.GlassJelly.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.GlassJelly.Web;

/// <summary>
/// Adds the theme to jellyfin-web's index.html at request time: middleware registered through IStartupFilter runs ahead
/// of the static file handler, buffers the index.html response and inserts the head / body snippets of
/// <see cref="ThemeAssets"/>. Jellyfin 12 has no injection hook of its own, and this needs neither the File
/// Transformation plugin nor a writable web folder. Defensive: only the web index.html (GET, 200, text/html) is touched,
/// it is idempotent (the "gj-theme" marker), and any error serves the original page unchanged.
/// </summary>
public class IndexInjectionStartupFilter : IStartupFilter
{
    private const string Marker = "id=\"gj-theme\"";
    private readonly ILogger<IndexInjectionStartupFilter> _logger;
    private int _loggedOnce;

    public IndexInjectionStartupFilter(ILogger<IndexInjectionStartupFilter> logger)
    {
        _logger = logger;
    }

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            // outermost, so dropping Accept-Encoding below reliably gives an uncompressed body to rewrite
            app.Use(InvokeAsync);
            next(app);
        };
    }

    private async Task InvokeAsync(HttpContext context, Func<Task> next)
    {
        string? path = context.Request.Path.Value;
        PluginConfiguration? config = Plugin.Instance?.Configuration;
        if (!HttpMethods.IsGet(context.Request.Method) || !IsIndexRequest(path) || config is null || !config.Enabled)
        {
            await next().ConfigureAwait(false);
            return;
        }

        // a complete, plain 200 to rewrite: no compression, no partial content, no 304 from a stale validator
        context.Request.Headers.Remove("Accept-Encoding");
        context.Request.Headers.Remove("Range");
        context.Request.Headers.Remove("If-Range");
        context.Request.Headers.Remove("If-None-Match");
        context.Request.Headers.Remove("If-Modified-Since");

        Stream originalBody = context.Response.Body;
        using MemoryStream buffer = new();
        context.Response.Body = buffer;
        try
        {
            await next().ConfigureAwait(false);
        }
        catch
        {
            context.Response.Body = originalBody;
            throw;
        }

        context.Response.Body = originalBody;
        buffer.Seek(0, SeekOrigin.Begin);

        bool isHtml = context.Response.StatusCode == StatusCodes.Status200OK
            && (context.Response.ContentType?.Contains("text/html", StringComparison.OrdinalIgnoreCase) ?? false);
        if (!isHtml)
        {
            await buffer.CopyToAsync(originalBody).ConfigureAwait(false);
            return;
        }

        string html;
        using (StreamReader reader = new(buffer, Encoding.UTF8, true, 4096, leaveOpen: true))
        {
            html = await reader.ReadToEndAsync().ConfigureAwait(false);
        }

        try
        {
            if (!html.Contains(Marker, StringComparison.Ordinal))
            {
                html = Inject(html, config, UrlPrefix(path!));
                if (Interlocked.Exchange(ref _loggedOnce, 1) == 0)
                {
                    _logger.LogInformation("GlassJelly: theme injected into index.html");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GlassJelly: injection failed, serving the original index.html");
        }

        byte[] bytes = Encoding.UTF8.GetBytes(html);
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.ContentLength = bytes.Length;
        context.Response.Headers.Remove("ETag");
        context.Response.Headers.Remove("Last-Modified");
        context.Response.Headers.Remove("Accept-Ranges");
        // the page now depends on the plugin settings: never let a browser keep an old copy
        context.Response.Headers.CacheControl = "no-cache";
        await originalBody.WriteAsync(bytes).ConfigureAwait(false);
    }

    private static string Inject(string html, PluginConfiguration config, string urlPrefix)
    {
        string head = ThemeAssets.HeadHtml(config);
        int headClose = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        if (head.Length > 0 && headClose >= 0)
        {
            html = html.Insert(headClose, head);
        }

        int bodyClose = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return bodyClose >= 0 ? html.Insert(bodyClose, ThemeAssets.BodyHtml(config, urlPrefix)) : html;
    }

    // "/web", "/web/" and "/web/index.html", also under a base URL ("/jellyfin/web/")
    private static bool IsIndexRequest(string? path)
    {
        return path is not null
            && (path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
                || path.EndsWith("/web", StringComparison.OrdinalIgnoreCase));
    }

    // the base URL in front of "/web" ("" normally, "/jellyfin" behind a sub-path proxy)
    private static string UrlPrefix(string path)
    {
        int web = path.LastIndexOf("/web", StringComparison.OrdinalIgnoreCase);
        return web > 0 ? path[..web] : string.Empty;
    }
}
