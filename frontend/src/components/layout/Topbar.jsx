import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, Menu, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAlerts } from '../../services/alertApi';
import ConfirmationModal from '../common/ConfirmationModal';
import topbarRigBg from '../../assets/topbar-rig-bg.jpg';

const ROUTE_INFO = {
  '/': { title: 'Dashboard', section: 'Overview' },
  '/dashboard': { title: 'Dashboard', section: 'Overview' },
  '/nearby-wells': { title: 'Nearby Wells', section: 'Geospatial' },
  '/well-intelligence': { title: 'Well Intelligence', section: 'Subsurface' },
  '/knowledge': { title: 'Knowledge Repository', section: 'Archives' },
  '/risk-intelligence': { title: 'Risk Intelligence', section: 'Safety' },
  '/live-operations': { title: 'Live Operations', section: 'Telemetry' },
  '/alerts': { title: 'Alerts', section: 'Monitoring' },
  '/documents': { title: 'Documents', section: 'Records' },
  '/analytics': { title: 'Analytics', section: 'Benchmarks' },
  '/settings': { title: 'Settings', section: 'System' },
};

export default function Topbar({ onMobileToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  // Reflect the real active-alert count on the bell badge instead of a fixed
  // placeholder number, so it stays honest whether the app is on live or
  // fallback data. Re-checked on every navigation so acknowledging/resolving
  // an alert on the Alerts page updates the badge on return.
  useEffect(() => {
    let cancelled = false;
    getAlerts()
      .then((res) => {
        if (!cancelled) setActiveAlertCount(res.summary?.active ?? 0);
      })
      .catch(() => {
        if (!cancelled) setActiveAlertCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const current = ROUTE_INFO[location.pathname] || {
    title: 'Dashboard',
    section: 'Overview',
  };

  const displayName = username || 'Oil001';

  return (
    <header className="nwis-topbar relative flex h-16 w-full items-center justify-between px-4 sm:px-6 select-none transition-colors duration-200">
      {/* Panoramic field background */}
      <div
        className="nwis-topbar-bg pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${topbarRigBg})`,
        }}
        aria-hidden="true"
      />

      {/* Subtle overlay for optimal contrast and readability */}
      <div className="nwis-topbar-overlay pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

      {/* Left: Mobile Toggle & Breadcrumbs (NWIS › Overview › Dashboard) */}
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMobileToggle}
          aria-label="Toggle navigation menu"
          className="nwis-btn flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-black/5 hover:text-slate-900 lg:hidden dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs sm:text-[13px] truncate">
          <span className="nwis-bc-muted font-semibold text-slate-900 dark:text-zinc-200">NWIS</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400 shrink-0" strokeWidth={2.2} />
          <span className="nwis-bc-muted font-medium text-slate-800 dark:text-zinc-300">{current.section}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400 shrink-0" strokeWidth={2.2} />
          <h1 className="nwis-bc-active truncate font-bold text-slate-950 dark:text-white text-xs sm:text-[13px]">
            {current.title}
          </h1>
        </nav>
      </div>

      {/* Right: eRTMAC Live Pill, Alerts Bell with badge, User Profile */}
      <div className="relative z-10 flex items-center gap-4 sm:gap-6 shrink-0">
        {/* eRTMAC Live Status Pill */}
        <div
          className="nwis-ertmac-pill flex items-center gap-2 rounded-full px-3.5 sm:px-4 py-1.5 shadow-sm border border-black/40 dark:border-white/10"
          style={{ backgroundColor: '#10161d', color: '#ffffff' }}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className="nwis-ertmac-dot absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: '#10b981' }}
            ></span>
            <span
              className="nwis-ertmac-dot relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}
            ></span>
          </span>
          <span
            className="nwis-ertmac-text font-bold text-xs tracking-wider"
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          >
            eRTMAC Live
          </span>
        </div>

        {/* Notification Bell with Badge - Standalone transparent icon on background */}
        <button
          type="button"
          onClick={() => navigate('/alerts')}
          aria-label={`System notifications (${activeAlertCount} active alert${activeAlertCount === 1 ? '' : 's'})`}
          className="nwis-btn nwis-bell-btn relative flex h-8 w-8 items-center justify-center rounded-full text-slate-800 hover:text-slate-950 hover:bg-black/5 transition-colors dark:text-zinc-200 dark:hover:text-white dark:hover:bg-white/10"
        >
          <Bell className="h-5 w-5" strokeWidth={1.8} />
          {activeAlertCount > 0 && (
            <span className="nwis-bell-badge absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white shadow-xs">
              {activeAlertCount > 9 ? '9+' : activeAlertCount}
            </span>
          )}
        </button>

        {/* User Profile - Standalone with white circular avatar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="nwis-btn nwis-profile-btn flex items-center gap-2 sm:gap-2.5 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open user menu"
            aria-expanded={profileOpen}
          >
            {/* User Avatar Circle: White background with clean dark user outline icon */}
            <div className="nwis-user-avatar flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white dark:bg-[#1a232f] border border-slate-300 dark:border-white/20 text-slate-800 dark:text-zinc-200 shadow-xs">
              <User className="h-4 w-4" strokeWidth={2} />
            </div>

            {/* Username & Subtitle */}
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="nwis-user-name text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                {displayName}
              </span>
              <span className="nwis-user-role text-[10px] text-slate-600 dark:text-zinc-400 font-normal">
                Drilling Operations
              </span>
            </div>

            {/* Dropdown Chevron */}
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-600 dark:text-zinc-400 transition-transform duration-200 ${
                profileOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-white/[0.1] dark:bg-[#141b22]/95 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06] mb-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{displayName}</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">Drilling Operations</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLogoutOpen(true);
                  setProfileOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={logoutOpen}
        title="Logout Confirmation"
        message="Are you sure you want to log out?"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          logout();
          setLogoutOpen(false);
          navigate('/login', { replace: true });
        }}
      />
    </header>
  );
}

