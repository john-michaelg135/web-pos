"use client";

import { SidebarProvider, ThemeProvider } from "@r3b2p/uilib";

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
    return (
    <ThemeProvider>
        <SidebarProvider>
            {children}
        </SidebarProvider>
    </ThemeProvider>);
}
