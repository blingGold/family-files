import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavBar, Button, Checkbox, Dialog, Toast } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function UserAdminPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ['users'], queryFn: api.users });
  const patientsQ = useQuery({ queryKey: ['patients'], queryFn: api.patients });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);

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

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7' }}>
      <NavBar onBack={() => nav(-1)}>用户管理</NavBar>
      <div style={{ padding: 16 }}>
        <Button block color="primary" onClick={() => {
          Dialog.confirm({
            content: '新建用户功能待补充，可直接在数据库中添加',
          });
        }}>
          + 新建用户
        </Button>

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
                    {u.role === 'ADMIN' ? '管理员（可见全部）' : `可见 ${(u.patients || []).length} 位成员`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {u.role !== 'ADMIN' && (
                    <Button size="small" onClick={() => openEdit(u)}>编辑权限</Button>
                  )}
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
            </div>
          ))}
        </div>
      </div>

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
              <Button block onClick={() => setEditingUserId(null)}>取消</Button>
              <Button block color="primary" onClick={saveAccess} loading={savingAccess}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
