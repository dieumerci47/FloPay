// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import PaymentForm from "./pages/PaymentForm";
import VerifyReceipt from "./pages/VerifyReceipt";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PaymentForm />} />
      <Route path="/verifier/:receiptNumber" element={<VerifyReceipt />} />
    </Routes>
  );
}
