// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://192.168.100.254:3000/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const getEstablishments = () =>
  api.get("/establishments").then((r) => {
    console.log("establishments", r.data.data);
    return r.data.data
  });

// Sans academicYear → renvoie TOUS les programmes de l'établissement
// (on dérive années / niveaux / parcours côté client pour les selects en cascade)
export const getPrograms = (establishmentId, academicYear) =>
  api
    .get(`/establishments/${establishmentId}/programs`, {
      params: academicYear ? { academicYear } : {},
    })
    .then((r) => r.data.data);

export const initiatePayment = (payload) =>
  api.post("/payments", payload).then((r) => r.data.data);

export const getPaymentStatus = (paymentId) =>
  api.get(`/payments/${paymentId}/status`).then((r) => r.data.data);

export const getReceiptUrl = (receiptNumber) =>
  `${process.env.REACT_APP_API_URL || "http://192.168.100.254:3000/api"}/payments/${receiptNumber}/receipt`;

// Vérification publique d'un reçu (scan du QR code)
export const verifyReceipt = (receiptNumber) =>
  api.get(`/payments/verify/${receiptNumber}`).then((r) => r.data.data);
