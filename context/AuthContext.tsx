"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import type { PosAction } from "@/lib/permissions";
import type { Staff } from "@/lib/portal/client";
import { canUse, isSuperUser } from "@/lib/portal/roles";

type User = Staff & {
  /** Kept so existing callers that read a user id keep compiling; the Portal sends no numeric id. */
  id: string;
  /** Super Admin and CEO. */
  isSuperUser: boolean;
  locationId?: number;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  /** Is `moduleName` one the Enterprise Portal allowed? The action never narrows it. */
  can: (moduleName: string, action?: PosAction) => boolean;
  canRead: (moduleName: string) => boolean;
};

type Value = { staff: Staff | null; modules: string[] };

const StaffContext = createContext<Value>({ staff: null, modules: [] });

/** Fed by the root layout with the Staff member and Modules the guard validated for this page. */
export const StaffProvider = ({
  staff,
  modules,
  children,
}: Value & { children: React.ReactNode }) => {
  const value = useMemo(() => ({ staff, modules }), [staff, modules]);

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
};

/** Signing out of POS signs the Staff member out of the Enterprise Portal. */
const logout = () => {
  const form = document.createElement("form");

  form.method = "POST";
  form.action = "/api/portal/logout";
  document.body.appendChild(form);
  form.submit();
};

export const useAuth = (): AuthContextType => {
  const { staff, modules } = useContext(StaffContext);

  const user = useMemo<User | null>(
    () => (staff ? { ...staff, id: staff.username, isSuperUser: isSuperUser(staff.role) } : null),
    [staff],
  );

  const can = useCallback(
    (moduleName: string) => !!staff && canUse(modules, moduleName),
    [staff, modules],
  );

  return { user, isLoading: false, logout, can, canRead: can };
};
