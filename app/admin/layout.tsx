"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./admin.css";
import type { UserInfo, UserRole } from "@/app/types";

const navItems = [
  {
    href: "/admin", label: "Dashboard",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    href: "/admin/penerima", label: "Data Penerima",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: "/admin/laporan", label: "Laporan",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    href: "/admin/pengguna", label: "Pengguna",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

function getInitials(nama: string) {
  return nama.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
function getRoleLabel(role: UserRole) {
  const map: Record<UserRole, string> = { administrator: "Administrator", operator: "Operator", viewer: "Viewer" };
  return map[role] ?? role;
}

// ─── Icon Components ────────────────────────────────────────────────────────
const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconMap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // true = sidebar expanded, false = collapsed (desktop) / closed (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const currentPage = navItems.find((n) => n.href === pathname)?.label ?? "Dashboard";

  // ─── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile on first load
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const saved = localStorage.getItem("sig-theme") || "light"; // key = THEME_STORAGE_KEY
    setIsDark(saved === "dark");

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: UserInfo) => { setUser(d); setUserLoading(false); })
      .catch(() => { setUserLoading(false); router.push("/login?reason=session_expired"); });

    return () => window.removeEventListener("resize", checkMobile);
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  // ─── Theme toggle ────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sig-theme", next);
  };

  // ─── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  // ─── Sidebar class ───────────────────────────────────────────────────────
  const sidebarClass = [
    "admin-sidebar",
    isMobile
      ? (sidebarOpen ? "sidebar-mobile-open" : "")
      : (!sidebarOpen ? "sidebar-collapsed" : ""),
  ].filter(Boolean).join(" ");

  const isExpanded = isMobile ? sidebarOpen : sidebarOpen;

  return (
    <div className="admin-shell">
      {/* ── Mobile Overlay ──────────────────────────────────────────────── */}
      <div
        className={`mobile-overlay ${isMobile && sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={sidebarClass}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L28 8V16C28 22.627 22.627 29 16 30C9.373 29 4 22.627 4 16V8L16 2Z" fill="rgba(255,255,255,0.9)"/>
              <path d="M12 16.5L14.5 19L20 13" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {isExpanded && (
            <div className="brand-text">
              <span className="brand-name">SIG Dinsos</span>
              <span className="brand-sub">Kab. Purwakarta</span>
            </div>
          )}
          {/* Close button only on mobile */}
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Tutup sidebar">
              <IconX />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Menu Admin">
          {isExpanded && <span className="nav-section-label">MENU</span>}
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "nav-item-active" : ""}`}
                title={!isExpanded ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {isExpanded && <span className="nav-label">{item.label}</span>}
                {active && isExpanded && <span className="nav-dot" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className="sidebar-bottom">
          <div className={`user-card ${!isExpanded ? "user-card-collapsed" : ""}`}>
            <div className="user-avatar">
              {userLoading ? "?" : getInitials(user?.nama ?? "AD")}
            </div>
            {isExpanded && (
              <div className="user-info">
                {userLoading ? (
                  <>
                    <div className="user-skeleton" style={{ width: 80, marginBottom: 4 }} />
                    <div className="user-skeleton" style={{ width: 50 }} />
                  </>
                ) : (
                  <>
                    <span className="user-name">{user?.nama ?? "Admin"}</span>
                    <span className="user-role">{getRoleLabel(user?.role ?? "administrator")}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`logout-btn ${!isExpanded ? "logout-collapsed" : ""}`}
            aria-label="Keluar dari sistem"
            title="Keluar"
          >
            {loggingOut
              ? <span className="logout-spinner" />
              : <IconLogout />}
            {isExpanded && <span>{loggingOut ? "Keluar..." : "Keluar"}</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            {/* Single toggle button — works for BOTH desktop (collapse) and mobile (open/close) */}
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Ciutkan sidebar" : "Buka sidebar"}
              title={sidebarOpen ? "Ciutkan sidebar" : "Buka sidebar"}
            >
              <IconMenu />
            </button>
            <div className="topbar-divider" aria-hidden="true" />
            <h1 className="topbar-title">{currentPage}</h1>
          </div>

          <div className="topbar-right">
            <span className="topbar-date">
              {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            {/* Theme toggle */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isDark ? "Mode terang" : "Mode gelap"}
              title={isDark ? "Mode Terang" : "Mode Gelap"}
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            {/* Open map */}
            <Link href="/map" target="_blank" rel="noopener noreferrer" className="topbar-map-btn">
              <IconMap />
              <span>Lihat Peta</span>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
