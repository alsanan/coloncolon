const CACHE_NAME = 'html-fragments-v2';

// ⚠️ Atenció: com els atributs :include no són vàlids HTML estàndard,
// els navegadors no els renderitzen ni apareixen al DOM estàtic.
// Però en aquest cas tractem el document com a text → podem detectar-los igual.
const INCLUDE_REGEX = /<([a-zA-Z0-9\-]+)\s+[^>]*?:include="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => res.text())
        .then(html => processIncludes(html, event.request.url))
        .then(finalHtml => new Response(finalHtml, {
          headers: { 'Content-Type': 'text/html' },
        }))
        .catch(err => {
          console.error('SW Fallback error:', err);
          return fetch(event.request); // fallback directe si tot falla
        })
    );
  }
});

async function processIncludes(html, baseUrl) {
  let match;
  while ((match = INCLUDE_REGEX.exec(html)) !== null) {
    const [fullTag, tagName, src, projectedContent] = match;

    // Salta si conté inert
    if (/inert/i.test(fullTag)) continue;

    const includeUrl = new URL(src, baseUrl).href;

    let fragmentHtml = '';
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(includeUrl);
      if (cached) {
        fragmentHtml = await cached.text();
      } else {
        const res = await fetch(includeUrl);
        const clone = res.clone();
        fragmentHtml = await res.text();
        cache.put(includeUrl, clone);
      }

      // Substitució recursiva
      fragmentHtml = await processIncludes(fragmentHtml, includeUrl);

      const wrapped = `
<${tagName} :include="${src}">
${fragmentHtml}
</${tagName}>`;

      html = html.replace(fullTag, wrapped);
      INCLUDE_REGEX.lastIndex = 0;
    } catch (err) {
      console.error('SW error processing include:', err);
      const fallback = `<p style="color:red;">⚠️ Error carregant: ${src}</p>`;
      html = html.replace(fullTag, fallback);
      INCLUDE_REGEX.lastIndex = 0;
    }
  }

  return html;
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
