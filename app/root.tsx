import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { ThemeProvider } from "next-themes";
import Header from "~/components/Header";

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Noto+Sans+JP:wght@100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&true)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const system = createSystem(defaultConfig, {
  globalCss: {
    body: {
      minHeight: "100vh",
      fontFamily: '"Noto Sans JP", "Inter", sans-serif',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: '"Noto Sans JP", "Inter", sans-serif' },
        body: { value: '"Noto Sans JP", "Inter", sans-serif' },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ChakraProvider value={system}>
        <Header />
        <Outlet />
      </ChakraProvider>
    </ThemeProvider>
  );
}
