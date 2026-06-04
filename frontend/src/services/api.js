// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const getEstablishments = () =>
  api.get("/establishments").then((r) => {
    console.log("establishments", r.data.data);
    return r.data.data
  });

export const getPrograms = (establishmentId, academicYear = "2024-2025") =>
  api
    .get(`/establishments/${establishmentId}/programs`, { params: { academicYear } })
    .then((r) => r.data.data);

export const initiatePayment = (payload) =>
  api.post("/payments", payload).then((r) => r.data.data);

export const getPaymentStatus = (paymentId) =>
  api.get(`/payments/${paymentId}/status`).then((r) => r.data.data);

export const getReceiptUrl = (receiptNumber) =>
  `${process.env.REACT_APP_API_URL || "http://localhost:3000/api"}/payments/${receiptNumber}/receipt`;
