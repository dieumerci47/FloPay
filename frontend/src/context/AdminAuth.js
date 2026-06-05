// src/context/AdminAuth.js
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiLogin, apiLogout, apiMe, apiRefresh } from "../services/adminApi";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true); // bootstrap en cours

  // Au montage : tente de restaurer la session via le cookie refresh httpOnly
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await apiRefresh();          // pose un nouvel access token si le cookie est valide
        const me = await apiMe();
        if (active) setAdmin(me);
      } catch {
        if (active) setAdmin(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { admin } = await apiLogin(email, password);
    setAdmin(admin);
    return admin;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAdmin(null);
  }, []);

  const value = {
    admin,
    loading,
    isSuperAdmin: admin?.role === "SUPER_ADMIN",
    login,
    logout,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth doit être utilisé dans AdminAuthProvider");
  return ctx;
};
