import React, { createContext, useContext, useMemo, useState } from 'react';

const AUTH_KEY = 'nwis_authenticated';
const USERNAME_KEY = 'nwis_username';
const DEMO_PASSWORD = '890890';
const DEMO_USERS = Array.from({ length: 9 }, (_, index) => `Oil00${index + 1}`);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(() => {
    if (typeof window === 'undefined' || window.localStorage.getItem(AUTH_KEY) !== 'true') return '';
    return window.localStorage.getItem(USERNAME_KEY) || '';
  });

  const login = (nextUsername, password) => {
    const isValid = DEMO_USERS.includes(nextUsername) && password === DEMO_PASSWORD;
    if (!isValid) return false;

    window.localStorage.setItem(AUTH_KEY, 'true');
    window.localStorage.setItem(USERNAME_KEY, nextUsername);
    setUsername(nextUsername);
    return true;
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_KEY);
    window.localStorage.removeItem(USERNAME_KEY);
    setUsername('');
  };

  const value = useMemo(() => ({
    isAuthenticated: Boolean(username),
    username,
    login,
    logout,
    demoUsers: DEMO_USERS,
  }), [username]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
