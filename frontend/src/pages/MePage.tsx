import { useQuery } from '@tanstack/react-query';
import { TabBar } from 'antd-mobile';
import { AppOutline, BellOutline, CheckShieldOutline, UserOutline } from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { useAuthStore } from '../store/auth';

export default function MePage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('me');
  const { user, logout } = useAuthStore();
  const meQ = useQuery({ queryKey: ['me'], queryFn: api.me });
  const me = meQ.data || user;
  const isAdmin = me?.role === 'ADMIN' || me?.isAdmin;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7', paddingBottom: 80 }}>
      <div style={{ padding: '24px 16px', background: '#fff', borderBottom: '0.5px solid #e5e7ec' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, background: '#5b8db8', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutline style={{ fontSize: 28 }} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{me?.username || '用户'}</div>
            <div style={{ fontSize: 12, color: '#7a828c', marginTop: 3 }}>{isAdmin ? '管理员' : '家庭成员'}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {isAdmin && (
          <div onClick={() => nav('/admin/users')} style={{
            background: '#fff', padding: 16, borderRadius: 12, border: '0.5px solid #e5e7ec',
            marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 14 }}>用户与权限管理</span>
            <span style={{ color: '#c9bfb3', fontSize: 18 }}>›</span>
          </div>
        )}
        <div onClick={() => { logout(); nav('/login'); }} style={{
          background: '#fff', padding: 16, borderRadius: 12, border: '0.5px solid #e5e7ec',
          textAlign: 'center', color: '#c26b5a', fontSize: 14,
        }}>退出登录</div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #e5e7ec' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <TabBar activeKey={tab} onChange={(k) => { setTab(k); if (k === 'home') nav('/'); else if (k === 'alarm') nav('/followups'); else if (k === 'ins') nav('/insurance'); }}>
            <TabBar.Item key="home" title="首页" icon={<AppOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="alarm" title="提醒" icon={<BellOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="ins" title="保险" icon={<CheckShieldOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="me" title="我的" icon={<UserOutline style={{ fontSize: 22 }} />} />
          </TabBar>
        </div>
      </div>
    </div>
  );
}
