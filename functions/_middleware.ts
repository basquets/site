// Host-based router for the single Cloudflare Pages project that serves BOTH
// basquets.xyz (coming-soon landing + public docs/blog) and app.basquets.xyz
// (the working product). Both custom domains point at the same static bundle;
// this middleware decides, per host, what is served vs. redirected.
//
// See docs/superpowers/specs/2026-07-24-app-subdomain-split-design.md (private
// core repo). Runs on Cloudflare Pages Functions; `astro dev` does NOT execute
// it, so local dev serves every route directly.

const ROOT_HOST = "basquets.xyz";
const APP_HOST = "app.basquets.xyz";

// Docs and blog stay canonical on the root domain.
// Paths that stay canonical on the root domain: public docs/blog, plus the
// coming-soon subpages (e.g. /basket). Root serves them; the app host redirects
// them back to root.
function isContentPath(path: string): boolean {
  return (
    path === "/docs" ||
    path.startsWith("/docs/") ||
    path === "/blog" ||
    path.startsWith("/blog/") ||
    path === "/basket" ||
    path === "/join"
  );
}

// Static and generated files must load on any host, so the coming-soon page and
// every app page can pull their own CSS/fonts/images. Runs before host logic.
function isAsset(path: string): boolean {
  if (path.startsWith("/_astro/")) return true;
  if (path === "/robots.txt") return true;
  if (path.startsWith("/sitemap")) return true; // sitemap-index.xml, sitemap-0.xml
  return /\.[a-z0-9]+$/i.test(path); // favicon.svg, og.png, *.woff2, ...
}

function to(host: string, path: string, search: string): Response {
  return Response.redirect(`https://${host}${path}${search}`, 302);
}

interface Context {
  request: Request;
  next: () => Promise<Response>;
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, next } = context;
  const url = new URL(request.url);
  const host = url.hostname;
  const path = url.pathname;

  if (isAsset(path)) return next();

  if (host === APP_HOST) {
    if (path === "/") return to(APP_HOST, "/baskets", url.search); // app-first entry
    if (isContentPath(path)) return to(ROOT_HOST, path, url.search); // canonical on root
    return next();
  }

  if (host === ROOT_HOST || host === `www.${ROOT_HOST}`) {
    if (path === "/" || isContentPath(path)) return next();
    return to(APP_HOST, path, url.search); // app routes live on the subdomain
  }

  // Preview deploys (*.pages.dev) and anything else: serve unchanged.
  return next();
}
