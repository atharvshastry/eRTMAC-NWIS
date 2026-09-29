import React, { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { Moon, Sun, LogOut, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { username, logout } = useAuth();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navigate = useNavigate();

  const confirmLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="System configurations, coordinate reference system (CRS) parameters, and eRTMAC telemetry protocol endpoints."
      />

      <div className="p-4 rounded-sm bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
        <span className="text-blue-400 font-semibold uppercase tracking-wider block mb-1">
          STATUS: READY
        </span>
        <p className="font-sans text-slate-300">
          Geodetic projections (WGS84 / UTM 46N), sensor sampling rates, and threshold configurations will be managed here.
        </p>
      </div>

      <section className="settings-panel">
        <div className="settings-heading"><div><h3>Appearance</h3><p>Choose the interface theme used across NWIS.</p></div><div className="settings-icon">{theme === 'dark' ? <Moon /> : <Sun />}</div></div>
        <div className="settings-options">
          <button type="button" onClick={() => setTheme('dark')} className={`settings-option ${theme === 'dark' ? 'selected' : ''}`}><Moon /><span>Dark Mode</span><span className="settings-radio" /></button>
          <button type="button" onClick={() => setTheme('light')} className={`settings-option ${theme === 'light' ? 'selected' : ''}`}><Sun /><span>Light Mode</span><span className="settings-radio" /></button>
        </div>
      </section>

      <section className="settings-panel">
        <div className="settings-heading"><div><h3>Display / Accessibility</h3><p>Adjust readable text sizing across the application.</p></div><div className="settings-icon"><Type /></div></div>
        <div className="settings-options settings-font-options">
          {['small', 'default', 'large', 'extra-large'].map((size) => <button type="button" key={size} onClick={() => setFontSize(size)} className={`settings-option ${fontSize === size ? 'selected' : ''}`}><span>{size === 'extra-large' ? 'Extra Large' : size[0].toUpperCase() + size.slice(1)}</span><span className="settings-radio" /></button>)}
        </div>
      </section>

      <section className="settings-panel">
        <div className="settings-heading"><div><h3>Account</h3><p>Current demo session and access controls.</p></div><span className="settings-account-name">{username}</span></div>
        <button type="button" onClick={() => setLogoutOpen(true)} className="settings-logout"><LogOut /> Logout</button>
      </section>

      <ConfirmationModal open={logoutOpen} title="Logout Confirmation" message="Are you sure you want to log out?" onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />
    </div>
  );
}
