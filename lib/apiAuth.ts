import axios from "axios";

// withCredentials disabled: api-pos uses Bearer auth, not the NextAuth cookie.
// Sending the large session cookie causes HTTP 431 for cashier accounts.
const apiAuth = axios.create({
  baseURL: process.env.NEXT_PUBLIC_POS_URL || "http://localhost:3003",
  withCredentials: false,
});

export default apiAuth;
