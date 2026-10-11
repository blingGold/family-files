import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TabBar, DatePicker } from 'antd-mobile';
import {
  AppOutline, BellOutline, CheckShieldOutline, ClockCircleOutline, UserOutline,
} from 'antd-mobile-icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
}

export default function FollowUpsPage() {
  const [tab, setTab] = useState('alarm');
  const nav = useNavigate();
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ['followups'], queryFn: () => api.followups() });
  const badgeQ = useQuery({ queryKey: ['badge'], queryFn: api.followupBadge });
  const [filter, setFilter] = useState<'all' | 'overdue' | 'soon'>('all');

  // 编辑复查
  const [editFu, setEditFu] = useState<any>(null);
  const [editItems, setEditItems] = useState('');
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editRecurring, setEditRecurring] = useState(false);
  const [editInterval, setEditInterval] = useState(3);
  const [editPicker, setEditPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = listQ.data || [];
  const now = new Date();
  const filtered = list.filter((f: any) => {
    const due = new Date(f.dueDate);
    if (filter === 'overdue') return due < now;
    if (filter === 'soon') return due >= now;
    return true;
  });

  const complete = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.completeFollowup(id, {});
      qc.invalidateQueries({ queryKey: ['followups'] });
      qc.invalidateQueries({ queryKey: ['badge'] });
      qc.invalidateQueries();
      // 复查完成自动生成的就诊记录 → 跳转到编辑页，提醒补全
      if (r?.completedEncounterId) {
        nav(`/encounters/${r.completedEncounterId}/edit`);
      }
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (f: any) => {
    setEditFu(f);
    setEditItems(f.items || '');
    setEditDate(new Date(f.dueDate));
    setEditRecurring(!!f.recurring);
    setEditInterval(f.intervalMonths || 3);
  };
  const closeEdit = () => {
    setEditFu(null); setEditItems(''); setEditRecurring(false); setEditInterval(3);
  };
  const saveEdit = async () => {
    if (!editFu || busy) return;
    setBusy(true);
    try {
      await api.updateFollowup(editFu.id, {
        items: editItems || '复查',
        dueDate: editDate.toISOString(),
        recurring: editRecurring,
        intervalMonths: editRecurring ? editInterval : undefined,
      });
      closeEdit();
      qc.invalidateQueries({ queryKey: ['followups'] });
      qc.invalidateQueries({ queryKey: ['badge'] });
      qc.invalidateQueries();
    } finally {
      setBusy(false);
    }
  };
  const removeFu = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.deleteFollowup(id);
      qc.invalidateQueries({ queryKey: ['followups'] });
      qc.invalidateQueries({ queryKey: ['badge'] });
      qc.invalidateQueries();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7', paddingBottom: 80 }}>
      <div style={{ padding: '14px 16px 8px', fontSize: 18, fontWeight: 600, color: '#2b2f36' }}>复查提醒</div>
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {([['all', '全部'], ['overdue', '逾期'], ['soon', '临近']] as const).map(([k, label]) => (
          <span key={k} onClick={() => setFilter(k)} style={{
            fontSize: 13, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
            background: filter === k ? '#5b8db8' : '#fff',
            color: filter === k ? '#fff' : '#4a5568',
            border: '0.5px solid #e5e7ec',
          }}>{label}</span>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, color: '#7a828c', fontSize: 13, textAlign: 'center' }}>
            暂无相关复查项
          </div>
        )}
        {filtered.map((f: any) => {
          const due = new Date(f.dueDate);
          const overdue = due < now;
          const d = Math.round((overdue ? now.getTime() - due.getTime() : due.getTime() - now.getTime()) / 86400000);
          return (
            <div key={f.id} style={{
              background: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
              border: '0.5px solid #e5e7ec',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                  background: overdue ? 'rgba(194,107,90,0.12)' : 'rgba(217,166,72,0.14)',
                  color: overdue ? '#c26b5a' : '#d9a648',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ClockCircleOutline style={{ fontSize: 18 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#2b2f36' }}>
                    {f.patient?.name || ''} · {f.condition?.name || ''}
                  </div>
                  <div style={{ fontSize: 12, color: overdue ? '#c26b5a' : '#7a828c', marginTop: 3 }}>
                    {overdue ? `逾期 ${d} 天 · ` : `${d} 天后 · `}{fmtDate(f.dueDate)} {f.items ? `· ${f.items}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => openEdit(f)} style={{ padding: '6px 14px', borderRadius: 999, border: '0.5px solid #e5e7ec', background: '#fff', color: '#4a5568', fontSize: 12 }}>
                  编辑
                </button>
                <button onClick={() => { if (confirm('确定删除这条复查计划？')) removeFu(f.id); }} style={{ padding: '6px 14px', borderRadius: 999, border: '0.5px solid #e5e7ec', background: '#fff', color: '#d97b7b', fontSize: 12 }}>
                  删除
                </button>
                <button onClick={() => { if (confirm('标记为已完成？')) complete(f.id); }} style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: '#eef1f5', color: '#4a5568', fontSize: 12 }}>
                  完成
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editFu && (
        <div onClick={closeEdit} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>编辑复查计划</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>复查项目</div>
              <input value={editItems} onChange={(e) => setEditItems(e.target.value)} placeholder="如：复查血压" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>提醒日期</div>
              <div onClick={() => setEditPicker(true)} style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, background: '#fff' }}>
                {editDate.toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#7a828c' }}>周期复查</span>
              <input type="checkbox" checked={editRecurring} onChange={(e) => setEditRecurring(e.target.checked)} />
              {editRecurring && (
                <select value={editInterval} onChange={(e) => setEditInterval(Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 13 }}>
                  <option value={1}>每 1 个月</option>
                  <option value={3}>每 3 个月</option>
                  <option value={6}>每 6 个月</option>
                  <option value={12}>每 12 个月</option>
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeEdit} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={saveEdit} disabled={busy} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: busy ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{busy ? '保存中…' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        background: '#fff', borderTop: '0.5px solid #e5e7ec',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <TabBar activeKey={tab} onChange={(k) => { setTab(k); if (k === 'home') nav('/'); else if (k === 'alarm') nav('/followups'); else if (k === 'ins') nav('/insurance'); else if (k === 'me') nav('/me'); }}>
            <TabBar.Item key="home" title="首页" icon={<AppOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="alarm" title="提醒" icon={
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <BellOutline style={{ fontSize: 22 }} />
                {(badgeQ.data?.count || 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16,
                    padding: '0 4px', borderRadius: 8, background: '#c26b5a', color: '#fff',
                    fontSize: 10, fontWeight: 600, lineHeight: '16px', textAlign: 'center',
                  }}>{badgeQ.data.count}</span>
                )}
              </div>
            } />
            <TabBar.Item key="ins" title="保险" icon={<CheckShieldOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="me" title="我的" icon={<UserOutline style={{ fontSize: 22 }} />} />
          </TabBar>
        </div>
      </div>

      <DatePicker
        visible={editPicker}
        value={editDate}
        onClose={() => setEditPicker(false)}
        onConfirm={(d) => { setEditDate(d); setEditPicker(false); }}
        title="选择提醒日期"
      />
    </div>
  );
}
