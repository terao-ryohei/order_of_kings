import { Box, ChakraProvider, createSystem, defaultConfig, Heading, Text, VStack, Button } from "@chakra-ui/react";
import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import { ThemeProvider } from "next-themes";
import Header from "~/components/Header";
import globalStylesHref from "~/global.css?url";

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  { rel: "stylesheet", href: globalStylesHref },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
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

export function ErrorBoundary() {
  const error = useRouteError();

  const statusCode = isRouteErrorResponse(error) ? error.status : 500;
  const message = isRouteErrorResponse(error)
    ? error.status === 404
      ? "ページが見つかりません"
      : error.statusText
    : "予期せぬエラーが発生しました";

  return (
    <ChakraProvider value={system}>
      <Box minH="100vh" bg="gray.950" color="white" p={8}>
        <VStack gap={6} maxW="600px" mx="auto" mt="20vh">
          <Heading size="2xl" color="red.400">
            {statusCode}
          </Heading>
          <Text fontSize="xl" textAlign="center">
            {message}
          </Text>
          <Button
            as="a"
            href="/"
            colorPalette="yellow"
            size="lg"
            rounded="full"
          >
            トップへ戻る
          </Button>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}
