import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { GarageSync } from "@/components/garage-sync";
import { HotkeyGate } from "@/components/hotkey-gate";
import { LocaleProvider } from "@/lib/locale-context";
import { detectLocale } from "@/lib/locale.functions";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: () => detectLocale(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Dino Drag Race" },
      { name: "description", content: "Arrancada de dinos no navegador. Marcha, nitro e fósseis." },
      { name: "theme-color", content: "#090b08" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Lilita+One&family=Outfit:wght@400;500;600;700&family=Teko:wght@500;600&family=VT323&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  const { lang } = Route.useLoaderData();
  return (
    <html lang={lang === "en" ? "en" : "pt-BR"} className="antialiased scroll-smooth" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <LocaleProvider initial={lang}>
          <AuthProvider>
            <GarageSync />
            <HotkeyGate />
            <Outlet />
          </AuthProvider>
        </LocaleProvider>
        <Scripts />
      </body>
    </html>
  );
}
