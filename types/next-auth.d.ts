import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    systems: string[];
    role: string;
    isSuperUser: boolean;
    permissions: any;
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
    systems?: string[];
    role?: string;
    isSuperUser?: boolean;
    permissions?: any;
    error?: string;
  }
}
