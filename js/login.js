import { login, register, ApiError } from "./api.js";
import { saveSession, isLoggedIn, isAdmin } from "./auth.js";
import { $, $$, clearAlert, setBusy, setYear, showAlert, showFieldErrors } from "./utils.js";

const goHome = () => location.replace(isAdmin() ? "./admin.html" : "./index.html");

// Already signed in: skip the login screen
if (isLoggedIn()) goHome();

const alertBox = $("#auth-alert");
const loginForm = $("#login-form");
const registerForm = $("#register-form");

function showTab(name) {
  $$(".auth-tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  loginForm.classList.toggle("hidden", name !== "login");
  registerForm.classList.toggle("hidden", name !== "register");
  clearAlert(alertBox);
}

function handleError(form, err) {
  if (err instanceof ApiError) {
    showFieldErrors(form, err.errors);
    showAlert(alertBox, err.message);
  } else {
    showAlert(alertBox, "Error inesperado. Intenta de nuevo.");
  }
}

$$(".auth-tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));

// Links such as login.html#registro open the register tab directly
if (location.hash === "#registro") showTab("register");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  showFieldErrors(loginForm, []);

  const { email, password } = Object.fromEntries(new FormData(loginForm));
  const button = loginForm.querySelector('button[type="submit"]');
  setBusy(button, true);
  try {
    saveSession(await login({ email: email.trim(), password }));
    goHome();
  } catch (err) {
    handleError(loginForm, err);
  } finally {
    setBusy(button, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert(alertBox);
  showFieldErrors(registerForm, []);

  const data = Object.fromEntries(new FormData(registerForm));
  if (data.password !== data.confirmPassword) {
    showFieldErrors(registerForm, [{ field: "confirmPassword", message: "Las contraseñas no coinciden." }]);
    return;
  }

  const email = data.email.trim();
  const button = registerForm.querySelector('button[type="submit"]');
  setBusy(button, true);
  try {
    // The register endpoint returns the user but no token, so sign in right after
    await register({ username: data.username.trim(), email, password: data.password });
    saveSession(await login({ email, password: data.password }));
    goHome();
  } catch (err) {
    handleError(registerForm, err);
  } finally {
    setBusy(button, false);
  }
});

setYear();
