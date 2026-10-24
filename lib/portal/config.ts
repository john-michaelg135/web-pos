export const SESSION_COOKIE = "pos_session";
export const HANDOFF_COOKIE = "pos_handoff";
export const CALLBACK_PATH = "/api/portal/callback";
export const LOGIN_PATH = "/api/portal/login";
export const SIGNING_IN_PATH = "/signing-in";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set; see .env.production.example`);
  }

  return value;
}

export function portalConfig() {
  const appUrl = (
    process.env.NODE_ENV === "production"
      ? required("POS_APP_URL")
      : (process.env.POS_APP_URL ?? "https://localhost:3002")
  ).replace(/\/$/, "");

  const portalUrl = required("PORTAL_URL").replace(/\/$/, "");

  return {
    portalUrl,
    systemName: process.env.PORTAL_SYSTEM_NAME ?? "POS",
    systemSecret: required("PORTAL_SYSTEM_SECRET"),
    logoutUrl: `${portalUrl}/logout`,
    callbackUrl: `${appUrl}${CALLBACK_PATH}`,
  };
}
