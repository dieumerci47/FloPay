// src/components/admin/ui.js — primitives partagées de l'espace admin
import React from "react";

export const fmtAmount = (n) => new Intl.NumberFormat("fr-FR").format(Number(n) || 0);
export const fmtMoney  = (n) => fmtAmount(n) + " F";
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// ── Badge de statut paiement ──────────────────────────────────────────────────
const STATUS = {
  SUCCESS:   { label: "Payé",      cls: "bg-mint/15 text-emerald-300 ring-mint/30" },
  PENDING:   { label: "En attente", cls: "bg-gold/15 text-gold-300 ring-gold/30" },
  FAILED:    { label: "Échoué",    cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
  CANCELLED: { label: "Annulé",    cls: "bg-white/10 text-white/50 ring-white/15" },
};
export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ring-1 ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {s.label}
    </span>
  );
}

// ── Carte statistique ─────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, accent = "gold", delay = 0 }) {
  const ring = {
    gold: "text-gold",
    mint: "text-emerald-400",
    red:  "text-red-400",
    white:"text-white/70",
  }[accent];
  return (
    <div
      className="animate-fade-up rounded-2xl border border-white/8 bg-ink-900/60 p-5 shadow-card backdrop-blur"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ${ring}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="tabular mt-3 font-display text-3xl font-extrabold tracking-tight text-white">{value}</p>
      {sub && <p className="mt-1 text-[0.78rem] text-white/45">{sub}</p>}
    </div>
  );
}

// ── Carte panneau ─────────────────────────────────────────────────────────────
export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-white/8 bg-ink-900/50 shadow-card backdrop-blur ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="font-display text-[0.95rem] font-bold text-white">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ className = "h-5 w-5" }) => (
  <span className={`inline-block animate-spin rounded-full border-2 border-white/15 border-t-gold ${className}`} />
);

// ── Bouton primaire ───────────────────────────────────────────────────────────
export function Button({ children, loading, className = "", variant = "gold", ...rest }) {
  const styles = {
    gold:  "bg-gold text-ink-950 hover:bg-gold-400 shadow-glow",
    ghost: "bg-white/5 text-white hover:bg-white/10 ring-1 ring-white/10",
    danger:"bg-red-500/90 text-white hover:bg-red-500",
  }[variant];
  return (
    <button
      disabled={loading || rest.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.85rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ── Champ texte ───────────────────────────────────────────────────────────────
export function Field({ icon: Icon, label, ...rest }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[0.75rem] font-semibold uppercase tracking-wider text-white/45">{label}</span>}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3.5 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20">
        {Icon && <Icon className="h-4 w-4 flex-none text-white/35" />}
        <input
          className="w-full bg-transparent py-2.5 text-[0.9rem] text-white placeholder-white/25 outline-none"
          {...rest}
        />
      </div>
    </label>
  );
}
