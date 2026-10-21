import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { C, Card, Tag, Empty, calcAge, fmtDateCN, isOverdue, overdueDays, mobileOnly, groupAttachments } from '../ui';

export default function OverviewView(props: { activeId: number; setTab: (k: 'overview' | 'record' | 'meds' | 'followups' | 'insurance') => void; onOpenRecord?: (condId: number, encId: number) => void }) {
  const { activeId } = props;
  const detailQ = useQuery({
    queryKey: ['patient', activeId],
    queryFn: () => api.patient(activeId!),
    enabled: !!activeId,
  });
  const patient = detailQ.data;

  if (detailQ.isLoading) return <Loading />;
  if (!patient) return <Empty text="病人数据加载失败，请稍后重试" />;

  const conditions = patient.conditions || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const meds: any[] = (Array.isArray(patient.currentMedications) ? patient.currentMedications : [])
    .filter((m: any) => !m.endDate || m.endDate >= todayStr);

  // 即将复查：各疾病 PENDING 复查，逾期置顶
  const fus: any[] = [];
  conditions.forEach((c: any) => {
    (c.followUps || []).forEach((f: any) => fus.push({ ...f, condName: c.name }));
  });
  fus.sort((a, b) => (isOverdue(a) ? 0 : 1) - (isOverdue(b) ? 0 : 1) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // 最近就诊：每个疾病最近 1 次
  const recs: any[] = [];
  conditions.forEach((c: any) => {
    (c.encounters || []).forEach((e: any) => recs.push({ ...e, condId: c.id, condName: c.name }));
  });
  recs.sort((a, b) => new Date(b.encounterDate || b.createdAt).getTime() - new Date(a.encounterDate || a.createdAt).getTime());

  const chronicTags = (patient.chronicTags || '').split(',').filter(Boolean);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      {/* 左列 */}
      <div>
        <Card title="档案摘要">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 16px' }}>
            <div><div style={{ fontSize: 11, color: C.ink3 }}>性别 / 年龄</div><div style={{ fontSize: 13, fontWeight: 500 }}>{patient.gender || '—'} · {calcAge(patient.birthDate) ?? '?'} 岁</div></div>
            <div><div style={{ fontSize: 11, color: C.ink3 }}>血型</div><div style={{ fontSize: 13, fontWeight: 500 }}>{patient.bloodType || '—'}</div></div>
            <div><div style={{ fontSize: 11, color: C.ink3 }}>过敏史</div><div style={{ fontSize: 13, fontWeight: 500 }}>{patient.allergies || '无记录'}</div></div>
            <div><div style={{ fontSize: 11, color: C.ink3 }}>慢性病</div><div style={{ fontSize: 13, fontWeight: 500 }}>{conditions.length} 项 · 见病历</div></div>
          </div>
          {chronicTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {chronicTags.map((t: string) => <Tag key={t} tone="brand">{t}</Tag>)}
            </div>
          )}
        </Card>
        <Card title="当前用药" dot={C.brandDeep} style={{ marginTop: 14 }} extra={<span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={() => props.setTab('meds')}>查看全部 →</span>}>
          {meds.length === 0 && <Empty text="暂无用药记录" style={{ padding: '16px' }} />}
          {meds.slice(0, 3).map((m: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.line2}`, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, flex: 'none' }} />
              <b style={{ fontWeight: 600 }}>{m.text || m.name || '未命名药物'}</b>
              <span style={{ color: C.ink2, fontSize: 12 }}>{m.dose || m.dosage || ''}</span>
              <span style={{ marginLeft: 'auto', color: C.ink2, fontSize: 12, flex: 'none' }}>{m.freq || m.frequency || '—'}</span>
            </div>
          ))}
        </Card>
      </div>
      {/* 右列 */}
      <div>
        <Card title="即将复查 · 30 天窗口" dot={C.amber} extra={<span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={() => props.setTab('followups')}>全部安排 →</span>}>
          {fus.length === 0 && <Empty text="30 天内无复查计划" style={{ padding: '16px' }} />}
          {fus.slice(0, 6).map((f: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.line2}` }}>
              <span style={{ fontSize: 12, color: C.ink2, width: 96, flex: 'none' }}>{fmtDateCN(f.dueDate)}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{f.items || '复查'}
                <span style={{ color: C.ink3, fontSize: 11 }}> · {f.condName}</span>
              </span>
              {isOverdue(f) ? <Tag tone="danger">逾期 {overdueDays(f)} 天</Tag> : <Tag tone="amber">待办</Tag>}
            </div>
          ))}
        </Card>
        <Card title="最近就诊（每疾病最近一次）" style={{ marginTop: 14 }}>
          {recs.length === 0 && <Empty text="暂无就诊记录，可在手机端补充" style={{ padding: '16px' }} />}
          {recs.slice(0, 5).map((r: any) => (
            <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.line2}`, cursor: 'pointer' }}
              onClick={() => props.onOpenRecord?.(r.condId, r.id)}>
              <div style={{ fontSize: 12, color: C.ink2, flex: 'none', width: 86 }}>{fmtDateCN(r.encounterDate || r.createdAt)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.hospital || '就诊'} · {r.department || '—'} <span style={{ fontSize: 11, color: C.ink3 }}>· {r.condName}</span></div>
                <div style={{ fontSize: 12, color: C.ink3 }}>{r.diagnosis || '—'}</div>
                {groupAttachments(r.attachments).length > 0 && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                    {groupAttachments(r.attachments).map((g) => <i key={g.cat} style={{ width: 34, height: 34, borderRadius: 6, background: C.brandSoft, border: `1px solid rgba(91,141,184,.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal', fontSize: 10, color: C.brandDeep }}>{g.cat}</i>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={() => mobileOnly()}>录入就诊（手机端）</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ color: C.ink3, fontSize: 13, padding: 30, textAlign: 'center' }}>加载中…</div>;
}
