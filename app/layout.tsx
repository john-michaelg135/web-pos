import type { Metadata } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "@/app/globals.css";
import LayoutProvider from "@/providers/LayoutProvider";
// TEMPORARY DEMO AUTH — remove after br-auth integration. See lib/demoAuth.tsx.
import { isDemoAuth } from "@/lib/demoAuthFlag";
import { DemoAuthProvider } from "@/lib/demoAuth";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ERP System",
  description: "Manufacturing Industry Capstone Project",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {/* DEMO AUTH: mock session provider when the flag is on; real one otherwise. */}
        {isDemoAuth() ? (
          <DemoAuthProvider>
            <LayoutProvider>{children}</LayoutProvider>
          </DemoAuthProvider>
        ) : (
          <SessionProvider>
            <LayoutProvider>{children}</LayoutProvider>
          </SessionProvider>
        )}
      </body>
    </html>
  );
};

export default RootLayout;
