// src/components/admin/ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuth";
import { Spinner } from "./ui";

export default function ProtectedRoute({ children, superOnly = false, allowPasswordChange = false }) {
  const { admin, loading, isSuperAdmin, mustChangePassword } = useAdminAuth();
  const location = useLocation();

  // Bootstrap de session en cours (tentative de refresh via cookie)
  if (loading) {
    return (
      <div className="grain flex min-h-screen items-center justify-center bg-ink-950">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // Mot de passe provisoire : on force le changement avant tout accès
  if (mustChangePassword && !allowPasswordChange) {
    return <Navigate to="/admin/change-password" replace />;
  }

  if (superOnly && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
