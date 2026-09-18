import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    systems: string[];
    role: string;
    isSuperUser: boolean;
    /** Compact POS permissions map: module name -> granted action letters (e.g. "rwu"). */
    permissions: Record<string, string>;
    error?: string;
    user: DefaultSession["user"];
  }

  interface Profile {
    systems?: string;
    role?: string;
    isSuperUser?: string | boolean;
    permissions?: string | object;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    brAuthUserId?: string;
    systems?: string[];
    role?: string;
    isSuperUser?: boolean;
    /** Compact POS permissions map: module name -> granted action letters (e.g. "rwu"). */
    permissions?: Record<string, string>;
    error?: string;
  }
}
