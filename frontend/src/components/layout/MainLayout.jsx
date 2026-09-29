import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatbotWidget from '../chatbot/ChatbotWidget';

const DEFAULT_SIDEBAR_WIDTH = 216;
const MIN_SIDEBAR_WIDTH = 180;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('nwis_sidebar_width');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= MIN_SIDEBAR_WIDTH) {
          const maxW = typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.35) : 450;
          return Math.min(val, maxW);
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);

  // Every route renders inside this same layout (Outlet just swaps the page
  // content in place -- the layout itself never remounts), and the <main> below
  // never actually gets its own internal scrollbar: its wrapper uses min-h-screen,
  // so long pages just grow taller than the viewport and the browser scrolls the
  // *window* instead. That means window scroll position otherwise carries over
  // between pages -- scroll down on Dashboard, click Live Operations, and it opens
  // already scrolled down. Reset both on every route change (mainRef too, in case
  // a future layout tweak makes <main> the real scroll container instead).
  const location = useLocation();
  const mainRef = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Sync screen width and clamp sidebar width if screen narrows
  useEffect(() => {
    const handleResize = () => {
      const isLg = window.innerWidth >= 1024;
      setIsDesktop(isLg);
      const maxW = Math.floor(window.innerWidth * 0.35);
      setSidebarWidth((prev) => {
        if (prev > maxW && maxW >= MIN_SIDEBAR_WIDTH) {
          return maxW;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSidebarWidthChange = (newWidth) => {
    setSidebarWidth(newWidth);
    try {
      localStorage.setItem('nwis_sidebar_width', String(Math.round(newWidth)));
    } catch {
      // ignore
    }
  };

  return (
    <div className={`min-h-screen bg-[#080808] text-zinc-100 flex selection:bg-white/20 selection:text-white ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={handleSidebarWidthChange}
        isResizing={isResizing}
        setIsResizing={setIsResizing}
      />

      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{
          paddingLeft: isDesktop ? (collapsed ? 64 : sidebarWidth) : 0,
          transition: isResizing ? 'none' : 'padding-left 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Topbar onMobileToggle={() => setMobileOpen((value) => !value)} />
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* App-wide floating AI chatbot -- mounted here (rather than per-page) so it persists
          and keeps its conversation across route changes. */}
      <ChatbotWidget />
    </div>
  );
}