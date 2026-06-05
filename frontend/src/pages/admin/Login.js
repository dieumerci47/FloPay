// src/pages/admin/Login.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuth";
import { Mark, Mail, Lock, ArrowRight, Shield } from "../../components/admin/icons";
import { Spinner } from "../../components/admin/ui";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Connexion impossible. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      {/* Ambiance */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-gold/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-ink-600/40 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        {/* Marque */}
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold shadow-glow">
            <Mark className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-white">FloPay</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-gold/80">
              <Shield className="h-3 w-3" /> Espace administration
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-white/8 bg-ink-900/60 p-6 shadow-card backdrop-blur-xl"
        >
          <h1 className="font-display text-lg font-bold text-white">Connexion</h1>
          <p className="mt-1 text-[0.82rem] text-white/45">Accès réservé au personnel de la scolarité.</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[0.82rem] text-red-300">
              {error}
            </div>
          )}

          {/* Email */}
          <label className="mt-5 block">
            <span className="mb-1.5 block text-[0.72rem] font-semibold uppercase tracking-wider text-white/45">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3.5 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20">
              <Mail className="h-4 w-4 flex-none text-white/35" />
              <input
                type="email" autoComplete="username" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@umg-paytech.cg"
                className="w-full bg-transparent py-2.5 text-[0.9rem] text-white placeholder-white/25 outline-none"
              />
            </div>
          </label>

          {/* Mot de passe */}
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[0.72rem] font-semibold uppercase tracking-wider text-white/45">Mot de passe</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3.5 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20">
              <Lock className="h-4 w-4 flex-none text-white/35" />
              <input
                type={show ? "text" : "password"} autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent py-2.5 text-[0.9rem] text-white placeholder-white/25 outline-none"
              />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="text-[0.7rem] font-semibold uppercase tracking-wide text-white/40 hover:text-white/70">
                {show ? "Cacher" : "Voir"}
              </button>
            </div>
          </label>

          <button
            type="submit" disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-[0.92rem] font-bold text-ink-950 shadow-glow transition hover:bg-gold-400 disabled:opacity-60"
          >
            {loading ? <Spinner className="h-4 w-4 border-ink-950/30 border-t-ink-950" /> : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-5 text-center text-[0.72rem] text-white/30">
          Sessions sécurisées · accès tracé et cloisonné par établissement
        </p>
      </div>
    </div>
  );
}
