export function registerServiceWorker() {
  if (
    !("serviceWorker" in navigator) ||
    import.meta.env.DEV
  ) {
    return
  }

  navigator.serviceWorker
    .register("/sw.js", {
      updateViaCache: "none",
    })
    .then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({
          type: "SKIP_WAITING",
        })
      }
    })
    .catch((error) => {
      console.error(
        "Service worker registration failed",
        error
      )
    })
}
