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
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  User: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Building: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M8 21V12h8v9M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  ),
  Phone: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 18l.2-1.08z" />
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Success: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Error: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  Shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
};

// ── Constantes ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Identité" },
  { id: 2, label: "Inscription" },
  { id: 3, label: "Paiement" },
];

// Années académiques proposées au paiement (année courante + 2 précédentes)
const ACADEMIC_YEARS = (() => {
  const now = new Date();
  // l'année académique démarre vers août / septembre
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return [0, 1, 2].map((i) => `${start - i}-${start - i + 1}`);
})();
const CURRENT_YEAR = ACADEMIC_YEARS[0];

const FEATURES = [
  "Paiement 100 % sécurisé, sans file d'attente",
  "Reçu PDF officiel généré instantanément",
  "Disponible 24h/24, 7j/7, depuis votre téléphone",
  "Compatible MTN MoMo & Airtel Money",
];

// ── Helpers de style ───────────────────────────────────────────────────────────
const cx = (...a) => a.filter(Boolean).join(" ");

const inputBase =
  "w-full rounded-xl border bg-white px-4 py-3 text-[0.94rem] text-ink-900 placeholder:text-ink-900/30 shadow-sm outline-none transition duration-200 hover:border-ink-900/30 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10";
const inputOk = "border-ink-900/10";
const inputErr = "border-red-400 focus:border-red-500 focus:ring-red-500/10";
const labelCls = "flex items-center gap-1 text-[0.82rem] font-semibold text-ink-900/80";

