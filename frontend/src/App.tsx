import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd-mobile';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import FollowUpsPage from './pages/FollowUpsPage';
import ConditionTimelinePage from './pages/ConditionTimelinePage';
import NewEncounterPage from './pages/NewEncounterPage';
import InsurancePage from './pages/InsurancePage';
import MePage from './pages/MePage';
import UserAdminPage from './pages/UserAdminPage';
import PatientDetailPage from './pages/PatientDetailPage';
import { useAuthStore } from './store/auth';

export default function App() {
  const token = useAuthStore((s) => s.token);
  return (
    <ConfigProvider locale={zhCN}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={token ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/followups" element={token ? <FollowUpsPage /> : <Navigate to="/login" replace />} />
        <Route path="/patients/:id" element={token ? <PatientDetailPage /> : <Navigate to="/login" replace />} />
        <Route path="/conditions/:id" element={token ? <ConditionTimelinePage /> : <Navigate to="/login" replace />} />
        <Route path="/conditions/:conditionId/new-encounter" element={token ? <NewEncounterPage /> : <Navigate to="/login" replace />} />
        <Route path="/encounters/:encounterId/edit" element={token ? <NewEncounterPage /> : <Navigate to="/login" replace />} />
        <Route path="/insurance" element={token ? <InsurancePage /> : <Navigate to="/login" replace />} />
        <Route path="/me" element={token ? <MePage /> : <Navigate to="/login" replace />} />
        <Route path="/admin/users" element={token ? <UserAdminPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}
