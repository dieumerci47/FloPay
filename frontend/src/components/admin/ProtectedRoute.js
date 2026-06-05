// src/components/admin/ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuth";
import { Spinner } from "./ui";

export default function ProtectedRoute({ children, superOnly = false }) {
  const { admin, loading, isSuperAdmin } = useAdminAuth();
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

  if (superOnly && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
