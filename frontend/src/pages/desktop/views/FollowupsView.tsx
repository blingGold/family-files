import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { C, Card, Tag, Empty, fmtDateCN, isOverdue, overdueDays } from '../ui';

const DOW = ['日', '一', '二', '三', '四', '五', '六'];

export default function FollowupsView(props: { activeId: number }) {
  const { activeId } = props;
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'done'>('all');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  });
  const [selDay, setSelDay] = useState<string | null>(null);

  const fuQ = useQuery({
    queryKey: ['followups', activeId],
    queryFn: () => api.followups({ scope: 'patient', patientId: activeId }),
    enabled: !!activeId,
  });
  const list: any[] = fuQ.data || [];

  const filtered = list.filter((f) => {
    if (filter === 'overdue') return isOverdue(f);
    if (filter === 'pending') return !isOverdue(f) && f.status !== 'DONE';
    if (filter === 'done') return f.status === 'DONE';
    return true;
  });

  const byDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    list.forEach((f) => { (m[f.dueDate.slice(0, 10)] = m[f.dueDate.slice(0, 10)] || []).push(f); });
    return m;
  }, [list]);

  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  const calCells = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startDow = first.getDay();
    const days = new Date(y, m, 0).getDate();
    const prevDays = new Date(y, m - 1, 0).getDate();
    const cells: { ds: string; day: number; other: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) cells.push({ ds: '', day: prevDays - i, other: true });
    for (let d = 1; d <= days; d++) cells.push({ ds: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, other: false });
    return cells;
  }, [month]);

  const nav = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    setSelDay(null);
  };

  const doneCount = list.filter((f) => f.status === 'DONE').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      {/* 月历 */}
      <Card title={`复查月历 · ${month}`}
        extra={
          <span style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => nav(-1)} style={{ background: '#f2f5f8', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: C.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>‹ 上月</button>
            <button onClick={() => nav(1)} style={{ background: '#f2f5f8', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: C.ink2, cursor: 'pointer', fontFamily: 'inherit' }}>下月 ›</button>
          </span>
        }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', fontSize: 11, color: C.ink3, marginBottom: 6 }}>
          {DOW.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {calCells.map((c, i) => {
            const has = !!c.ds && !!byDate[c.ds];
            const isToday = c.ds === todayStr;
            const isSel = c.ds === selDay;
            return (
              <div key={i} onClick={() => c.ds && setSelDay(isSel ? null : c.ds)}
                style={{
                  aspectRatio: '1.05', borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12.5, cursor: c.ds ? 'pointer' : 'default', position: 'relative', boxSizing: 'border-box',
                  color: c.other ? C.ink3 : C.ink,
                  background: isSel ? C.brandSoft : (isToday ? C.brandSoft : 'transparent'),
                  outline: isSel ? `2px solid ${C.brand}` : undefined,
                  fontWeight: isToday ? 700 : 400,
                }}>
                {c.day}
                {has && <span style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3, background: C.amber }} />}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 8 }}>琥珀圆点 = 该日有待办复查 · 点击日期查看当日安排</div>
      </Card>

      {/* 待办列表 */}
      <Card title={`复查安排 · ${filtered.length}${doneCount ? `（已完成 ${doneCount}）` : ''}`}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {([['all', '全部'], ['pending', '待办'], ['overdue', '逾期'], ['done', '已完成']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999, cursor: 'pointer', background: filter === k ? C.brand : '#fff', border: `1px solid ${filter === k ? C.brand : C.line}`, color: filter === k ? '#fff' : C.ink2, fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <Empty text="当前筛选下暂无复查安排" />}
        {filtered.map((f: any) => {
          const mark = selDay === f.dueDate.slice(0, 10);
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderBottom: `1px solid ${C.line2}`, background: mark ? '#eef4fa' : 'transparent', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: C.ink2, width: 96, flex: 'none' }}>{fmtDateCN(f.dueDate)}</span>
              <span style={{ flex: 1, fontSize: 13 }}>
                {f.items || '复查'}
                <span style={{ color: C.ink3, fontSize: 11 }}> · {f.condition?.name || '—'}</span>
              </span>
              {f.status === 'DONE' ? <Tag tone="green">已完成</Tag> : isOverdue(f) ? <Tag tone="danger">逾期 {overdueDays(f)} 天</Tag> : <Tag tone="amber">待办</Tag>}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
