using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.GlassJelly.Api;

/// <summary>Serves the theme stylesheet. Anonymous: the login page and the startup screen need it before anyone signs in.</summary>
[ApiController]
[Route("GlassJelly")]
public class GlassJellyController : ControllerBase
{
    [HttpGet("{file}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult GetStylesheet([FromRoute] string file, [FromQuery] string? v)
    {
        if (!ThemeAssets.Stylesheets.TryGetValue(file, out string? resource))
        {
            return NotFound();
        }

        // the URL in index.html carries the content hash: a matching one can be cached for good
        Response.Headers.CacheControl = v == ThemeAssets.Hash(resource) ? "public, max-age=31536000, immutable" : "no-cache";
        return Content(ThemeAssets.Read(resource), "text/css; charset=utf-8", Encoding.UTF8);
    }
}
