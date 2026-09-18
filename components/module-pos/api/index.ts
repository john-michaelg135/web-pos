import { Api } from './api';

const basePosUrl = process.env.NEXT_PUBLIC_API_URL || '';

// NOTE: withCredentials is intentionally false. api-pos authenticates via Bearer
// tokens (not the NextAuth session cookie), so sending credentials only forces the
// large multi-chunk NextAuth session cookie onto every api-pos request. For cashier
// accounts with a big token that pushes the request headers past the proxy/Kestrel
// limit and causes HTTP 431 (Request Header Fields Too Large). Omitting the cookie
// keeps api-pos requests small and avoids the 431.
export const apiClient = new Api({
  baseURL: basePosUrl,
  withCredentials: false,
});
