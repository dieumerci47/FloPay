// src/components/admin/AdminLayout.js
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuth";
import { Mark, Gauge, Receipt, Wallet, Users, ScrollText, Logout } from "./icons";

const NAV = [
  { to: "/admin",          label: "Tableau de bord", icon: Gauge,      end: true },
  { to: "/admin/verifier", label: "Vérification",    icon: Receipt },
  { to: "/admin/paiements",label: "Paiements",       icon: Wallet },
  { to: "/admin/admins",   label: "Admins",          icon: Users,      superOnly: true },
  { to: "/admin/audit",    label: "Journal d'audit", icon: ScrollText, superOnly: true },
];

function NavItem({ item, onNavigate }) {
  const { icon: Icon, label, to, end } = item;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.86rem] font-medium transition " +
        (isActive
          ? "bg-white/8 text-white"
          : "text-white/55 hover:bg-white/5 hover:text-white/90")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={
              "absolute left-0 h-5 w-[3px] rounded-r-full bg-gold transition-opacity " +
              (isActive ? "opacity-100" : "opacity-0")
            }
          />
          <Icon className="h-[1.15rem] w-[1.15rem]" />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { admin, isSuperAdmin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((i) => !i.superOnly || isSuperAdmin);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const scopeLabel = isSuperAdmin ? "Supervision globale" : admin?.establishment?.name || "Établissement";

  const Sidebar = (
    <div className="flex h-full flex-col">
      {/* Marque */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold shadow-glow">
          <Mark className="h-[1.1rem] w-[1.1rem]" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-[1.02rem] font-extrabold tracking-tight text-white">FloPay</p>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-gold/80">Back-office</p>
        </div>
      </div>

      {/* Périmètre */}
      <div className="mx-4 mb-4 rounded-xl border border-white/8 bg-white/5 px-3.5 py-2.5">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-white/35">
          {isSuperAdmin ? "Rôle" : "Établissement"}
        </p>
        <p className="mt-0.5 truncate text-[0.82rem] font-semibold text-white">{scopeLabel}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {items.map((i) => <NavItem key={i.to} item={i} onNavigate={() => setOpen(false)} />)}
      </nav>

      {/* Profil + déconnexion */}
      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-600 font-display text-[0.85rem] font-bold text-ink-950">
            {(admin?.fullName || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.82rem] font-semibold text-white">{admin?.fullName}</p>
            <p className="truncate text-[0.7rem] text-white/40">{admin?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.84rem] font-medium text-white/55 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <Logout className="h-[1.1rem] w-[1.1rem]" />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="grain relative min-h-screen bg-ink-950 text-white">
      {/* Halo doré d'ambiance */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[24rem] w-[24rem] rounded-full bg-ink-600/30 blur-[120px]" />
      </div>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/8 bg-ink-900/40 backdrop-blur-xl lg:block">
        {Sidebar}
      </aside>

      {/* Top bar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/8 bg-ink-950/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold"><Mark className="h-4 w-4" /></div>
          <span className="font-display text-[0.95rem] font-extrabold text-white">FloPay</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-ink-900 shadow-2xl animate-fade-up">
            {Sidebar}
          </div>
        </div>
      )}

      {/* Contenu */}
      <main className="relative z-10 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
