import { useQuery } from '@tanstack/react-query';
import { TabBar } from 'antd-mobile';
import { AppOutline, BellOutline, CheckShieldOutline, UserOutline } from 'antd-mobile-icons';
import { SyringeIcon } from '../components/SyringeIcon';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Toast } from 'antd-mobile';
import { api } from '../api';
import { useAuthStore } from '../store/auth';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e5e7ec', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff',
};

export default function MePage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('me');
  const { user, logout } = useAuthStore();
  const meQ = useQuery({ queryKey: ['me'], queryFn: api.me });
  const me = meQ.data || user;
  const isAdmin = me?.role === 'ADMIN' || me?.isAdmin;
  // 修改密码
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState<any>({});
  const [pwdSaving, setPwdSaving] = useState(false);

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
        <div onClick={() => setShowPwd(true)} style={{
          background: '#fff', padding: 16, borderRadius: 12, border: '0.5px solid #e5e7ec',
          marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14 }}>修改密码</span>
          <span style={{ color: '#c9bfb3', fontSize: 18 }}>›</span>
        </div>
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
        <div style={{ textAlign: 'center', fontSize: 12, color: '#aab2bd', marginTop: 18 }}>
          版本 {import.meta.env.VITE_APP_VERSION || 'dev'}
        </div>
      </div>

      {showPwd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowPwd(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>修改密码</div>
            <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 12 }}>账号「{me?.username}」</div>
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>原密码</div>
            <input style={{ ...inputStyle, marginBottom: 10 }} type="password" value={pwdForm.old || ''} onChange={(e) => setPwdForm({ ...pwdForm, old: e.target.value })} placeholder="输入原密码" />
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>新密码（至少 6 位）</div>
            <input style={{ ...inputStyle, marginBottom: 10 }} type="password" value={pwdForm.next || ''} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })} placeholder="输入新密码" />
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>确认新密码</div>
            <input style={{ ...inputStyle, marginBottom: 16 }} type="password" value={pwdForm.confirm || ''} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} placeholder="再次输入新密码" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowPwd(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={async () => {
                if (pwdSaving) return;
                if (!pwdForm.old) return Toast.show('请输入原密码');
                if (!pwdForm.next || pwdForm.next.length < 6) return Toast.show('新密码至少 6 位');
                if (pwdForm.next !== pwdForm.confirm) return Toast.show('两次输入的新密码不一致');
                setPwdSaving(true);
                try {
                  await api.changePassword({ oldPassword: pwdForm.old, newPassword: pwdForm.next });
                  Toast.show('密码已修改，下次登录请用新密码');
                  setShowPwd(false); setPwdForm({});
                } catch (e: any) {
                  Toast.show(e?.response?.data?.message || '修改失败');
                } finally {
                  setPwdSaving(false);
                }
              }} disabled={pwdSaving} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: pwdSaving ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{pwdSaving ? '提交中…' : '确认修改'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #e5e7ec' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <TabBar activeKey={tab} onChange={(k) => { setTab(k); if (k === 'home') nav('/'); else if (k === 'alarm') nav('/followups'); else if (k === 'vac') nav('/vaccines'); else if (k === 'ins') nav('/insurance'); }}>
            <TabBar.Item key="home" title="首页" icon={<AppOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="alarm" title="提醒" icon={<BellOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="vac" title="疫苗" icon={<SyringeIcon />} />
            <TabBar.Item key="ins" title="保险" icon={<CheckShieldOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="me" title="我的" icon={<UserOutline style={{ fontSize: 22 }} />} />
          </TabBar>
        </div>
      </div>
    </div>
  );
}
