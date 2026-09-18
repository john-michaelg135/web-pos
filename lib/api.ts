import axios from "axios";

// withCredentials disabled: api-pos uses Bearer auth, not the NextAuth cookie.
// Sending the large session cookie causes HTTP 431 for cashier accounts.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: false,
});

export default api;