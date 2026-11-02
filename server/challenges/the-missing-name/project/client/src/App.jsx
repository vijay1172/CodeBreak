import { useEffect, useState } from "react";
import { readJson } from "./api/http.js";
import { UserProfile } from "./components/UserProfile.jsx";

export function App({ token, apiBaseUrl = "/api" }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/users/user-1`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(readJson).then(setUser).catch((failure) => {
      if (!controller.signal.aborted) setError(failure);
    });
    return () => controller.abort();
  }, [apiBaseUrl, token]);
  if (error) return <p role="alert">{error.message}</p>;
  if (!user) return <p role="status">Loading profile…</p>;
  return <><h1>Student profile</h1><UserProfile user={user} /></>;
}
