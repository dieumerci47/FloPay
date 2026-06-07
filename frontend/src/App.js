// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import PaymentForm from "./pages/PaymentForm";
import VerifyReceipt from "./pages/VerifyReceipt";

import { AdminAuthProvider } from "./context/AdminAuth";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import AdminLogin from "./pages/admin/Login";
import ChangePassword from "./pages/admin/ChangePassword";
import Dashboard from "./pages/admin/Dashboard";
import Verify from "./pages/admin/Verify";
import Payments from "./pages/admin/Payments";
import Admins from "./pages/admin/Admins";
import Audit from "./pages/admin/Audit";

export default function App() {
  return (
    <Routes>
      {/* Parcours étudiant (public) */}
      <Route path="/" element={<PaymentForm />} />
      <Route path="/verifier/:receiptNumber" element={<VerifyReceipt />} />

      {/* Espace admin */}
      <Route
        path="/admin/*"
        element={
          <AdminAuthProvider>
            <Routes>
              <Route path="login" element={<AdminLogin />} />
              <Route
                path="change-password"
                element={
                  <ProtectedRoute allowPasswordChange>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="verifier" element={<Verify />} />
                <Route path="paiements" element={<Payments />} />
                <Route path="admins" element={<ProtectedRoute superOnly><Admins /></ProtectedRoute>} />
                <Route path="audit" element={<ProtectedRoute superOnly><Audit /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminAuthProvider>
        }
      />
    </Routes>
  );
}
