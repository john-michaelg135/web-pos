import type { Metadata } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import LayoutProvider from "@/providers/LayoutProvider";
import { headers } from "next/headers";
import { StaffProvider } from "@/context/AuthContext";
import { staffFromHeaders } from "@/lib/portal/staff-header";

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

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const validated = staffFromHeaders(await headers());

  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <StaffProvider staff={validated?.staff ?? null} modules={validated?.modules ?? []}>
          <LayoutProvider>{children}</LayoutProvider>
        </StaffProvider>
      </body>
    </html>
  );
};

export default RootLayout;
