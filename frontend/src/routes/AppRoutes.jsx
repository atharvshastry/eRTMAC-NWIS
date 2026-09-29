import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../pages/Dashboard';
import NearbyWells from '../pages/NearbyWells/NearbyWells';
import WellIntelligence from '../pages/WellIntelligence';
import KnowledgeRepository from '../pages/KnowledgeRepository';
import RiskIntelligence from '../pages/RiskIntelligence';
import WhatIfSimulator from '../pages/WhatIfSimulator';
import AfterActionReports from '../pages/AfterActionReports';
import DepthAnalysis from '../pages/DepthAnalysis';
import LiveOperations from '../pages/LiveOperations';
import Alerts from '../pages/Alerts';
import Documents from '../pages/Documents';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';
import NotFoundPage from '../pages/NotFoundPage';
import Login from '../pages/Login';
import WellReportPrint from '../pages/WellReportPrint';
import { useAuth } from '../context/AuthContext';

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = window.location;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />;
  }

  return <MainLayout />;
}

// The generated report is a standalone, print-optimized page (its own letterhead, no
// sidebar/topbar chrome) so it does not go through MainLayout, but it still requires
// login like the rest of the app.
function ProtectedStandalone({ children }) {
  const { isAuthenticated } = useAuth();
  const location = window.location;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        {/* Default route redirects to /dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/nearby-wells" element={<NearbyWells />} />
        <Route path="/well-intelligence" element={<WellIntelligence />} />
        <Route path="/knowledge" element={<KnowledgeRepository />} />
        <Route path="/knowledge-repository" element={<Navigate to="/knowledge" replace />} />
        <Route path="/risk-intelligence" element={<RiskIntelligence />} />
        <Route path="/whatif-simulator" element={<WhatIfSimulator />} />
        <Route path="/after-action" element={<AfterActionReports />} />
        <Route path="/depth-analysis" element={<DepthAnalysis />} />
        <Route path="/live-operations" element={<LiveOperations />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/document-intelligence" element={<Navigate to="/documents" replace />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Per-well Intelligence Report -- standalone print view, no sidebar/topbar */}
      <Route
        path="/well-report/:wellId"
        element={
          <ProtectedStandalone>
            <WellReportPrint />
          </ProtectedStandalone>
        }
      />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