// ── Composant principal ────────────────────────────────────────────────────────
export default function PaymentForm() {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    phone: "",
    establishmentId: "",
    academicYear: "",
    level: "",
    programId: "",
    paymentMethod: "",
    paymentPhone: "",
  });

  const [errors, setErrors] = useState({});

  const [establishments, setEstablishments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [paymentData, setPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const [loading, setLoading] = useState(false);
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
    if (!form.establishmentId) {
      setPrograms([]);
      setSelectedProgram(null);
      return;
    }
    setLoadingPrograms(true);
    setForm((f) => ({ ...f, level: "", programId: "" }));
    setSelectedProgram(null);
    getPrograms(form.establishmentId)   // tous les programmes — filtrés côté client
      .then(setPrograms)
      .catch(() => {})
      .finally(() => setLoadingPrograms(false));
  }, [form.establishmentId]);

  // ── Mise à jour programme sélectionné ─────────────────────────────────────
  useEffect(() => {
    if (!form.programId) {
      setSelectedProgram(null);
      return;
    }
    const prog = programs.find((p) => p.id === form.programId);
    setSelectedProgram(prog || null);
  }, [form.programId, programs]);

  // ── Polling statut paiement ───────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    if (!paymentData?.paymentId) return;
    try {
      const data = await getPaymentStatus(paymentData.paymentId);
      setPaymentStatus(data.status);
      if (data.status === "SUCCESS" || data.status === "FAILED") return;
    } catch (err) {
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

  const formatAmount = (n) => new Intl.NumberFormat("fr-FR").format(n) + " F CFA";

  // ── Validations par étape ─────────────────────────────────────────────────
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.lastName.trim()) errs.lastName = "Le nom est requis";
      if (!form.firstName.trim()) errs.firstName = "Le(s) prénom(s) est/sont requis";
      if (!form.gender) errs.gender = "Choisissez votre sexe";
      if (!form.phone.trim()) errs.phone = "Le téléphone est requis";
    }
    if (s === 2) {
      if (!form.establishmentId) errs.establishmentId = "Choisissez un établissement";
      if (!form.academicYear) errs.academicYear = "Choisissez l'année académique";
      if (!form.level) errs.level = "Choisissez votre niveau";
      if (!form.programId) errs.programId = "Choisissez un parcours";
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
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setStep((s) => s + 1);
  };

  // ── Soumettre le paiement ─────────────────────────────────────────────────
  const submitPayment = async () => {
    const errs = validateStep(3);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
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

  // ── Cascade niveau → parcours (l'année est indépendante du programme) ───────
  const availableLevels = form.establishmentId
    ? [...new Set(programs.map((p) => p.level))].sort()
    : [];
  const availableParcours = form.level
    ? programs.filter((p) => p.level === form.level)
    : [];

  // Choisir un niveau réinitialise le parcours
  const setLevel = (e) => {
    setForm((f) => ({ ...f, level: e.target.value, programId: "" }));
    setErrors((er) => ({ ...er, level: "" }));
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Panneau gauche (hero) ── */}
      <aside className="grain relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Dégradé maillé + halos */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 12% 8%, rgba(232,160,32,0.16), transparent 42%), radial-gradient(120% 100% at 95% 100%, rgba(31,77,117,0.55), transparent 55%), linear-gradient(160deg, #0a1f30 0%, #06141f 100%)",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[56px] border-gold/10 animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full border-[40px] border-white/[0.04] animate-float" />
        <div className="pointer-events-none absolute right-20 top-1/3 h-2.5 w-2.5 rounded-full bg-gold/70 blur-[1px] animate-float" />

        {/* Marque */}
        <div className="relative z-10 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold shadow-glow">
              <svg viewBox="0 0 24 24" fill="none" stroke="#06141f" strokeWidth="2.5" className="h-6 w-6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2.5" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="7" cy="15" r="1.4" fill="#06141f" stroke="none" />
              </svg>
            </div>
            <div>
              <div className="font-display text-xl font-bold tracking-tight text-white">FloPay</div>
              <div className="text-xs text-white/45">Université Marien Ngouabi</div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.72rem] font-medium uppercase tracking-wider text-gold-300 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold-300 opacity-75 animate-pulse-ring" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-300" />
            </span>
            Scolarité en ligne · 2 minutes
          </div>
          <h1 className="font-display text-[2.7rem] font-extrabold leading-[1.08] tracking-tight text-white text-balance animate-fade-up" style={{ animationDelay: "150ms" }}>
            Payez vos frais de scolarité{" "}
            <span className="bg-gradient-to-r from-gold-300 to-gold bg-clip-text text-transparent">
              sans faire la queue.
            </span>
          </h1>
          <p className="mt-5 max-w-sm text-[0.98rem] leading-relaxed text-white/55 animate-fade-up" style={{ animationDelay: "230ms" }}>
            Réglez depuis votre téléphone via Mobile Money. Votre déclaration de
            recette officielle est générée instantanément — prête à présenter à
            votre établissement.
          </p>

          <ul className="mt-9 space-y-3.5">
            {FEATURES.map((f, i) => (
              <li
                key={f}
                className="flex items-center gap-3 text-[0.9rem] text-white/70 animate-fade-up"
                style={{ animationDelay: `${300 + i * 70}ms` }}
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold/15 text-gold-300 ring-1 ring-gold/25">
                  <Icon.Check className="h-3.5 w-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Bas : opérateurs + confiance */}
        <div className="relative z-10 animate-fade-up" style={{ animationDelay: "640ms" }}>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#FFC300] px-3.5 py-1.5 text-[0.78rem] font-bold tracking-tight text-[#1A1A1A]">MTN MoMo</span>
            <span className="rounded-full bg-[#E8192C] px-3.5 py-1.5 text-[0.78rem] font-bold tracking-tight text-white">Airtel Money</span>
            <span className="text-[0.78rem] text-white/40">acceptés</span>
          </div>
          <div className="mt-5 flex items-center gap-2 text-[0.76rem] text-white/35">
            <Icon.Shield className="h-4 w-4 text-gold/70" />
            Transactions chiffrées · Aucune donnée bancaire stockée
          </div>
        </div>
      </aside>

      {/* ── Panneau droit (formulaire) ── */}
      <main className="scroll-slim flex min-h-screen flex-col bg-cream px-5 py-8 sm:px-8 lg:max-h-screen lg:overflow-y-auto lg:px-10 lg:py-12">
        {/* En-tête marque (mobile) */}
        <div className="mb-7 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5" className="h-5 w-5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2.5" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <div className="font-display text-base font-bold text-ink-900">FloPay</div>
            <div className="text-[0.7rem] text-ink-900/50">Université Marien Ngouabi</div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col">
          {/* Progress */}
          {step < 4 && (
            <div className="mb-9 flex items-center">
              {STEPS.map((s, i) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cx(
                          "flex h-9 w-9 items-center justify-center rounded-full text-[0.82rem] font-bold transition-all duration-300",
                          done && "bg-ink-900 text-white",
                          active && "bg-ink-900 text-white ring-4 ring-ink-900/15",
                          !active && !done && "border border-ink-900/15 bg-white text-ink-900/40"
                        )}
                      >
                        {done ? <Icon.Check className="h-4 w-4" /> : s.id}
                      </div>
                      <span
                        className={cx(
                          "text-[0.72rem] font-medium transition-colors",
                          active || done ? "text-ink-900" : "text-ink-900/40"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="relative mx-1 -mt-5 h-0.5 flex-1 overflow-hidden rounded-full bg-ink-900/10">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-ink-900 transition-all duration-500"
                          style={{ width: step > s.id ? "100%" : "0%" }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* ── ÉTAPE 1 — Identité ── */}
          {step === 1 && (
            <div key="s1" className="animate-fade-up">
              <StepHeader
                icon={<Icon.User className="h-3.5 w-3.5" />}
                badge="Étape 1 sur 3"
                title="Vos informations personnelles"
                desc="Saisissez vos informations telles qu'elles figurent sur votre dossier académique."
              />

              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom" required error={errors.lastName}>
                    <input type="text" placeholder="ex : YOUNDOUKA KOMBILA" value={form.lastName} onChange={set("lastName")} className={cx(inputBase, errors.lastName ? inputErr : inputOk)} />
                  </Field>
                  <Field label="Prénom(s)" required error={errors.firstName}>
                    <input type="text" placeholder="ex : Davy Sagesse" value={form.firstName} onChange={set("firstName")} className={cx(inputBase, errors.firstName ? inputErr : inputOk)} />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sexe" required error={errors.gender}>
                    <SelectChevron>
                      <select value={form.gender} onChange={set("gender")} className={cx(inputBase, "pr-10", errors.gender ? inputErr : inputOk)}>
                        <option value="">Choisissez</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </SelectChevron>
                  </Field>
                  <Field label="Date de naissance">
                    <input type="date" value={form.birthDate} onChange={set("birthDate")} className={cx(inputBase, inputOk)} />
                  </Field>
                </div>

                <Field label="Lieu de naissance">
                  <input type="text" placeholder="ex : Pointe-Noire" value={form.birthPlace} onChange={set("birthPlace")} className={cx(inputBase, inputOk)} />
                </Field>

                <Field label="Téléphone personnel" required error={errors.phone}>
                  <input type="tel" placeholder="ex : 06 878 6678" value={form.phone} onChange={set("phone")} className={cx(inputBase, errors.phone ? inputErr : inputOk)} />
                </Field>
              </div>

              <div className="mt-7 flex gap-3">
                <PrimaryButton onClick={nextStep}>
                  Continuer <Icon.Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 2 — Inscription ── */}
          {step === 2 && (
            <div key="s2" className="animate-fade-up">
              <StepHeader
                icon={<Icon.Building className="h-3.5 w-3.5" />}
                badge="Étape 2 sur 3"
                title="Votre inscription académique"
                desc="Sélectionnez votre établissement, l'année à payer, votre niveau puis votre parcours."
              />

              <div className="grid gap-4">
                <Field label="Établissement" required error={errors.establishmentId}>
                  <SelectChevron>
                    <select value={form.establishmentId} onChange={set("establishmentId")} disabled={loadingEstab} className={cx(inputBase, "pr-10 disabled:opacity-60", errors.establishmentId ? inputErr : inputOk)}>
                      <option value="">{loadingEstab ? "Chargement..." : "Choisissez votre établissement"}</option>
                      {establishments.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                      ))}
                    </select>
                  </SelectChevron>
                </Field>

                <Field label="Niveau" required error={errors.level}>
                  <SelectChevron>
                    <select value={form.level} onChange={setLevel} disabled={!form.establishmentId || loadingPrograms} className={cx(inputBase, "pr-10 disabled:opacity-60", errors.level ? inputErr : inputOk)}>
                      <option value="">
                        {!form.establishmentId ? "Choisissez d'abord un établissement" : loadingPrograms ? "Chargement..." : "Choisissez votre niveau"}
                      </option>
                      {availableLevels.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </SelectChevron>
                </Field>

                <Field label="Parcours" required error={errors.programId}>
                  <SelectChevron>
                    <select value={form.programId} onChange={set("programId")} disabled={!form.level} className={cx(inputBase, "pr-10 disabled:opacity-60", errors.programId ? inputErr : inputOk)}>
                      <option value="">
                        {!form.level ? "Choisissez d'abord le niveau" : "Choisissez votre parcours"}
                      </option>
                      {availableParcours.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({formatAmount(p.amount)})</option>
                      ))}
                    </select>
                  </SelectChevron>
                </Field>

                <Field label="Année académique à payer" required error={errors.academicYear}>
                  <SelectChevron>
                    <select value={form.academicYear} onChange={set("academicYear")} disabled={!form.establishmentId} className={cx(inputBase, "pr-10 disabled:opacity-60", errors.academicYear ? inputErr : inputOk)}>
                      <option value="">
                        {!form.establishmentId ? "Choisissez d'abord un établissement" : "Choisissez l'année à payer"}
                      </option>
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </SelectChevron>
                </Field>

                {selectedProgram && (
                  <SummaryCard
                    label="Montant à régler"
                    amount={selectedProgram.amount}
                    rows={[
                      ["Établissement", establishment?.code],
                      ["Parcours", selectedProgram.name],
                      ["Niveau", selectedProgram.level],
                      ["Année académique", form.academicYear],
                    ]}
                  />
                )}
              </div>

              <div className="mt-7 flex gap-3">
                <GhostButton onClick={() => setStep(1)}>
                  <Icon.ArrowLeft className="h-4 w-4" /> Retour
                </GhostButton>
                <PrimaryButton onClick={nextStep}>
                  Continuer <Icon.Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 — Paiement ── */}
          {step === 3 && (
            <div key="s3" className="animate-fade-up">
              <StepHeader
                icon={<Icon.Phone className="h-3.5 w-3.5" />}
                badge="Étape 3 sur 3"
                title="Mode de paiement"
                desc="Choisissez votre opérateur Mobile Money et entrez le numéro à débiter."
              />

              <div className="grid gap-4">
                <Field label="Opérateur Mobile Money" required error={errors.paymentMethod}>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "MTN", label: "MTN MoMo", sub: "Mobile Money Congo", bg: "bg-[#FFC300]", fg: "text-[#1A1A1A]", text: "MTN" },
                      { id: "AIRTEL", label: "Airtel Money", sub: "Airtel Money Congo", bg: "bg-[#E8192C]", fg: "text-white", text: "AIRTEL" },
                    ].map((m) => {
                      const selected = form.paymentMethod === m.id;
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setForm((f) => ({ ...f, paymentMethod: m.id }));
                            setErrors((e) => ({ ...e, paymentMethod: "" }));
                          }}
                          className={cx(
                            "group relative flex flex-col items-center gap-2.5 rounded-2xl border-2 bg-white p-4 text-center transition-all duration-200",
                            selected ? "border-ink-900 bg-ink-900/[0.03] shadow-card" : "border-ink-900/10 hover:border-ink-900/40 hover:bg-ink-900/[0.02]"
                          )}
                        >
                          <span className={cx("flex h-14 w-14 items-center justify-center rounded-xl font-display text-sm font-extrabold tracking-tight transition-transform group-hover:scale-105", m.bg, m.fg)}>
                            {m.text}
                          </span>
                          <span className="text-[0.85rem] font-semibold text-ink-900">{m.label}</span>
                          <span className="text-[0.72rem] text-ink-900/50">{m.sub}</span>
                          <span className={cx("absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white transition-all", selected ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
                            <Icon.Check className="h-3 w-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Numéro Mobile Money" required error={errors.paymentPhone}>
                  <input
                    type="tel"
                    placeholder={form.paymentMethod === "MTN" ? "ex : 06 868 XXXX" : "ex : 07 XXXX XXXX"}
                    value={form.paymentPhone}
                    onChange={set("paymentPhone")}
                    className={cx(inputBase, errors.paymentPhone ? inputErr : inputOk)}
                  />
                </Field>

                {selectedProgram && (
                  <SummaryCard
                    label="Total à payer"
                    amount={selectedProgram.amount}
                    rows={[
                      ["Étudiant", `${form.lastName} ${form.firstName}`.trim() || "—"],
                      ["Parcours", `${selectedProgram.name} — ${selectedProgram.level}`],
                    ]}
                  />
                )}

                <div className="flex items-start gap-2.5 rounded-xl border border-gold/30 bg-gold-100/60 px-4 py-3 text-[0.85rem] text-[#78350F]">
                  <Icon.Phone className="mt-0.5 h-4 w-4 flex-none text-gold-600" />
                  <span>Une notification s'affichera sur votre téléphone. Entrez votre code PIN pour confirmer le paiement.</span>
                </div>

                {errors.submit && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[0.85rem] text-red-800">
                    <Icon.Error className="mt-0.5 h-4 w-4 flex-none" /> {errors.submit}
                  </div>
                )}
              </div>

              <div className="mt-7 flex gap-3">
                <GhostButton onClick={() => setStep(2)}>
                  <Icon.ArrowLeft className="h-4 w-4" /> Retour
                </GhostButton>
                <PrimaryButton onClick={submitPayment} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Payer {selectedProgram ? formatAmount(selectedProgram.amount) : ""}
                      <Icon.Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 4 — Confirmation / Statut ── */}
          {step === 4 && (
            <div key="s4" className="flex flex-1 animate-fade-up flex-col items-center justify-center py-6 text-center">
              {/* En attente */}
              {paymentStatus === "PENDING" && (
                <>
                  <div className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-gold/40 animate-pulse-ring" />
                    <Icon.Clock className="h-9 w-9" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink-900">En attente de confirmation</h2>
                  <p className="mt-3 max-w-sm text-[0.92rem] leading-relaxed text-ink-900/55">
                    Une notification a été envoyée au <strong className="text-ink-900">{form.paymentPhone}</strong>. Entrez votre code PIN <strong className="text-ink-900">{form.paymentMethod} Mobile Money</strong> pour valider le paiement.
                  </p>

                  <div className="mt-7 flex flex-col items-center gap-2">
                    <div className="relative h-1 w-52 overflow-hidden rounded-full bg-ink-900/10">
                      <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-gold-300 to-gold animate-shimmer" />
                    </div>
                    <span className="text-[0.78rem] text-ink-900/45">Vérification en cours…</span>
                  </div>

                  {paymentData?.receiptNumber && (
                    <div className="mt-6 w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-left text-[0.85rem] text-ink-900/70">
                      Numéro de reçu provisoire :{" "}
                      <strong className="font-mono text-ink-900">{paymentData.receiptNumber}</strong>
                    </div>
                  )}
                </>
              )}

              {/* Succès */}
              {paymentStatus === "SUCCESS" && (
                <>
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-mint/10 text-mint">
                    <Icon.Success className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-mint">Paiement validé !</h2>
                  <p className="mt-3 max-w-sm text-[0.92rem] leading-relaxed text-ink-900/55">
                    Votre paiement de{" "}
                    <strong className="text-ink-900">{selectedProgram ? formatAmount(selectedProgram.amount) : ""}</strong>{" "}
                    a été reçu avec succès. Téléchargez votre déclaration de recette officielle.
                  </p>

                  {/* Carte reçu */}
                  <div className="mt-6 w-full overflow-hidden rounded-2xl border border-ink-900/10 bg-white text-left shadow-card">
                    <div className="flex items-start justify-between border-b border-dashed border-ink-900/15 px-5 py-4">
                      <div>
                        <div className="text-[0.72rem] uppercase tracking-wide text-ink-900/45">Déclaration de recette</div>
                        <div className="mt-0.5 font-mono text-[0.92rem] font-bold tracking-wide text-ink-900">{paymentData?.receiptNumber}</div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2.5 py-1 text-[0.72rem] font-bold text-mint">
                        <Icon.Check className="h-3 w-3" /> PAYÉ
                      </span>
                    </div>
                    <div className="space-y-2.5 px-5 py-4">
                      {[
                        ["Étudiant", `${form.lastName} ${form.firstName}`.trim()],
                        ["Établissement", establishment?.name || "—"],
                        ["Parcours", selectedProgram ? `${selectedProgram.name} — ${selectedProgram.level}` : "—"],
                        ["Montant réglé", selectedProgram ? formatAmount(selectedProgram.amount) : "—"],
                        ["Mode de paiement", form.paymentMethod + " Mobile Money"],
                        ["Année académique", form.academicYear || "—"],
                      ].map(([label, value]) => (
                        <div className="flex items-center justify-between gap-4 text-[0.85rem]" key={label}>
                          <span className="text-ink-900/50">{label}</span>
                          <span className="text-right font-medium text-ink-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <a
                    href={getReceiptUrl(paymentData?.receiptNumber)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-6 py-3.5 text-[0.94rem] font-semibold text-white shadow-card transition hover:brightness-110 active:translate-y-px"
                  >
                    <Icon.Download className="h-4 w-4" /> Télécharger mon reçu PDF
                  </a>
                  <p className="mt-4 text-[0.82rem] text-ink-900/45">
                    Présentez ce document à votre établissement pour obtenir votre attestation d'inscription.
                  </p>
                </>
              )}

              {/* Échec */}
              {paymentStatus === "FAILED" && (
                <>
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <Icon.Error className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-red-600">Paiement échoué</h2>
                  <p className="mt-3 max-w-sm text-[0.92rem] leading-relaxed text-ink-900/55">
                    Le paiement n'a pas pu être traité. Cela peut être dû à un solde insuffisant ou à un délai de confirmation dépassé.
                  </p>
                  <PrimaryButton
                    className="mt-7 max-w-xs"
                    onClick={() => {
                      setStep(3);
                      setPaymentStatus(null);
                      setPaymentData(null);
                    }}
                  >
                    <Icon.ArrowLeft className="h-4 w-4" /> Réessayer
                  </PrimaryButton>
                </>
              )}
            </div>
          )}

          {/* Pied de page */}
          <div className="mt-auto pt-9 text-center text-[0.74rem] text-ink-900/35">
            FloPay · Paiement sécurisé des frais de scolarité — UMG · {CURRENT_YEAR}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sous-composants UI ─────────────────────────────────────────────────────────
function StepHeader({ icon, badge, title, desc }) {
  return (
    <div className="mb-7">
      <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-gold-600">
        {icon} {badge}
      </div>
      <h2 className="font-display text-[1.55rem] font-bold leading-tight text-ink-900">{title}</h2>
      <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-900/55">{desc}</p>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelCls}>
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error && (
        <span className="flex items-center gap-1 text-[0.78rem] font-medium text-red-600">
          <Icon.Error className="h-3.5 w-3.5" /> {error}
        </span>
      )}
    </label>
  );
}

function SelectChevron({ children }) {
  return (
    <div className="relative">
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/45" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function SummaryCard({ label, amount, rows }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 shadow-card">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 80% at 90% 0%, rgba(232,160,32,0.18), transparent 50%)",
        }}
      />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[28px] border-gold/10" />
      <div className="relative">
        <div className="text-[0.74rem] uppercase tracking-[0.08em] text-white/45">{label}</div>
        <div className="mt-1 font-mono text-[2.4rem] font-bold leading-none tabular text-gold-300">
          {new Intl.NumberFormat("fr-FR").format(amount)}
          <span className="ml-1.5 text-[1.05rem] font-medium text-white/55">F CFA</span>
        </div>
        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="text-[0.82rem] text-white/45">{k}</span>
              <span className="text-right text-[0.85rem] font-medium text-white/90">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-3.5 text-[0.94rem] font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-800 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-ink-900/15 bg-transparent px-5 py-3.5 text-[0.94rem] font-semibold text-ink-900/65 transition-all duration-200 hover:border-ink-900/35 hover:bg-ink-900/5 hover:text-ink-900",
        className
      )}
    >
      {children}
    </button>
  );
}
