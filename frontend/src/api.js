import axios from "axios";
import { io } from "socket.io-client";

// Default to the local backend port used by the dev server.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("coderrooms.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function makeSocket() {
  return io(API_URL, { transports: ["websocket"], auth: { token: localStorage.getItem("coderrooms.token") } });
}
