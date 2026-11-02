import { config } from "./config.js";
import { getToken, clearSession } from "./auth.js";

export class ApiError extends Error {
  constructor({ status = 0, message = "Error inesperado", errors = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

// Every backend response has the shape { success, data } on success
// and { success: false, status, message, errors } on failure.
async function request(path, { method = "GET", body, auth = true } = {}) {
  const token = auth ? getToken() : null;
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  let res;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError({ status: 408, message: "El servidor tardó demasiado. Intenta de nuevo." });
    }
    throw new ApiError({ message: "No hay conexión con el servidor." });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  // Expired or invalid token: drop the local session
  if (res.status === 401 && token) clearSession();

  if (!res.ok || payload?.success === false) {
    throw new ApiError({
      status: res.status,
      message: payload?.message || `Error ${res.status}`,
      errors: payload?.errors || [],
    });
  }

  return payload?.data ?? null;
}

// Auth
export const register = (data) =>
  request("/auth/register", { method: "POST", body: data, auth: false });

export const login = (credentials) =>
  request("/auth/login", { method: "POST", body: credentials, auth: false });

export const getCurrentUser = () => request("/auth/me");

// Categories
export const listCategories = () => request("/categories", { auth: false });

export const createCategory = (categoryName) =>
  request("/categories", { method: "POST", body: { categoryName } });

export const updateCategory = (id, categoryName) =>
  request(`/categories/${id}`, { method: "PUT", body: { categoryName } });

export const deleteCategory = (id) =>
  request(`/categories/${id}`, { method: "DELETE" });

// Movies
export function listMovies({ categoryId, sort } = {}) {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (sort) params.set("sort", sort);
  const query = params.toString();
  return request(`/movies${query ? `?${query}` : ""}`, { auth: false });
}

export const getMovie = (id) => request(`/movies/${id}`);

export const createMovie = (data) =>
  request("/movies", { method: "POST", body: data });

export const updateMovie = (id, data) =>
  request(`/movies/${id}`, { method: "PUT", body: data });

export const deleteMovie = (id) =>
  request(`/movies/${id}`, { method: "DELETE" });

export const listPendingMovies = () => request("/movies/pending");

export const approveMovie = (id) =>
  request(`/movies/${id}/approve`, { method: "PATCH" });

// Reviews and reactions
export const createReview = ({ movieId, title, comment, rating }) =>
  request("/reviews", { method: "POST", body: { movieId, title, comment, rating } });

export const deleteReview = (id) =>
  request(`/reviews/${id}`, { method: "DELETE" });

export const setReaction = (reviewId, reaction) =>
  request(`/reviews/${reviewId}/reaction`, { method: "PUT", body: { reaction } });

export const removeReaction = (reviewId) =>
  request(`/reviews/${reviewId}/reaction`, { method: "DELETE" });
