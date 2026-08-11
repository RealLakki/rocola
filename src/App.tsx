import { useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { CustomerView } from './pages/CustomerView';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminPlayer } from './pages/AdminPlayer';
import { AdminGate } from './components/admin/AdminGate';
import { IntroSplash } from './components/common/IntroSplash';
import { NeonBackground } from './components/common/NeonBackground';
import { safeSession } from './utils/safeStorage';

const INTRO_KEY = 'cantina:intro-shown';

export function App() {
  const [introDone, setIntroDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    return safeSession.getItem(INTRO_KEY) === '1';
  });

  return (
    <>
      <NeonBackground />
      {!introDone && (
        <IntroSplash
          onDone={() => {
            safeSession.setItem(INTRO_KEY, '1');
            setIntroDone(true);
          }}
        />
      )}
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/v/:slug" element={<CustomerView />} />
      <Route
        path="/admin/:slug"
        element={
          <GatedRoute>
            <AdminDashboard />
          </GatedRoute>
        }
      />
      <Route
        path="/admin/:slug/player"
        element={
          <GatedRoute>
            <AdminPlayer />
          </GatedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Wrapper que fuerza re-mount del AdminGate cada vez que cambia la ruta —
 * usando `useLocation().key` como key. Sin esto, navegar entre /admin y
 * /admin/.../player podría reusar la instancia y saltarse la clave.
 */
function GatedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <AdminGate key={location.key}>{children}</AdminGate>;
}
