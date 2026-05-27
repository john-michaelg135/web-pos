"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

type User = {
  id: string;
  username: string;
  role: string;
  apps: string[];
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
      const res = await api.get("/api/auth/validate?tokenType=sso");
      return res.data;
    } catch { return null; }
  };

  const refresh = async (): Promise<boolean> => {
    try {
      await api.post("/api/auth/refresh?tokenType=sso");
      return true;
    } catch { return false; }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/api/auth/logout?tokenType=sso");
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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};