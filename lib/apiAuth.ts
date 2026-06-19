import axios from "axios";

const apiAuth = axios.create({
  baseURL: process.env.NEXT_PUBLIC_POS_URL || "http://localhost:3003",
  withCredentials: true,
});

export default apiAuth;
