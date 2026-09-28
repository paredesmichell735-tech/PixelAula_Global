import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Loading } from './components/AsyncState';
import { AchievementsPage } from './pages/AchievementsPage';
import { AvatarPage } from './pages/AvatarPage';
import { CommunityPage } from './pages/CommunityPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LearningMapPage } from './pages/LearningMapPage';
import { LessonCompletePage } from './pages/LessonCompletePage';
import { LoginPage } from './pages/LoginPage';
import { MissionPage } from './pages/MissionPage';
import { ProfilePage } from './pages/ProfilePage';
import { SubjectsPage } from './pages/SubjectsPage';
import { useAuth } from './state/auth';

/** Ruta privada: sin sesión, al login. */
function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  // Mientras se recupera la sesión guardada no se decide nada: si no,
  // recargar una página interna te echaría al login por un instante.
  if (loading) return <div className="auth-page"><Loading label="Recuperando tu sesión..." /></div>;
  if (!session) return <Navigate to="/login" replace />;

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/app/materias" element={<Protected><SubjectsPage /></Protected>} />
      <Route path="/app/niveles" element={<Protected><LearningMapPage /></Protected>} />
      <Route path="/app/misiones/:missionId" element={<Protected><MissionPage /></Protected>} />
      <Route path="/app/logros" element={<Protected><AchievementsPage /></Protected>} />
      <Route path="/app/avatar" element={<Protected><AvatarPage /></Protected>} />
      <Route path="/app/perfil" element={<Protected><ProfilePage /></Protected>} />
      <Route path="/app/comunidad" element={<Protected><CommunityPage /></Protected>} />
      <Route path="/app/resultados/:attemptId" element={<Protected><LessonCompletePage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
