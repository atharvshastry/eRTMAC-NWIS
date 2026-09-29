import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { WellProvider } from './context/WellContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <WellProvider>
          <div className="app-container">
            <AppRoutes />
          </div>
        </WellProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
