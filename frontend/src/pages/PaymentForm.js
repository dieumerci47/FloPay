// src/pages/PaymentForm.js
import React, { useState, useEffect, useCallback } from "react";
import {
  getEstablishments,
  getPrograms,
  initiatePayment,
  getPaymentStatus,
  getReceiptUrl,
} from "../services/api";

// ── Icônes inline ──────────────────────────────────────────────────────────────
const Icon = {
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Building: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 21V12h8v9M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  ),
  Phone: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 18l.2-1.08z" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Arrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Clock: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Success: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Error: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

// ── Constantes ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Identité"    },
  { id: 2, label: "Inscription" },
  { id: 3, label: "Paiement"   },
  { id: 4, label: "Confirmation"},
];

const CURRENT_YEAR = "2024-2025";

// ── Composant principal ────────────────────────────────────────────────────────
export default function PaymentForm() {
  const [step, setStep] = useState(1);

  // Données formulaire
  const [form, setForm] = useState({
    matricule:       "",
    fullName:        "",
    birthDate:       "",
    birthPlace:      "",
    phone:           "",
    establishmentId: "",
    programId:       "",
    paymentMethod:   "",
    paymentPhone:    "",
  });

  const [errors, setErrors] = useState({});

  // Données API
  const [establishments, setEstablishments] = useState([]);
  const [programs, setPrograms]             = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Paiement
  const [paymentData, setPaymentData] = useState(null); // réponse POST /payments
  const [paymentStatus, setPaymentStatus] = useState(null); // PENDING / SUCCESS / FAILED
  const [pollCount, setPollCount] = useState(0);

  // UI
  const [loading, setLoading]           = useState(false);
  const [loadingEstab, setLoadingEstab] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // ── Chargement établissements ──────────────────────────────────────────────
  useEffect(() => {
    getEstablishments()
      .then(setEstablishments)
      .catch(() => {})
      .finally(() => setLoadingEstab(false));
  }, []);

  // ── Chargement parcours quand établissement change ────────────────────────
  useEffect(() => {
    if (!form.establishmentId) { setPrograms([]); setSelectedProgram(null); return; }
    setLoadingPrograms(true);
    setForm((f) => ({ ...f, programId: "" }));
    setSelectedProgram(null);
    getPrograms(form.establishmentId, CURRENT_YEAR)
      .then(setPrograms)
      .catch(() => {})
      .finally(() => setLoadingPrograms(false));
  }, [form.establishmentId]);

  // ── Mise à jour programme sélectionné ─────────────────────────────────────
  useEffect(() => {
    if (!form.programId) { setSelectedProgram(null); return; }
    const prog = programs.find((p) => p.id === form.programId);
    setSelectedProgram(prog || null);
  }, [form.programId, programs]);

  // ── Polling statut paiement ───────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    if (!paymentData?.paymentId) return;
    try {
      const data = await getPaymentStatus(paymentData.paymentId);
      setPaymentStatus(data.status);
      if (data.status === "SUCCESS" || data.status === "FAILED") return; // stop
    } catch (err) {
      // ignore network errors, but ensure polling continues
      console.warn("Polling error:", err);
    } finally {
      if (paymentStatus !== "SUCCESS" && paymentStatus !== "FAILED") {
        setPollCount((c) => c + 1);
      }
    }
  }, [paymentData, paymentStatus]);

  useEffect(() => {
    if (step !== 4 || !paymentData) return;
    if (paymentStatus === "SUCCESS" || paymentStatus === "FAILED") return;
    const timer = setTimeout(pollStatus, 3000);
    return () => clearTimeout(timer);
  }, [step, paymentData, paymentStatus, pollCount, pollStatus]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: "" }));
  };

  const formatAmount = (n) =>
    new Intl.NumberFormat("fr-FR").format(n) + " F CFA";

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  };

  // ── Validations par étape ─────────────────────────────────────────────────
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.matricule.trim()) errs.matricule  = "Le matricule est requis";
      if (!form.fullName.trim())  errs.fullName   = "Le nom complet est requis";
      if (!form.phone.trim())     errs.phone      = "Le téléphone est requis";
    }
    if (s === 2) {
      if (!form.establishmentId) errs.establishmentId = "Choisissez un établissement";
      if (!form.programId)       errs.programId       = "Choisissez un parcours";
    }
    if (s === 3) {
      if (!form.paymentMethod) errs.paymentMethod = "Choisissez un mode de paiement";
      if (!form.paymentPhone.trim()) errs.paymentPhone = "Le numéro Mobile Money est requis";
      else if (!/^(\+?242|0)?[0-9]{8,9}$/.test(form.paymentPhone.replace(/\s/g, "")))
        errs.paymentPhone = "Numéro invalide (ex: 068786678)";
    }
    return errs;
  };

  const nextStep = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((s) => s + 1);
  };

  // ── Soumettre le paiement ─────────────────────────────────────────────────
  const submitPayment = async () => {
    const errs = validateStep(3);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const data = await initiatePayment(form);
      setPaymentData(data);
      setPaymentStatus("PENDING");
      setStep(4);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'initiation du paiement";
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const establishment = establishments.find((e) => e.id === form.establishmentId);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* ── Panneau gauche ── */}
      <div className="page-left">
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div>
              <div className="brand-name">UMG PayTech</div>
              <div className="brand-tagline">Université Marien Ngouabi</div>
            </div>
          </div>

          <div className="left-hero">
            <h1>Payer vos frais de scolarité <span>sans file d'attente</span></h1>
            <p>Règlez vos frais depuis votre téléphone en moins de 2 minutes. Votre reçu officiel est généré instantanément.</p>
          </div>

          <div className="left-features">
            {[
              "Paiement 100% sécurisé",
              "Reçu PDF officiel instantané",
              "Disponible 24h/24, 7j/7",
              "Compatible MTN & Airtel Money",
            ].map((f) => (
              <div className="left-feature" key={f}>
                <div className="left-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="left-bottom">
          <div className="left-operators">
            <span className="operator-badge operator-mtn">MTN MoMo</span>
            <span className="operator-badge operator-airtel">Airtel Money</span>
            <span className="operator-label">acceptés</span>
          </div>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="page-right">
        <div className="form-container">

          {/* Progress */}
          {step < 4 && (
            <div className="step-progress">
              {STEPS.filter((s) => s.id <= 3).map((s) => (
                <div
                  key={s.id}
                  className={`step-item ${step === s.id ? "active" : ""} ${step > s.id ? "completed" : ""}`}
                >
                  <div className="step-circle">
                    {step > s.id ? <Icon.Check /> : s.id}
                  </div>
                  <span className="step-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── ÉTAPE 1 — Identité ── */}
          {step === 1 && (
            <>
              <div className="step-header">
                <div className="step-badge"><Icon.User /> Étape 1 sur 3</div>
                <h2>Vos informations personnelles</h2>
                <p>Saisissez vos informations telles qu'elles figurent sur votre dossier académique.</p>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label className="field-label">Matricule <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="ex : 01500251354313533"
                    value={form.matricule}
                    onChange={set("matricule")}
                    className={errors.matricule ? "error" : ""}
                  />
                  {errors.matricule && <span className="field-error">⚠ {errors.matricule}</span>}
                </div>

                <div className="field">
                  <label className="field-label">Nom et Prénom(s) <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="ex : YOUNDOUKA KOMBILA Davy Sagesse"
                    value={form.fullName}
                    onChange={set("fullName")}
                    className={errors.fullName ? "error" : ""}
                  />
                  {errors.fullName && <span className="field-error">⚠ {errors.fullName}</span>}
                </div>

                <div className="form-grid form-grid-2">
                  <div className="field">
                    <label className="field-label">Date de naissance</label>
                    <input type="date" value={form.birthDate} onChange={set("birthDate")} />
                  </div>
                  <div className="field">
                    <label className="field-label">Lieu de naissance</label>
                    <input
                      type="text"
                      placeholder="ex : Pointe-Noire"
                      value={form.birthPlace}
                      onChange={set("birthPlace")}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Téléphone personnel <span className="required">*</span></label>
                  <input
                    type="tel"
                    placeholder="ex : 06 878 6678"
                    value={form.phone}
                    onChange={set("phone")}
                    className={errors.phone ? "error" : ""}
                  />
                  {errors.phone && <span className="field-error">⚠ {errors.phone}</span>}
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-primary" onClick={nextStep}>
                  Continuer <Icon.Arrow />
                </button>
              </div>
            </>
          )}

          {/* ── ÉTAPE 2 — Inscription ── */}
          {step === 2 && (
            <>
              <div className="step-header">
                <div className="step-badge"><Icon.Building /> Étape 2 sur 3</div>
                <h2>Votre inscription académique</h2>
                <p>Sélectionnez votre établissement et votre parcours pour l'année {CURRENT_YEAR}.</p>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label className="field-label">Établissement <span className="required">*</span></label>
                  <select
                    value={form.establishmentId}
                    onChange={set("establishmentId")}
                    className={errors.establishmentId ? "error" : ""}
                    disabled={loadingEstab}
                  >
                    <option value="">{loadingEstab ? "Chargement..." : "Choisissez votre établissement"}</option>
                    {establishments.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                    ))}
                  </select>
                  {errors.establishmentId && <span className="field-error">⚠ {errors.establishmentId}</span>}
                </div>

                <div className="field">
                  <label className="field-label">Parcours & Niveau <span className="required">*</span></label>
                  <select
                    value={form.programId}
                    onChange={set("programId")}
                    className={errors.programId ? "error" : ""}
                    disabled={!form.establishmentId || loadingPrograms}
                  >
                    <option value="">
                      {!form.establishmentId
                        ? "Choisissez d'abord un établissement"
                        : loadingPrograms
                        ? "Chargement des parcours..."
                        : "Choisissez votre parcours"}
                    </option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.level} ({formatAmount(p.amount)})
                      </option>
                    ))}
                  </select>
                  {errors.programId && <span className="field-error">⚠ {errors.programId}</span>}
                </div>

                {/* Aperçu montant */}
                {selectedProgram && (
                  <div className="summary-card">
                    <div className="summary-amount">
                      <div className="summary-amount-label">Montant à régler</div>
                      <div className="summary-amount-value">
                        {new Intl.NumberFormat("fr-FR").format(selectedProgram.amount)}
                        <span className="summary-amount-currency">F CFA</span>
                      </div>
                    </div>
                    <div className="summary-rows">
                      <div className="summary-row">
                        <span className="summary-row-label">Établissement</span>
                        <span className="summary-row-value">{establishment?.code}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row-label">Parcours</span>
                        <span className="summary-row-value">{selectedProgram.name}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row-label">Niveau</span>
                        <span className="summary-row-value">{selectedProgram.level}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row-label">Année académique</span>
                        <span className="summary-row-value">{CURRENT_YEAR}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(1)}>
                  <Icon.ArrowLeft /> Retour
                </button>
                <button className="btn btn-primary" onClick={nextStep}>
                  Continuer <Icon.Arrow />
                </button>
              </div>
            </>
          )}

          {/* ── ÉTAPE 3 — Paiement ── */}
          {step === 3 && (
            <>
              <div className="step-header">
                <div className="step-badge"><Icon.Phone /> Étape 3 sur 3</div>
                <h2>Mode de paiement</h2>
                <p>Choisissez votre opérateur Mobile Money et entrez le numéro à débiter.</p>
              </div>

              <div className="form-grid">
                {/* Sélecteur opérateur */}
                <div className="field">
                  <label className="field-label">Opérateur Mobile Money <span className="required">*</span></label>
                  <div className="method-grid">
                    {[
                      { id: "MTN",    label: "MTN MoMo",    sub: "Mobile Money Congo",   logoClass: "method-mtn",    text: "MTN" },
                      { id: "AIRTEL", label: "Airtel Money", sub: "Airtel Money Congo",  logoClass: "method-airtel", text: "AIRTEL" },
                    ].map((m) => (
                      <div
                        key={m.id}
                        className={`method-card ${form.paymentMethod === m.id ? "selected" : ""}`}
                        onClick={() => { setForm((f) => ({ ...f, paymentMethod: m.id })); setErrors((e) => ({ ...e, paymentMethod: "" })); }}
                      >
                        <div className={`method-logo ${m.logoClass}`}>{m.text}</div>
                        <div className="method-name">{m.label}</div>
                        <div className="method-sub">{m.sub}</div>
                      </div>
                    ))}
                  </div>
                  {errors.paymentMethod && <span className="field-error">⚠ {errors.paymentMethod}</span>}
                </div>

                {/* Numéro Mobile Money */}
                <div className="field">
                  <label className="field-label">Numéro Mobile Money <span className="required">*</span></label>
                  <input
                    type="tel"
                    placeholder={form.paymentMethod === "MTN" ? "ex : 06 868 XXXX" : "ex : 07 XXXX XXXX"}
                    value={form.paymentPhone}
                    onChange={set("paymentPhone")}
                    className={errors.paymentPhone ? "error" : ""}
                  />
                  {errors.paymentPhone && <span className="field-error">⚠ {errors.paymentPhone}</span>}
                </div>

                {/* Récapitulatif */}
                {selectedProgram && (
                  <div className="summary-card">
                    <div className="summary-amount">
                      <div className="summary-amount-label">Total à payer</div>
                      <div className="summary-amount-value">
                        {new Intl.NumberFormat("fr-FR").format(selectedProgram.amount)}
                        <span className="summary-amount-currency">F CFA</span>
                      </div>
                    </div>
                    <div className="summary-rows">
                      <div className="summary-row">
                        <span className="summary-row-label">Étudiant</span>
                        <span className="summary-row-value">{form.fullName || "—"}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row-label">Matricule</span>
                        <span className="summary-row-value">{form.matricule || "—"}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row-label">Parcours</span>
                        <span className="summary-row-value">{selectedProgram.name} — {selectedProgram.level}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="alert alert-warning">
                  ⚠ Une notification va s'afficher sur votre téléphone. Entrez votre code PIN pour confirmer le paiement.
                </div>

                {errors.submit && (
                  <div className="alert" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B" }}>
                    ❌ {errors.submit}
                  </div>
                )}
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>
                  <Icon.ArrowLeft /> Retour
                </button>
                <button className="btn btn-primary" onClick={submitPayment} disabled={loading}>
                  {loading ? (
                    <><div className="spinner" /> Envoi en cours...</>
                  ) : (
                    <>Payer {selectedProgram ? formatAmount(selectedProgram.amount) : ""} <Icon.Arrow /></>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── ÉTAPE 4 — Confirmation / Statut ── */}
          {step === 4 && (
            <>
              {/* En attente */}
              {paymentStatus === "PENDING" && (
                <div className="status-screen">
                  <div className="status-icon pending" style={{ color: "#D97706" }}>
                    <Icon.Clock />
                  </div>
                  <div className="status-title">En attente de confirmation</div>
                  <p className="status-message">
                    Une notification a été envoyée sur le numéro <strong>{form.paymentPhone}</strong>.<br />
                    Entrez votre code PIN <strong>{form.paymentMethod} Mobile Money</strong> pour valider le paiement.
                  </p>

                  <div style={{ margin: "2rem 0", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "200px", height: "4px", background: "#E5E7EB", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        background: "var(--gold)",
                        borderRadius: "4px",
                        animation: "loading-bar 2s ease-in-out infinite",
                        width: "40%",
                      }} />
                    </div>
                    <style>{`@keyframes loading-bar { 0%{transform:translateX(-100%)} 100%{transform:translateX(600%)} }`}</style>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Vérification en cours…</span>
                  </div>

                  {/* Numéro de reçu provisoire */}
                  {paymentData?.receiptNumber && (
                    <div className="alert alert-info" style={{ width: "100%", textAlign: "left" }}>
                      🔖 Votre numéro de reçu provisoire : <strong>{paymentData.receiptNumber}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Succès */}
              {paymentStatus === "SUCCESS" && (
                <div className="status-screen">
                  <div className="status-icon success" style={{ color: "var(--success)" }}>
                    <Icon.Success />
                  </div>
                  <div className="status-title" style={{ color: "var(--success)" }}>Paiement validé !</div>
                  <p className="status-message">
                    Votre paiement de <strong>{selectedProgram ? formatAmount(selectedProgram.amount) : ""}</strong> a été reçu avec succès. Téléchargez votre déclaration de recette officielle.
                  </p>

                  {/* Carte reçu */}
                  <div className="receipt-card">
                    <div className="receipt-card-header">
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "2px" }}>Déclaration de recette</div>
                        <div className="receipt-number">{paymentData?.receiptNumber}</div>
                      </div>
                      <div className="receipt-badge">
                        <Icon.Check /> PAYÉ
                      </div>
                    </div>
                    <div className="receipt-rows">
                      {[
                        ["Étudiant",        form.fullName],
                        ["Matricule",       form.matricule],
                        ["Établissement",   establishment?.name || "—"],
                        ["Parcours",        selectedProgram ? `${selectedProgram.name} — ${selectedProgram.level}` : "—"],
                        ["Montant réglé",   selectedProgram ? formatAmount(selectedProgram.amount) : "—"],
                        ["Mode de paiement", form.paymentMethod + " Mobile Money"],
                        ["Année académique", CURRENT_YEAR],
                      ].map(([label, value]) => (
                        <div className="receipt-row" key={label}>
                          <span className="receipt-row-label">{label}</span>
                          <span className="receipt-row-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="btn-row" style={{ width: "100%" }}>
                    <a
                      href={getReceiptUrl(paymentData?.receiptNumber)}
                      className="btn btn-success"
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon.Download /> Télécharger mon reçu PDF
                    </a>
                  </div>

                  <p style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Présentez ce document à votre établissement pour obtenir votre attestation d'inscription.
                  </p>
                </div>
              )}

              {/* Échec */}
              {paymentStatus === "FAILED" && (
                <div className="status-screen">
                  <div className="status-icon error" style={{ color: "var(--error)" }}>
                    <Icon.Error />
                  </div>
                  <div className="status-title" style={{ color: "var(--error)" }}>Paiement échoué</div>
                  <p className="status-message">
                    Le paiement n'a pas pu être traité. Cela peut être dû à un solde insuffisant ou à un délai de confirmation dépassé.
                  </p>
                  <div className="btn-row" style={{ width: "100%", marginTop: "2rem" }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => { setStep(3); setPaymentStatus(null); setPaymentData(null); }}
                    >
                      <Icon.ArrowLeft /> Réessayer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
