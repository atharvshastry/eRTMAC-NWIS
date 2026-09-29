import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  MapPin,
  Layers,
  BookOpen,
  Bell,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  TriangleAlert,
  MapPinned,
  FlaskConical,
  History,
} from 'lucide-react';
import sidebarRigBg from '../../assets/sidebar-rig-bg.jpg';

// Gold Derrick Rig Logo for Header
function DerrickLogo({ className = "h-10 w-9 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="derrickGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Crown Block / Mast tip */}
      <rect x="16" y="2" width="4" height="3" rx="0.5" fill="url(#derrickGold)" />
      <line x1="18" y1="0.5" x2="18" y2="2" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />

      {/* Main Derrick Legs */}
      <path d="M16 5L10 30h16L20 5h-4z" stroke="url(#derrickGold)" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(245, 158, 11, 0.05)" />

      {/* Horizontal Tiers */}
      <line x1="15.2" y1="10" x2="20.8" y2="10" stroke="#FCD34D" strokeWidth="1.1" />
      <line x1="14" y1="16" x2="22" y2="16" stroke="#FCD34D" strokeWidth="1.1" />
      <line x1="12.4" y1="22.5" x2="23.6" y2="22.5" stroke="#FCD34D" strokeWidth="1.1" />

      {/* Cross Bracing (X patterns) */}
      <line x1="15.2" y1="10" x2="22" y2="16" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />
      <line x1="20.8" y1="10" x2="14" y2="16" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />
      <line x1="14" y1="16" x2="23.6" y2="22.5" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />
      <line x1="22" y1="16" x2="12.4" y2="22.5" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />
      <line x1="12.4" y1="22.5" x2="26" y2="30" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />
      <line x1="23.6" y1="22.5" x2="10" y2="30" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />

      {/* Rig Floor Substructure */}
      <rect x="8" y="30" width="20" height="3.5" rx="0.5" stroke="url(#derrickGold)" strokeWidth="1.2" fill="rgba(245, 158, 11, 0.18)" />

      {/* Base Legs */}
      <line x1="10" y1="33.5" x2="10" y2="37" stroke="url(#derrickGold)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="33.5" x2="26" y2="37" stroke="url(#derrickGold)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Base Platform Foundation */}
      <line x1="6" y1="37" x2="30" y2="37" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Risk Intelligence Shield with Star
function ShieldStar({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polygon points="12 7.8 13.3 10.7 16.5 11 14.1 13.2 14.8 16.3 12 14.7 9.2 16.3 9.9 13.2 7.5 11 10.7 10.7 12 7.8" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

// Live Operations Broadcast Waves ((•))
function RadioWaveIcon({ className = "h-5 w-5 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    </svg>
  );
}

// Oil India Limited emblem
function OilIndiaLogo({ className = "h-8 w-8 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="oilEmblemGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff7b6b" />
          <stop offset="50%" stopColor="#e63946" />
          <stop offset="100%" stopColor="#ba181b" />
        </radialGradient>
        <linearGradient id="oilTailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e63946" />
          <stop offset="100%" stopColor="#c5222f" />
        </linearGradient>
      </defs>
      {/* Vertical lower stem */}
      <rect x="13.2" y="18" width="5.6" height="13" rx="2.8" fill="url(#oilTailGrad)" />
      {/* Outer red ring */}
      <circle cx="16" cy="13" r="10" fill="url(#oilEmblemGrad)" />
      {/* Inner white circle */}
      <circle cx="16" cy="13" r="6.2" fill="#fff5f5" stroke="#fca5a5" strokeWidth="0.8" />
      {/* Center dark core hole */}
      <circle cx="16" cy="13" r="3.2" fill="#0b1419" />
      {/* Top 3D glossy reflection */}
      <path d="M10 8.5a7.5 7.5 0 0 1 10-1" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
  { name: 'Nearby Wells', path: '/nearby-wells', icon: MapPin },
  { name: 'Well Intelligence', path: '/well-intelligence', icon: Layers },
  { name: 'Knowledge Repository', path: '/knowledge', icon: BookOpen },
  { name: 'Risk Intelligence', path: '/risk-intelligence', icon: ShieldStar },
  { name: 'What-If Simulator', path: '/whatif-simulator', icon: FlaskConical },
  { name: 'After-Action Reports', path: '/after-action', icon: History },
  { name: 'Live Operations', path: '/live-operations', icon: RadioWaveIcon },
  { name: 'Alerts', path: '/alerts', icon: Bell },
  { name: 'Document Intelligence', path: '/documents', icon: FileText },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  sidebarWidth = 216,
  onSidebarWidthChange,
  isResizing = false,
  setIsResizing,
}) {
  const navigate = useNavigate();
  const navigationTimer = useRef(null);
  const [navigationEffect, setNavigationEffect] = useState(null);

  useEffect(() => () => window.clearTimeout(navigationTimer.current), []);

  const handleResizeStart = (clientX) => {
    if (collapsed || mobileOpen) return;
    setIsResizing?.(true);

    const onMove = (currentX) => {
      const maxAllowed = typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.35) : 450;
      const minAllowed = 180;
      const clamped = Math.min(Math.max(currentX, minAllowed), maxAllowed);
      onSidebarWidthChange?.(clamped);
    };

    const handleMouseMove = (e) => {
      e.preventDefault();
      onMove(e.clientX);
    };

    const handleMouseUp = () => {
      setIsResizing?.(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        onMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsResizing?.(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleResizeStart(e.clientX);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      handleResizeStart(e.touches[0].clientX);
    }
  };

  const handleResetWidth = () => {
    if (collapsed || mobileOpen) return;
    onSidebarWidthChange?.(216);
  };

  const handleNavigationClick = (event, item) => {
    if (item.path !== '/alerts' && item.path !== '/nearby-wells') {
      onMobileClose();
      return;
    }

    event.preventDefault();
    window.clearTimeout(navigationTimer.current);
    setNavigationEffect(item.path === '/alerts' ? 'alerts' : 'nearby-wells');
    onMobileClose();
    navigationTimer.current = window.setTimeout(() => {
      setNavigationEffect(null);
      navigate(item.path);
    }, 600);
  };

  return (
    <>
      {isResizing && typeof window !== 'undefined' && (
        <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 rounded-full bg-[#0a1218]/95 border border-emerald-500/50 px-4 py-1.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>Sidebar: {Math.round(sidebarWidth)}px ({Math.round((sidebarWidth / window.innerWidth) * 100)}% of screen · max 35%)</span>
        </div>
      )}

      {navigationEffect && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-4" role="status" aria-live="polite">
          <div className={`nwis-navigation-effect ${navigationEffect === 'alerts' ? 'nwis-navigation-effect-alert' : 'nwis-navigation-effect-map'}`}>
            {navigationEffect === 'alerts' ? <TriangleAlert aria-hidden="true" className="h-9 w-9" /> : <MapPinned aria-hidden="true" className="h-9 w-9" />}
            <span>{navigationEffect === 'alerts' ? 'Opening alerts' : 'Opening nearby wells'}</span>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        className={`nwis-sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#091319] via-[#0b171e] to-[#081015] border-r border-[#15232d] text-zinc-300 select-none shadow-2xl overflow-hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: collapsed ? 64 : (mobileOpen ? Math.min(sidebarWidth, 300) : sidebarWidth),
          maxWidth: collapsed ? 64 : (mobileOpen ? '85vw' : '35vw'),
          transition: isResizing ? 'none' : 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Adjustable Resize Handle on Right Border (Max 35% Screen Width) */}
        {!collapsed && !mobileOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar width"
            title="Drag to resize sidebar (max 35% of screen). Double-click to reset."
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={handleResetWidth}
            className={`group absolute top-0 bottom-0 right-0 z-50 w-2.5 cursor-col-resize select-none touch-none transition-colors ${
              isResizing ? 'bg-emerald-500/70 shadow-[0_0_14px_rgba(16,185,129,0.85)]' : 'hover:bg-emerald-500/35'
            }`}
          >
            {/* Subtle visual grab handle */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 right-[1.5px] w-[3px] rounded-full transition-all ${
                isResizing
                  ? 'h-14 bg-white opacity-100 shadow-[0_0_8px_#ffffff]'
                  : 'h-8 bg-zinc-600 group-hover:h-12 group-hover:bg-emerald-400 opacity-60 group-hover:opacity-100'
              }`}
            />
          </div>
        )}
        {/* Subtle Atmospheric Oil Rig Backdrop at bottom */}
        {(!collapsed || mobileOpen) && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-80 z-0 bg-cover bg-bottom opacity-35 mix-blend-screen"
            style={{
              backgroundImage: `url(${sidebarRigBg})`,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
            }}
          />
        )}

        {/* Top Header Section */}
        <div className={`relative z-10 flex items-start justify-between pt-4 pb-3 ${collapsed && !mobileOpen ? 'px-2.5 justify-center' : 'px-3'}`}>
          <div className="flex items-start gap-2.5 min-w-0">
            <DerrickLogo className="h-9 w-8 shrink-0" />
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="nwis-title-text text-[16px] font-extrabold tracking-tight text-white leading-tight" style={{ color: '#ffffff' }}>NWIS</span>
                  <span className="nwis-oil-badge rounded-full bg-[#18262f] border border-white/10 px-1.5 py-0.2 text-[9.5px] font-medium text-zinc-300 tracking-wider" style={{ color: '#d4d4d8' }}>
                    OIL
                  </span>
                </div>
                <div className="nwis-subtitle-text text-[11px] text-zinc-300 font-normal leading-snug mt-0.5 truncate" style={{ color: '#d4d4d8' }}>
                  Well Intelligence System
                </div>
                <div className="nwis-subtext-muted text-[9.5px] text-zinc-400 font-normal leading-snug mt-0.5 truncate" style={{ color: '#a1a1aa' }}>
                  Developed by winfinity
                </div>
              </div>
            )}
          </div>

          {/* Toggle button for mobile or collapse */}
          {mobileOpen ? (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close sidebar"
              className="nwis-btn flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="nwis-btn hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-200 transition-colors"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav aria-label="Primary navigation" className="nwis-nav relative z-10 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(event) => handleNavigationClick(event, item)}
                className={({ isActive }) =>
                  `nwis-nav-link group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-normal transition-all duration-150 ${
                    collapsed && !mobileOpen ? 'justify-center px-0 py-2' : ''
                  } ${
                    isActive
                      ? 'active bg-[#153e30] border border-[#235e49]/80 text-white font-medium shadow-[0_2px_12px_rgba(20,61,46,0.55)]'
                      : 'border border-transparent text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      aria-hidden="true"
                      className={`nwis-nav-icon h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'
                      }`}
                    />
                    {(!collapsed || mobileOpen) && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}

                    {/* Alerts Notification Badge */}
                    {item.badge && (!collapsed || mobileOpen) && (
                      <span className="nwis-badge-alert ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white shadow-xs">
                        {item.badge}
                      </span>
                    )}

                    {collapsed && !mobileOpen && (
                      <span className="pointer-events-none absolute left-full z-50 ml-2.5 whitespace-nowrap rounded-lg border border-white/[0.1] bg-[#0f1922] px-3 py-1.5 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                        {item.name}
                        {item.badge && ` (${item.badge})`}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Section */}
        <div className="relative z-10 p-3 pt-2.5 mt-auto">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center gap-3">
              <OilIndiaLogo />
              <div className="flex flex-col min-w-0">
                <span className="nwis-footer-title text-[12px] font-bold tracking-wide text-white leading-tight">
                  OIL INDIA LIMITED
                </span>
                <span className="nwis-footer-sub text-[11px] text-zinc-400 font-normal leading-tight mt-0.5">
                  Assam-Arakan Basin
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <OilIndiaLogo className="h-7 w-7" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
