// src/pages/admin/ChangePassword.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuth";
import { apiChangePassword } from "../../services/adminApi";
import { Mark, Lock, ArrowRight, Shield } from "../../components/admin/icons";
import { Spinner } from "../../components/admin/ui";

// Règle alignée sur le backend : 8+ caractères, 1 maj, 1 min, 1 chiffre, 1 spécial
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ChangePassword() {
  const { admin, setAdmin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  const firstTime = admin?.mustChangePassword;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) return setError("Les deux nouveaux mots de passe ne correspondent pas.");
    if (!STRONG.test(next)) return setError("Le mot de passe doit faire 8 caractères min, avec majuscule, minuscule, chiffre et caractère spécial.");
    if (next === current) return setError("Le nouveau mot de passe doit être différent du provisoire.");

    setLoading(true);
    try {
      const { admin: updated } = await apiChangePassword(current, next);
      setAdmin(updated);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Changement impossible. Réessayez.");
      setLoading(false);
    }
  };

  const Input = ({ label, value, onChange, placeholder, autoFocus }) => (
    <label className="block">
      <span className="mb-1.5 block text-[0.72rem] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3.5 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20">
        <Lock className="h-4 w-4 flex-none text-white/35" />
        <input
          type="password" required value={value} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-[0.9rem] text-white placeholder-white/25 outline-none"
        />
      </div>
    </label>
  );

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-gold/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-ink-600/40 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold shadow-glow"><Mark className="h-6 w-6" /></div>
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-white">FloPay</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold/80">
              <Shield className="h-3 w-3" /> Sécurité du compte
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-white/8 bg-ink-900/60 p-6 shadow-card backdrop-blur-xl">
          <h1 className="font-display text-lg font-bold text-white">
            {firstTime ? "Première connexion" : "Changer mon mot de passe"}
          </h1>
          <p className="mt-1 text-[0.82rem] text-white/45">
            {firstTime
              ? "Pour sécuriser votre compte, définissez un nouveau mot de passe personnel."
              : "Choisissez un nouveau mot de passe."}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[0.82rem] text-red-300">{error}</div>
          )}

          <div className="mt-5 space-y-4">
            {Input({ label: firstTime ? "Mot de passe provisoire" : "Mot de passe actuel", value: current, onChange: setCurrent, placeholder: "••••••••", autoFocus: true })}
            {Input({ label: "Nouveau mot de passe", value: next, onChange: setNext, placeholder: "8+ car., Maj, min, chiffre, spécial" })}
            {Input({ label: "Confirmer le nouveau", value: confirm, onChange: setConfirm, placeholder: "Retapez le mot de passe" })}
          </div>

          <button
            type="submit" disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-[0.92rem] font-bold text-ink-950 shadow-glow transition hover:bg-gold-400 disabled:opacity-60"
          >
            {loading ? <Spinner className="h-4 w-4 border-ink-950/30 border-t-ink-950" /> : <>Enregistrer <ArrowRight className="h-4 w-4" /></>}
          </button>

          <button
            type="button" onClick={() => logout().then(() => navigate("/admin/login", { replace: true }))}
            className="mt-3 w-full text-center text-[0.76rem] font-medium text-white/40 hover:text-white/70"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
