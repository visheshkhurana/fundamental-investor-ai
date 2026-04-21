"use client";
// Stable anonymous client id kept in localStorage. Sent as a header on all
// trading API calls so the server can key an account without auth.

const KEY = "fi.client_id";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      "cid_" +
      crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export async function tradingFetch(path: string, init: RequestInit = {}) {
  const cid = getClientId();
  const headers = new Headers(init.headers);
  headers.set("x-client-id", cid);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(path, { ...init, headers });
}
