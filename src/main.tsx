import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/playfair-display/700-italic.css";
import "@fontsource/playfair-display/700.css";
import "./index.css";

// Aggressively unregister any previously installed service worker + nuke its caches.
// Old SW versions were serving stale assets and breaking deploys.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
        .catch(() => {});
    if (typeof caches !== "undefined") {
        caches.keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k).catch(() => false))))
            .catch(() => {});
    }
}

createRoot(document.getElementById("root")!).render(
    <App />
);
