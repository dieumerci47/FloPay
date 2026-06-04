// src/pages/VerifyReceipt.js
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyReceipt } from "../services/api";

const fmtAmount = (n) => new Intl.NumberFormat("fr-FR").format(n) + " F CFA";
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const STATUS_LABEL = {
  SUCCESS: "PAYÉ",
  PENDING: "EN ATTENTE",
  FAILED: "ÉCHOUÉ",
  CANCELLED: "ANNULÉ",
};

// ── Icônes inline ───────────────────────────────────────────────────────────────
const Check = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Cross = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const Mark = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#06141f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <circle cx="7" cy="15" r="1.4" fill="#06141f" stroke="none" />
  </svg>
);

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-[0.82rem] text-ink-900/50">{label}</span>
      <span className="text-right text-[0.9rem] font-semibold text-ink-900">{value || "—"}</span>
    </div>
  );
}

export default function VerifyReceipt() {
  const { receiptNumber } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null, data: null });
    verifyReceipt(receiptNumber)
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((err) => {
        const msg =
          err.response?.status === 404
            ? "Aucun reçu ne correspond à cette référence."
            : err.response?.data?.message || "Impossible de vérifier ce reçu pour le moment.";
        if (active) setState({ loading: false, error: msg, data: null });
      });
    return () => { active = false; };
  }, [receiptNumber]);

  const { loading, error, data } = state;
  const verified = data?.verified;

  return (
    <div className="grain min-h-screen bg-cream px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md animate-fade-up">
        {/* Marque */}
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold shadow-glow">
            <Mark className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">FloPay</span>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-card">
          {/* En-tête sombre */}
          <div className="bg-ink-950 px-6 py-5 text-center">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/50">
              Vérification de reçu
            </p>
            <p className="mt-1 font-mono text-[0.92rem] font-semibold text-white">{receiptNumber}</p>
          </div>

          {/* Contenu */}
          {loading && (
            <div className="flex flex-col items-center gap-3 px-6 py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-ink-900/15 border-t-gold" />
              <p className="text-[0.88rem] text-ink-900/50">Vérification en cours…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Cross className="h-8 w-8" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-ink-900">Reçu introuvable</p>
                <p className="mt-1 text-[0.88rem] text-ink-900/55">{error}</p>
              </div>
            </div>
          )}

          {!loading && data && (
            <div className="px-6 pb-7 pt-6">
              {/* Bandeau statut */}
              <div
                className={
                  "mb-6 flex items-center gap-3 rounded-2xl px-4 py-3.5 " +
                  (verified ? "bg-mint/10" : "bg-gold-100")
                }
              >
                <span
                  className={
                    "flex h-11 w-11 flex-none items-center justify-center rounded-full text-white " +
                    (verified ? "bg-mint" : "bg-gold-600")
                  }
                >
                  {verified ? <Check className="h-6 w-6" /> : <Cross className="h-6 w-6" />}
                </span>
                <div>
                  <p className={"font-display text-[1.02rem] font-bold " + (verified ? "text-mint" : "text-[#78350F]")}>
                    {verified ? "Reçu authentique" : "Reçu non validé"}
                  </p>
                  <p className="text-[0.8rem] text-ink-900/55">
                    Statut du paiement : {STATUS_LABEL[data.status] || data.status}
                  </p>
                </div>
              </div>

              {/* Montant */}
              <div className="mb-5 rounded-2xl border border-ink-900/10 bg-parchment px-5 py-4 text-center">
                <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink-900/45">
                  Montant réglé
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900">
                  {fmtAmount(data.payment.amount)}
                </p>
                <p className="mt-0.5 text-[0.8rem] text-ink-900/50">
                  Année académique {data.payment.academicYear}
                </p>
              </div>

              {/* Propriétaire du reçu */}
              <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wider text-ink-900/40">
                Propriétaire du reçu
              </p>
              <div className="divide-y divide-ink-900/5">
                <Row label="Nom complet" value={data.owner.fullName} />
                <Row label="Matricule" value={data.owner.matricule} />
                <Row label="Établissement" value={data.owner.establishment} />
                <Row label="Parcours" value={data.owner.program} />
                <Row label="Niveau" value={data.owner.level} />
              </div>

              {/* Détails paiement */}
              <p className="mb-1 mt-5 text-[0.72rem] font-semibold uppercase tracking-wider text-ink-900/40">
                Détails du paiement
              </p>
              <div className="divide-y divide-ink-900/5">
                <Row label="Mode de paiement" value={`${data.payment.method} Mobile Money`} />
                <Row label="Date de paiement" value={fmtDate(data.payment.paidAt)} />
                <Row label="Référence" value={<span className="font-mono">{data.receiptNumber}</span>} />
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[0.75rem] text-ink-900/40">
          Vérification officielle des reçus FloPay ·{" "}
          <Link to="/" className="font-semibold text-ink-700 underline-offset-2 hover:underline">
            Aller au paiement
          </Link>
        </p>
      </div>
    </div>
  );
}
