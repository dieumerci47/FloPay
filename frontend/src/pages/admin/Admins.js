// src/pages/admin/Admins.js  (super admin)
import React, { useEffect, useState } from "react";
import {
  apiListAdmins, apiCreateAdmin, apiSetAdminActive, apiResetAdminPwd, apiEstablishments,
} from "../../services/adminApi";
import { useAdminAuth } from "../../context/AdminAuth";
import { Panel, Spinner, Button, fmtDateTime } from "../../components/admin/ui";
import { Plus, Users, Shield, Building, Cross } from "../../components/admin/icons";

const ROLE_LABEL = { SUPER_ADMIN: "Super admin", ESTABLISHMENT_ADMIN: "Admin établissement" };

export default function Admins() {
  const { admin: current } = useAdminAuth();
  const [admins, setAdmins]   = useState([]);
  const [establishments, setEst] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]     = useState(null);

  const load = () => {
    setLoading(true);
    apiListAdmins().then(setAdmins).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); apiEstablishments().then(setEst).catch(() => {}); }, []);

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const toggleActive = async (a) => {
    try { await apiSetAdminActive(a.id, !a.isActive); flash(a.isActive ? "Compte désactivé" : "Compte réactivé"); load(); }
    catch (e) { flash(e.response?.data?.message || "Échec", false); }
  };

  const resetPwd = async (a) => {
    const pwd = window.prompt(`Nouveau mot de passe pour ${a.fullName}\n(8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre)`);
    if (!pwd) return;
    try { await apiResetAdminPwd(a.id, pwd); flash("Mot de passe réinitialisé"); }
    catch (e) { flash(e.response?.data?.message || "Mot de passe refusé", false); }
  };

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-gold/70">Administration</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Comptes admin</h1>
          <p className="mt-1 text-[0.88rem] text-white/45">{admins.length} compte{admins.length > 1 ? "s" : ""} · gérez les accès par établissement.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Nouvel admin</Button>
      </header>

      {toast && (
        <div className={"rounded-xl px-4 py-3 text-[0.84rem] font-medium " + (toast.ok ? "bg-mint/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>
          {toast.msg}
        </div>
      )}

      <Panel>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : (
          <div className="divide-y divide-white/5">
            {admins.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className={"flex h-10 w-10 flex-none items-center justify-center rounded-xl " +
                  (a.role === "SUPER_ADMIN" ? "bg-gold/15 text-gold" : "bg-white/5 text-white/60")}>
                  {a.role === "SUPER_ADMIN" ? <Shield className="h-5 w-5" /> : <Building className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-white">{a.fullName}</p>
                    {!a.isActive && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[0.64rem] font-semibold text-red-300">Désactivé</span>}
                    {a.id === current.id && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.64rem] font-semibold text-white/60">Vous</span>}
                  </div>
                  <p className="truncate text-[0.78rem] text-white/40">{a.email}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[0.78rem] font-medium text-white/70">{ROLE_LABEL[a.role]}</p>
                  <p className="text-[0.72rem] text-white/40">{a.establishment ? a.establishment.name : "Tous établissements"}</p>
                </div>
                <div className="hidden text-right md:block">
                  <p className="text-[0.72rem] text-white/35">Dernière connexion</p>
                  <p className="text-[0.76rem] text-white/55">{a.lastLoginAt ? fmtDateTime(a.lastLoginAt) : "Jamais"}</p>
                </div>
                {a.id !== current.id && (
                  <div className="flex gap-2">
                    <button onClick={() => resetPwd(a)} className="rounded-lg bg-white/5 px-3 py-1.5 text-[0.74rem] font-semibold text-white/70 transition hover:bg-white/10">Mot de passe</button>
                    <button onClick={() => toggleActive(a)}
                      className={"rounded-lg px-3 py-1.5 text-[0.74rem] font-semibold transition " +
                        (a.isActive ? "bg-red-500/10 text-red-300 hover:bg-red-500/20" : "bg-mint/15 text-emerald-300 hover:bg-mint/25")}>
                      {a.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {admins.length === 0 && <p className="py-16 text-center text-[0.88rem] text-white/40">Aucun admin.</p>}
          </div>
        )}
      </Panel>

      {showCreate && (
        <CreateAdminModal
          establishments={establishments}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); flash("Admin créé"); load(); }}
        />
      )}
    </div>
  );
}

function CreateAdminModal({ establishments, onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "ESTABLISHMENT_ADMIN", establishmentId: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const payload = { ...form };
      if (payload.role === "SUPER_ADMIN") delete payload.establishmentId;
      await apiCreateAdmin(payload);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || "Création impossible");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-md animate-fade-up rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold"><Users className="h-5 w-5" /></span>
            <h2 className="font-display text-lg font-bold text-white">Nouvel admin</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"><Cross className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[0.82rem] text-red-300">{error}</div>}

        <div className="space-y-3.5">
          <ModalField label="Nom complet" value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="Jean Mabiala" required />
          <ModalField label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="admin.fst@umg-paytech.cg" required />
          <ModalField label="Mot de passe" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="8+ car., Maj, min, chiffre" required />

          <div>
            <span className="mb-1.5 block text-[0.72rem] font-semibold uppercase tracking-wider text-white/45">Rôle</span>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-ink-950/60 p-1">
              {[["ESTABLISHMENT_ADMIN", "Établissement"], ["SUPER_ADMIN", "Super admin"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("role", v)}
                  className={"rounded-lg py-2 text-[0.8rem] font-semibold transition " + (form.role === v ? "bg-gold text-ink-950" : "text-white/55 hover:text-white")}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.role === "ESTABLISHMENT_ADMIN" && (
            <div>
              <span className="mb-1.5 block text-[0.72rem] font-semibold uppercase tracking-wider text-white/45">Établissement</span>
              <select required value={form.establishmentId} onChange={(e) => set("establishmentId", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-[0.88rem] text-white outline-none focus:border-gold/50">
                <option value="" className="bg-ink-900">— Choisir —</option>
                {establishments.map((e) => <option key={e.id} value={e.id} className="bg-ink-900">{e.name} ({e.code})</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading} className="flex-1">Créer le compte</Button>
        </div>
      </form>
    </div>
  );
}

function ModalField({ label, value, onChange, type = "text", ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.72rem] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-[0.88rem] text-white placeholder-white/25 outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
        {...rest}
      />
    </label>
  );
}
