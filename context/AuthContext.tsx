"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

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

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let u = await validate();
      if (u) { setUser(u); setIsLoading(false); return; }

      const refreshed = await refresh();
      if (refreshed) u = await validate();

      setUser(u);
      setIsLoading(false);
    };

    init();
  }, []);

  const validate = async (): Promise<User | null> => {
    try {
      const res = await api.get("/api/erp-auth/validate");
      const userData = res.data.user;
      if (!userData) return null;

      const flatApps: string[] = [];
      if (userData.apps) {
        userData.apps.forEach((app: any) => {
          flatApps.push(app.appName.toLowerCase());
          if (app.modules) {
            app.modules.forEach((mod: any) => {
              const normalized = mod.moduleName
                .toLowerCase()
                .replace(/ & /g, "-")
                .replace(/&/g, "-")
                .replace(/ /g, "-");
              flatApps.push(normalized);
            });
          }
        });
      }

      return {
        ...userData,
        apps: flatApps
      };
    } catch { return null; }
  };

  const refresh = async (): Promise<boolean> => {
    try {
      await api.post("/api/erp-auth/refresh");
      return true;
    } catch { return false; }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/api/erp-auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback to prevent Next.js build/prerendering errors when compiled outside of AuthProvider
    return {
      user: null,
      isLoading: true,
      logout: async () => {},
    };
  }
  return ctx;
};