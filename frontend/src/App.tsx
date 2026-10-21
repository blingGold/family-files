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
import DesktopApp from './pages/desktop/DesktopApp';
import { useAuthStore } from './store/auth';
import { useDesktop } from './hooks/useDesktop';

export default function App() {
  const token = useAuthStore((s) => s.token);
  const desktop = useDesktop();

  if (!token) {
    return (
      <ConfigProvider locale={zhCN}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ConfigProvider>
    );
  }

  // 电脑端（≥1024px）：桌面查看工作台；手机端：现有移动布局
  if (desktop) {
    return (
      <ConfigProvider locale={zhCN}>
        <DesktopApp />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/followups" element={<FollowUpsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/conditions/:id" element={<ConditionTimelinePage />} />
        <Route path="/conditions/:conditionId/new-encounter" element={<NewEncounterPage />} />
        <Route path="/encounters/:encounterId/edit" element={<NewEncounterPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/admin/users" element={<UserAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfigProvider>
  );
}
