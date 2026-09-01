export function register() {
  if ("serviceWorker" in navigator && process.env.NODE_ENV !== "test") {
    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL || ""}/sw.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log(
            "[Service Worker] Registered successfully with scope:",
            registration.scope
          );

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) {
              return;
            }
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.log(
                    "[Service Worker] New content available; please refresh."
                  );
                } else {
                  console.log("[Service Worker] Content cached for offline use.");
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error("[Service Worker] Registration failed:", error);
        });
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
