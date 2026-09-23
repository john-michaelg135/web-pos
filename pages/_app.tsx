import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
// TEMPORARY DEMO AUTH — remove after br-auth integration. See lib/demoAuth.tsx.
import { isDemoAuth, DemoAuthProvider } from "@/lib/demoAuth";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // DEMO AUTH: mock session provider when the flag is on; real one otherwise.
  if (isDemoAuth()) {
    return (
      <DemoAuthProvider>
        <Component {...pageProps} />
      </DemoAuthProvider>
    );
  }

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
