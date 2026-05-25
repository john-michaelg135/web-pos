"use client";

import { AuthLayout } from "@r3b2p/uilib";


const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthLayout>{children}</AuthLayout>
  );
};

export default RootLayout;