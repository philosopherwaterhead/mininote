const CACHE_NAME = "mininote-v2"
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/app-icon.svg",
  "/favicon.svg",
]

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL)
        await cacheDiscoveredAssets(cache)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request

  if (request.method !== "GET") return
  if (new URL(request.url).origin !== location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      caches
        .match("/")
        .then((cached) => {
          event.waitUntil(refreshAppShell())

          if (cached) return cached

          return fetchAndCache(request, "/")
        })
    )

    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetchAndCache(request)
    })
  )
})

async function cacheDiscoveredAssets(cache) {
  const response = await fetch("/", {
    cache: "no-store",
  })

  if (!response.ok) return

  const html = await response.text()
  const assetUrls = new Set(APP_SHELL)
  const matches = html.matchAll(
    /(?:href|src)="([^"]+)"/g
  )

  for (const match of matches) {
    const url = new URL(match[1], location.origin)

    if (url.origin === location.origin) {
      assetUrls.add(url.pathname)
    }
  }

  await cache.addAll([...assetUrls])
}

async function refreshAppShell() {
  try {
    const cache = await caches.open(CACHE_NAME)

    await cache.addAll(APP_SHELL)
    await cacheDiscoveredAssets(cache)
  } catch (error) {
    console.error("App shell refresh failed", error)
  }
}

async function fetchAndCache(request, cacheKey = request) {
  const response = await fetch(request)

  if (!response || response.status !== 200) {
    return response
  }

  const cache = await caches.open(CACHE_NAME)

  await cache.put(cacheKey, response.clone())

  return response
}
