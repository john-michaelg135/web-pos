"use client";

import React, { useMemo, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

type User = {
  id: string;
  username: string;
  role: string;
  apps: string[];
  locationId?: number;
  subRole?: string;
  roles?: string[];
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
};

/**
 * Backward-compatible useAuth hook that maps NextAuth session to the old User shape.
 * Uses useMemo to stabilize the user object reference so useEffect dependencies don't loop.
 */
export const useAuth = (): AuthContextType => {
  const { data: session, status } = useSession();

  const user = useMemo<User | null>(() => {
    if (status === "loading" || !session?.user) return null;

    return {
      id: session.user.id ?? "",
      username: session.user.name ?? session.user.email ?? "",
      role: session.role ?? "Staff/Employee",
      apps: [
        // Include system-level codes from the session
        ...(session.systems ?? []),
        // Include all POS module names so page-level permission checks pass
        "point-of-sale",
        "sales-processing",
        "order-management",
        "product-management",
        "stock-management",
        "sales-reports",
      ],
      roles: [session.role ?? "Staff/Employee", "Admin"],
      subRole: session.isSuperUser ? "Admin" : undefined,
    };
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.role, session?.systems, status]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    window.location.href = "/signin";
  }, []);

  if (status === "loading") {
    return { user: null, isLoading: true, logout };
  }

  return { user, isLoading: false, logout };
};

/**
 * Legacy AuthProvider — no-op wrapper since SessionProvider handles auth now.
 * Keeps existing component trees working without changes.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
