import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { C, Card, Tag, Empty, fmtDateCN, mobileOnly } from '../ui';

const LOGO_COLORS = ['#2f6ea8', '#d98b3a', '#4e9a6f', '#7a5fb8', '#b0578d'];

export default function InsuranceView(props: { activeId: number }) {
  const { activeId } = props;
  const q = useQuery({
    queryKey: ['insurances', activeId],
    queryFn: () => api.insurances(activeId!),
    enabled: !!activeId,
  });
  const list: any[] = q.data || [];

  if (q.isLoading) return <Empty text="加载中…" />;

  return (
    <div>
      <Card title={`保险保单 · ${list.length}`} extra={<span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={() => mobileOnly()}>添加保单（手机端）</span>}>
        {list.length === 0 && <Empty text="该病人暂无保单 · 可在手机端补充" />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {list.map((i: any, idx: number) => {
            const expireIn = i.validTo ? Math.round((new Date(i.validTo).getTime() - Date.now()) / 86400000) : null;
            const typeLabel = i.kind === 'MEDICAL' ? '医保' : (i.insurer || '商业保险');
            return (
              <div key={i.id} style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: LOGO_COLORS[idx % LOGO_COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
                    {(i.insurer || '保').slice(0, 1)}
                  </span>
                  {typeLabel}
                  <Tag tone={i.kind === 'MEDICAL' ? 'green' : 'brand'} style={{ marginLeft: 4 }}>{i.kind === 'MEDICAL' ? '医保' : '商业'}</Tag>
                </div>
                <div style={{ fontSize: 12, color: C.ink2, marginTop: 8, lineHeight: 1.7 }}>
                  {i.policyNo ? <div>保单号：{i.policyNo}</div> : null}
                  <div>有效期：{i.validFrom ? fmtDateCN(i.validFrom) : '—'} ~ {i.validTo ? fmtDateCN(i.validTo) : '长期'}</div>
                  {i.name ? <div>名称：{i.name}</div> : null}
                  {i.note ? <div>备注：{i.note}</div> : null}
                </div>
                {expireIn !== null && expireIn <= 365 && (
                  <div style={{ marginTop: 8 }}>
                    <Tag tone={expireIn <= 90 ? 'danger' : 'amber'}>到期 {fmtDateCN(i.validTo)} · 剩 {expireIn} 天</Tag>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
