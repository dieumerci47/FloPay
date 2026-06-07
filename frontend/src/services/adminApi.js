// src/services/adminApi.js
// Client API de l'espace admin.
//   - L'access token vit EN MÉMOIRE (jamais localStorage) → immunisé au vol par XSS.
//   - Le refresh token est un cookie httpOnly géré par le navigateur (withCredentials).
//   - Sur 401 (token expiré), on tente un /refresh transparent puis on rejoue la requête.
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://192.168.100.254:3000/api";

// ── Stockage en mémoire de l'access token ─────────────────────────────────────
let accessToken = null;
const listeners = new Set();
export const setAccessToken = (t) => { accessToken = t; listeners.forEach((l) => l(t)); };
export const getAccessToken = () => accessToken;
export const onTokenChange  = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

const adminApi = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // envoie le cookie refresh
});

// Injecte le Bearer sur chaque requête
adminApi.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ── Refresh transparent ───────────────────────────────────────────────────────
let refreshing = null; // promesse partagée pour éviter les refresh concurrents

const doRefresh = () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${BASE}/admin/auth/refresh`, {}, { withCredentials: true })
      .then((r) => {
        setAccessToken(r.data.data.accessToken);
        return r.data.data;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
};

adminApi.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    const status   = err.response?.status;
    const isAuthRoute = original?.url?.includes("/admin/auth/");

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const { accessToken: t } = await doRefresh();
        original.headers.Authorization = `Bearer ${t}`;
        return adminApi(original);
      } catch (e) {
        setAccessToken(null);
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

// ── Endpoints ─────────────────────────────────────────────────────────────────
export const apiLogin = (email, password) =>
  adminApi.post("/admin/auth/login", { email, password }).then((r) => r.data.data);

export const apiRefresh = () => doRefresh();

export const apiLogout = () =>
  adminApi.post("/admin/auth/logout").catch(() => {}).finally(() => setAccessToken(null));

export const apiMe = () => adminApi.get("/admin/auth/me").then((r) => r.data.data.admin);

export const apiDashboard = (academicYear) =>
  adminApi.get("/admin/dashboard", { params: academicYear ? { academicYear } : {} }).then((r) => r.data.data);

export const apiVerifyReceipt = (receiptNumber) =>
  adminApi.get(`/admin/receipts/${encodeURIComponent(receiptNumber)}`).then((r) => r.data.data);

export const apiSearchMatricule = (matricule) =>
  adminApi.get(`/admin/students/${encodeURIComponent(matricule)}`).then((r) => r.data.data);

export const apiPayments = (params) =>
  adminApi.get("/admin/payments", { params }).then((r) => r.data);

// Export CSV (blob authentifié) — déclenche le téléchargement côté navigateur
export const apiExportPayments = async (params) => {
  const r = await adminApi.get("/admin/payments/export", { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([r.data], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `paiements_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const apiEstablishments = () =>
  adminApi.get("/establishments").then((r) => r.data.data);

// Gestion des admins (super admin)
export const apiListAdmins   = () => adminApi.get("/admin/admins").then((r) => r.data.data);
export const apiCreateAdmin  = (payload) => adminApi.post("/admin/admins", payload).then((r) => r.data.data);
export const apiSetAdminActive = (id, isActive) =>
  adminApi.patch(`/admin/admins/${id}/status`, { isActive }).then((r) => r.data.data);
export const apiResetAdminPwd = (id, password) =>
  adminApi.patch(`/admin/admins/${id}/password`, { password }).then((r) => r.data);
export const apiAuditLogs = (params) =>
  adminApi.get("/admin/audit", { params }).then((r) => r.data);

export default adminApi;
