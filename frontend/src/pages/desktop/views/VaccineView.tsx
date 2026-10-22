import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { C, Card, Tag, Empty, fmtDateCN, mobileOnly } from '../ui';

export default function VaccineView(props: { activeId: number }) {
  const { activeId } = props;
  const q = useQuery({
    queryKey: ['vaccines', activeId],
    queryFn: () => api.vaccines(activeId!),
    enabled: !!activeId,
  });
  const list: any[] = q.data || [];

  if (q.isLoading) return <Empty text="加载中…" />;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const statusOf = (v: any) => {
    if (!v.nextDueDate) {
      return (v.doseIndex ?? 1) >= (v.doses ?? 1)
        ? { tone: 'green', text: '已打完' }
        : { tone: 'default', text: '待安排' };
    }
    const due = new Date(v.nextDueDate);
    const diff = Math.round((due.getTime() - todayStart.getTime()) / 86400000);
    if (due < todayStart) return { tone: 'danger', text: `逾期 ${-diff} 天` };
    if (diff === 0) return { tone: 'amber', text: '今天接种' };
    return { tone: 'amber', text: `${diff} 天后` };
  };

  return (
    <div>
      <Card title={`疫苗本 · ${list.length}`} extra={<span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={() => mobileOnly()}>添加疫苗（手机端）</span>}>
        {list.length === 0 && <Empty text="该病人暂无疫苗记录 · 可在手机端录入" />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {list.map((v: any) => {
            const st = statusOf(v);
            const pct = Math.min(100, Math.round(((v.doseIndex ?? 1) / Math.max(1, v.doses ?? 1)) * 100));
            return (
              <div key={v.id} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{v.name}</span>
                  <Tag tone={st.tone}>{st.text}</Tag>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.line2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: C.brand }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.ink3, flex: 'none' }}>第 {v.doseIndex ?? 1}/{v.doses ?? 1} 剂 · {pct}%</span>
                </div>
                <div style={{ fontSize: 12, color: C.ink2, marginTop: 10, lineHeight: 1.7 }}>
                  {v.vaccinatedAt ? <div>最近接种：{fmtDateCN(v.vaccinatedAt)}</div> : <div style={{ color: C.ink3 }}>尚未填写接种日期</div>}
                  {v.nextDueDate && <div style={{ color: st.tone === 'danger' ? C.danger : C.ink2 }}>下一针：{fmtDateCN(v.nextDueDate)}</div>}
                  {v.brand && <div>品牌：{v.brand}</div>}
                  {v.clinic && <div>机构：{v.clinic}</div>}
                  {v.note && <div style={{ color: C.ink3 }}>备注：{v.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
