"use client";

import React, { useMemo, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  can as canPerm,
  canRead as canReadPerm,
  type PermissionsMap,
  type PosAction,
} from "@/lib/permissions";

type User = {
  id: string;
  username: string;
  /** br-auth role string (e.g. "Staff/Employee", "Super Admin"). NOT synthesized. */
  role: string;
  /** True for br-auth Super Admin / CEO. Bypasses all granular checks. */
  isSuperUser: boolean;
  /** System codes the user can access (e.g. "POS"). From the br-auth `systems` claim. */
  systems: string[];
  /** Compact granular POS permissions map: { "<Module>": "rwu", ... }. */
  permissions: PermissionsMap;
  locationId?: number;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  /**
   * Does the current user have `action` on `moduleName`?
   * Super users always pass. Returns false while loading / unauthenticated.
   */
  can: (moduleName: string, action: PosAction) => boolean;
  /** Convenience: does the current user have read access to `moduleName`? */
  canRead: (moduleName: string) => boolean;
};

/**
 * useAuth maps the NextAuth session to a permission-aware user object.
 *
 * The granular permissions come straight from br-auth's `permissions` claim
 * (surfaced as session.permissions by auth.ts). This hook does NOT synthesize
 * roles or module access — RBAC is driven entirely by the real permission map,
 * with super users (Super Admin / CEO) bypassing granular checks.
 */
export const useAuth = (): AuthContextType => {
  const { data: session, status } = useSession();

  const user = useMemo<User | null>(() => {
    if (status === "loading" || !session?.user) return null;

    return {
      id: session.user.id ?? "",
      username: session.user.name ?? session.user.email ?? "",
      role: session.role ?? "Staff/Employee",
      isSuperUser: !!session.isSuperUser,
      systems: session.systems ?? [],
      permissions: session.permissions ?? {},
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.role,
    session?.isSuperUser,
    session?.systems,
    session?.permissions,
    status,
  ]);

  const can = useCallback(
    (moduleName: string, action: PosAction): boolean => {
      if (!user) return false;
      if (user.isSuperUser) return true;
      return canPerm(user.permissions, moduleName, action);
    },
    [user]
  );

  const canRead = useCallback(
    (moduleName: string): boolean => {
      if (!user) return false;
      if (user.isSuperUser) return true;
      return canReadPerm(user.permissions, moduleName);
    },
    [user]
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    window.location.href = "/signin";
  }, []);

  if (status === "loading") {
    return { user: null, isLoading: true, logout, can, canRead };
  }

  return { user, isLoading: false, logout, can, canRead };
};

/**
 * Legacy AuthProvider — no-op wrapper since SessionProvider handles auth now.
 * Keeps existing component trees working without changes.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
