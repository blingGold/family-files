import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { C, Card, Empty, fmtDateCN, mobileOnly } from '../ui';

export default function MedsView(props: { activeId: number }) {
  const { activeId } = props;
  const detailQ = useQuery({
    queryKey: ['patient', activeId],
    queryFn: () => api.patient(activeId!),
    enabled: !!activeId,
  });
  const condsQ = useQuery({
    queryKey: ['conditions', activeId],
    queryFn: () => api.conditions(activeId!),
    enabled: !!activeId,
  });

  if (detailQ.isLoading) return <Empty text="加载中…" />;
  const patient = detailQ.data;
  if (!patient) return <Empty text="病人数据加载失败" />;

  const todayStr = new Date().toISOString().slice(0, 10);
  const meds: any[] = (Array.isArray(patient.currentMedications) ? patient.currentMedications : [])
    .filter((m: any) => !m.endDate || m.endDate >= todayStr);

  const condName = (id: number | null | undefined): string => {
    if (id == null) return '—';
    const c = (condsQ.data || []).find((x: any) => x.id === id);
    return c ? c.name : '—';
  };

  // 来源就诊名
  const srcText = (m: any): string => {
    if (m.sourceEncounterId) return `就诊 #${m.sourceEncounterId}`;
    if (m.diseaseId != null) return condName(m.diseaseId);
    return '手动记录';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      <Card title={`当前用药 · ${meds.length}`}>
        {meds.length === 0 && <Empty text="暂无在用药物 · 可在手机端添加" />}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '24%' }} /><col style={{ width: '10%' }} /><col style={{ width: '22%' }} /><col style={{ width: '13%' }} /><col style={{ width: '16%' }} /><col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ fontSize: 11, color: C.ink3, textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>药物</th>
              <th style={{ fontSize: 11, color: C.ink3, textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>剂量</th>
              <th style={{ fontSize: 11, color: C.ink3, textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>频次</th>
              <th style={{ fontSize: 11, color: C.ink3, textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>起始</th>
              <th style={{ fontSize: 11, color: C.ink3, textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>来源疾病</th>
              <th style={{ fontSize: 11, color: C.ink3, textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>溯源</th>
            </tr>
          </thead>
          <tbody>
            {meds.map((m: any, i: number) => (
              <tr key={i} style={{}}>
                <td style={{ fontSize: 12.5, padding: '10px', borderBottom: `1px solid ${C.line2}` }}><b style={{ fontWeight: 600 }}>{m.text || m.name || '未命名药物'}</b></td>
                <td style={{ fontSize: 12.5, padding: '10px', borderBottom: `1px solid ${C.line2}` }}>{m.dose || m.dosage || '—'}</td>
                <td style={{ fontSize: 12.5, padding: '10px', borderBottom: `1px solid ${C.line2}` }}>{m.freq || m.frequency || '—'}</td>
                <td style={{ fontSize: 12.5, padding: '10px', borderBottom: `1px solid ${C.line2}` }}>{m.startDate ? fmtDateCN(m.startDate) : '长期'}</td>
                <td style={{ fontSize: 12.5, padding: '10px', borderBottom: `1px solid ${C.line2}` }}>
                  {m.diseaseId != null ? (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: C.greenSoft, color: C.green, fontWeight: 600 }}>{condName(m.diseaseId)}</span>
                  ) : (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#f2f5f8', color: C.ink2, fontWeight: 600 }}>手动</span>
                  )}
                </td>
                <td style={{ fontSize: 12.5, padding: '10px', borderBottom: `1px solid ${C.line2}` }}>
                  <span style={{ fontSize: 11, color: C.brandDeep, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => mobileOnly()}>{srcText(m)} →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meds.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={() => mobileOnly()}>调整用药（手机端）</span>
          </div>
        )}
      </Card>

      <div>
        <Card title="用药时间线" dot={C.brand}>
          {meds.length === 0 && <Empty text="暂无用药记录" style={{ padding: '16px' }} />}
          {meds.slice().sort((a: any, b: any) => (a.startDate || '').localeCompare(b.startDate || '')).map((m: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.line2}`, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, flex: 'none' }} />
              <b style={{ fontWeight: 600 }}>{m.text || m.name || '未命名药物'}</b>
              <span style={{ color: C.ink2, fontSize: 12 }}>{m.dose || m.dosage || ''}</span>
              <span style={{ marginLeft: 'auto', color: C.ink3, fontSize: 11, flex: 'none' }}>自 {m.startDate ? fmtDateCN(m.startDate) : '长期'} 起</span>
            </div>
          ))}
        </Card>
        <Card title="说明" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.8 }}>
            每条用药都可追溯到来源就诊或疾病；「手动」记录由手机端录入。已过期（endDate 早于今天）的药物自动隐藏。
          </div>
        </Card>
      </div>
    </div>
  );
}
