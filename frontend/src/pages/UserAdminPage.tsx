import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavBar, Button, Checkbox, Dialog, Toast } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e5e7ec', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff',
};

export default function UserAdminPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ['users'], queryFn: api.users });
  const patientsQ = useQuery({ queryKey: ['patients'], queryFn: api.patients });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);
  // 新建用户弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [nu, setNu] = useState<any>({});
  const [creating, setCreating] = useState(false);
  // 重置密码弹窗
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetting, setResetting] = useState(false);
  // 明文密码显示
  const [showPwd, setShowPwd] = useState<number | null>(null);

  const users = usersQ.data || [];
  const patients = patientsQ.data || [];

  const openEdit = (u: any) => {
    setEditingUserId(u.id);
    setChecked((u.patients || []).map((p: any) => p.id));
  };

  const saveAccess = async () => {
    if (!editingUserId || savingAccess) return;
    setSavingAccess(true);
    try {
      await api.setUserAccess(editingUserId, checked);
      Toast.show('已保存');
      setEditingUserId(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    } finally {
      setSavingAccess(false);
    }
  };

  const submitCreate = async () => {
    if (creating) return;
    if (!nu.username?.trim()) return Toast.show('请输入用户名');
    if (!nu.password || nu.password.length < 6) return Toast.show('密码至少 6 位');
    if (!nu.displayName?.trim()) return Toast.show('请输入显示名称');
    setCreating(true);
    try {
      await api.createUser({
        username: nu.username.trim(),
        password: nu.password,
        displayName: nu.displayName.trim(),
        role: nu.role === 'ADMIN' ? 'ADMIN' : 'USER',
      });
      Toast.show('已创建');
      setShowCreate(false); setNu({});
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (e: any) {
      Toast.show(e?.response?.data?.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const submitReset = async () => {
    if (resetting) return;
    if (!resetPwd || resetPwd.length < 6) return Toast.show('密码至少 6 位');
    setResetting(true);
    try {
      await api.updateUser(resetTarget.id, { password: resetPwd });
      Toast.show('密码已重置');
      setResetTarget(null); setResetPwd('');
      qc.invalidateQueries({ queryKey: ['users'] });
    } catch (e: any) {
      Toast.show(e?.response?.data?.message || '重置失败');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7' }}>
      <NavBar onBack={() => nav(-1)}>用户管理</NavBar>
      <div style={{ padding: 16 }}>
        <Button block color="primary" onClick={() => setShowCreate(true)}>+ 新建用户</Button>

        <div style={{ marginTop: 16 }}>
          {users.map((u: any) => (
            <div key={u.id} style={{
              background: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
              border: '0.5px solid #e5e7ec',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>
                    {u.role === 'ADMIN' ? '管理员（可见全部成员）' : `可见 ${(u.patients || []).length} 位成员`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {u.role !== 'ADMIN' && (
                    <Button size="small" onClick={() => openEdit(u)}>编辑权限</Button>
                  )}
                  <Button size="small" onClick={() => setResetTarget(u)}>重置密码</Button>
                  <Button
                    size="small"
                    style={{ color: '#d97b7b' }}
                    onClick={() => {
                      Dialog.confirm({
                        title: '删除账号及数据',
                        content: `确定删除账号「${u.username}」？将同时清除该账号的全部权限关联数据，此操作不可恢复。`,
                        confirmText: '确认删除',
                        onConfirm: async () => {
                          try {
                            await api.deleteUser(u.id);
                            Toast.show('已删除');
                            qc.invalidateQueries({ queryKey: ['users'] });
                          } catch (e: any) {
                            Toast.show(e?.response?.data?.message || '删除失败');
                          }
                        },
                      });
                    }}
                  >删除</Button>
                </div>
              </div>
              {/* 密码行：默认隐藏，点击显示明文 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#4a5568' }}>
                <span style={{ color: '#7a828c' }}>密码：</span>
                {showPwd === u.id ? (
                  <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{u.password || '（旧账号，重置后可查看）'}</span>
                ) : (
                  <span>••••••••</span>
                )}
                <span onClick={() => setShowPwd(showPwd === u.id ? null : u.id)} style={{ color: '#3d6b94', cursor: 'pointer', fontSize: 12 }}>
                  {showPwd === u.id ? '隐藏' : '显示'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新建用户弹窗 */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>新建用户</div>
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>用户名（登录用）</div>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={nu.username || ''} onChange={(e) => setNu({ ...nu, username: e.target.value })} placeholder="如：mom" />
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>显示名称</div>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={nu.displayName || ''} onChange={(e) => setNu({ ...nu, displayName: e.target.value })} placeholder="如：妈妈" />
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>密码（至少 6 位）</div>
            <input style={{ ...inputStyle, marginBottom: 10 }} type="text" value={nu.password || ''} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="初始密码" />
            <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>角色</div>
            <select style={{ ...inputStyle, marginBottom: 16 }} value={nu.role || 'USER'} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
              <option value="USER">家庭成员（按权限查看病人）</option>
              <option value="ADMIN">管理员（可见全部）</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={submitCreate} disabled={creating} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: creating ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{creating ? '创建中…' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => { setResetTarget(null); setResetPwd(''); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>重置密码</div>
            <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 12 }}>账号「{resetTarget.username}」将使用新密码登录</div>
            <input style={{ ...inputStyle }} type="text" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="新密码（至少 6 位）" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setResetTarget(null); setResetPwd(''); }} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={submitReset} disabled={resetting} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: resetting ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{resetting ? '重置中…' : '确认重置'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑权限弹窗 */}
      {editingUserId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setEditingUserId(null)}>
          <div
            style={{
              background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto',
              borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16,
              maxHeight: '70vh', overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择可见的家庭成员</div>
            {patients.map((p: any) => (
              <Checkbox key={p.id} checked={checked.includes(p.id)} onChange={(c) => {
                setChecked(c ? [...checked, p.id] : checked.filter((id) => id !== p.id));
              }} style={{ display: 'block', padding: '10px 0' }}>
                {p.name}
              </Checkbox>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button block onClick={() => setEditingUserId(null)} style={{ marginRight: 8 }}>取消</Button>
              <Button block color="primary" onClick={saveAccess} loading={savingAccess}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
