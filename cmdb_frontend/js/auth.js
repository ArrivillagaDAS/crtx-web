import { config } from "./config.js";

// Single source of truth for the session (token + public user returned by /auth/login)
export function saveSession({ token, user }) {
  if (!token) throw new Error("La API no devolvió un token de sesión.");
  try {
    localStorage.setItem(config.tokenKey, token);
    localStorage.setItem(config.userKey, JSON.stringify(user));
  } catch {
    throw new Error("El navegador no permite guardar la sesión. Habilita el almacenamiento local e inténtalo de nuevo.");
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.userKey);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

export function getToken() {
  try {
    return localStorage.getItem(config.tokenKey);
  } catch {
    return null;
  }
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(config.userKey));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function isAdmin() {
  return Boolean(getUser()?.administrator);
}

export function requireAdmin() {
  if (!isAdmin()) {
    location.replace("./login.html");
    return false;
  }
  return true;
}

export function logout() {
  clearSession();
  location.assign("./index.html");
}
