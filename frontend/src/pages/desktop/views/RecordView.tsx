import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { C, Card, Tag, Empty, fmtDateCN, fmtDateTimeCN, groupAttachments, mobileOnly, isOverdue } from '../ui';

export default function RecordView(props: { activeId: number; recordTarget?: { condId: number; encId: number } | null }) {
  const { activeId, recordTarget } = props;
  const [condId, setCondId] = useState<number | null>(null);
  const [selEnc, setSelEnc] = useState<number | null>(null);
  const applied = useRef(false);

  const condsQ = useQuery({
    queryKey: ['conditions', activeId],
    queryFn: () => api.conditions(activeId!),
    enabled: !!activeId,
  });

  // 初始化选中第一个疾病
  useEffect(() => {
    if (!applied.current && condsQ.data?.length) {
      applied.current = true;
      setCondId(condsQ.data[0].id);
    }
  }, [condsQ.data]);

  // 外部跳转（总览"最近就诊"点击 → 选中疾病并展开就诊）
  useEffect(() => {
    if (recordTarget) {
      setCondId(recordTarget.condId);
      setSelEnc(recordTarget.encId);
    }
  }, [recordTarget]);

  const conds = condsQ.data || [];
  const timelineQ = useQuery({
    queryKey: ['timeline', condId],
    queryFn: () => api.timeline(condId!),
    enabled: !!condId,
  });
  const condition = timelineQ.data?.condition;
  const nodes = timelineQ.data?.nodes || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      {/* 疾病列表 */}
      <div>
        <Card title={`疾病档案 · ${conds.length}`}>
          {conds.length === 0 && <Empty text="暂无疾病记录" style={{ padding: '16px' }} />}
          {conds.map((c: any) => {
            const fuNum = (c.followUps || []).filter((f: any) => isOverdue(f)).length;
            return (
              <div key={c.id} onClick={() => { setCondId(c.id); setSelEnc(null); }}
                style={{ border: `1px solid ${condId === c.id ? C.brand : C.line}`, borderRadius: 10, padding: '11px 14px', cursor: 'pointer', marginBottom: 8, background: condId === c.id ? C.brandSoft : '#fff' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                  {c.name}
                  {fuNum > 0 && <Tag tone="danger" style={{ float: 'right' }}>{fuNum} 逾期</Tag>}
                </div>
                <div style={{ fontSize: 11, color: C.ink2, marginTop: 2 }}>{c.category || '—'} · {c.status || '—'} · 自 {fmtDateCN(c.discoveredDate)}</div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* 时间轴 */}
      <div>
        {timelineQ.isLoading ? (
          <Empty text="加载中…" />
        ) : (
          <>
            {condition && (
              <Card title={
                <span>
                  {condition.name}
                  <span style={{ color: C.ink3, fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                    {condition.category || '—'} · {condition.status || '—'} · 发现于 {fmtDateCN(condition.discoveredDate)}
                  </span>
                </span>
              }>
                {condition.advice && <Row k="医嘱" v={condition.advice} />}
                {condition.examSuggest && <Row k="检查建议" v={condition.examSuggest} />}
                {condition.examResult && <Row k="检查结果" v={condition.examResult} />}
                {condition.medication && <Row k="用药建议" v={condition.medication} />}
                {condition.notes && <Row k="备注" v={condition.notes} />}
                {groupAttachments(condition.attachments).length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {groupAttachments(condition.attachments).map((g) => (
                      <div key={g.cat} style={{ fontSize: 11, color: C.brandDeep, background: C.brandSoft, padding: '3px 10px', borderRadius: 999 }}>
                        {g.cat}（{g.items.length}）
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {nodes.length === 0 && !timelineQ.isLoading && <Empty text="该疾病暂无就诊与复查记录 · 可在手机端补充" style={{ marginTop: 14 }} />}

            <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 11, padding: '18px 20px 8px', marginTop: 14 }}>
              {nodes.map((n: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '92px 22px minmax(0,1fr)', columnGap: 0 }}>
                  {/* 时间列 */}
                  <div style={{ fontSize: 12, color: C.ink2, textAlign: 'right', paddingRight: 12, paddingTop: 8 }}>{fmtDateTimeCN(n.date)}</div>
                  {/* 轴列 */}
                  <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, marginTop: 10, background: n.type === 'encounter' ? C.brand : (n.data?.status === 'DONE' ? C.green : C.amber), boxShadow: `0 0 0 3px #fff, 0 0 0 4px ${n.type === 'encounter' ? C.brand : C.amber}`, flex: 'none', zIndex: 1 }} />
                    {idx < nodes.length - 1 && <div style={{ position: 'absolute', top: 22, bottom: 0, left: '50%', width: 2, background: C.line, transform: 'translateX(-50%)' }} />}
                  </div>
                  {/* 内容列 */}
                  <div style={{ padding: '0 0 18px 12px', minWidth: 0 }}>
                    {n.type === 'encounter' ? <EncounterCard n={n} open={selEnc === n.data.id} onToggle={() => setSelEnc(selEnc === n.data.id ? null : n.data.id)} /> : <FollowUpCard n={n} />}
                  </div>
                </div>
              ))}
              {nodes.length === 0 && <Empty text="暂无记录" style={{ padding: '20px' }} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row(props: { k: string; v: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '86px 1fr', gap: 8, fontSize: 12.5, padding: '5px 0', borderBottom: `1px dashed ${C.line2}` }}>
      <span style={{ color: C.ink3 }}>{props.k}</span>
      <span style={{ color: C.ink }}>{props.v}</span>
    </div>
  );
}

function EncounterCard(props: { n: any; open: boolean; onToggle: () => void }) {
  const d = props.n.data;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.brand}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', background: props.open ? '#f6fafd' : '#fff' }} onClick={props.onToggle}>
      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {d.hospital || '就诊'}{d.department ? ` · ${d.department}` : ''}
        <span style={{ fontSize: 10, color: C.brandDeep, background: C.brandSoft, padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>就诊</span>
        {props.open && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.ink3 }}>收起 ▲</span>}
      </div>
      {!props.open && (
        <>
          {d.diagnosis && <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>诊断：{d.diagnosis}</div>}
          {groupAttachments(d.attachments).length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              {groupAttachments(d.attachments).map((g) => <i key={g.cat} style={{ width: 40, height: 40, borderRadius: 6, background: C.brandSoft, border: `1px solid rgba(91,141,184,.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal', fontSize: 10, color: C.brandDeep }}>{g.cat} ×{g.items.length}</i>)}
            </div>
          )}
        </>
      )}
      {props.open && (
        <div style={{ marginTop: 10, borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>
          {d.doctor && <Row k="医生" v={d.doctor} />}
          {d.diagnosis && <Row k="诊断" v={d.diagnosis} />}
          {d.chiefComplaint && <Row k="主诉" v={d.chiefComplaint} />}
          {d.advice && <Row k="医嘱" v={d.advice} />}
          {(d.exams || []).map((e: any) => (
            <Row key={e.id} k="检查" v={`${e.name}：${e.resultValue || ''}${e.conclusion ? `（${e.conclusion}）` : ''}`} />
          ))}
          {(d.medications || []).map((m: any) => (
            <Row key={m.id} k="用药" v={`${m.name} ${m.dosage || ''} ${m.frequency || ''}`} />
          ))}
          {groupAttachments(d.attachments).length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {groupAttachments(d.attachments).map((g) => (
                <div key={g.cat}>
                  <div style={{ fontSize: 11, color: C.ink2, marginBottom: 4 }}>{g.cat}（{g.items.length}）</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {g.items.map((a: any) => (
                      <img key={a.id} src={`/api/attachments/${a.id}`} alt=""
                        onClick={(ev) => { ev.stopPropagation(); window.open(`/api/attachments/${a.id}`, '_blank'); }}
                        style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: `1px solid ${C.line}`, cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.brandDeep, cursor: 'pointer' }} onClick={(ev) => { ev.stopPropagation(); mobileOnly(); }}>编辑 / 删除（手机端）</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FollowUpCard(props: { n: any }) {
  const f = props.n.data;
  const dueDate = f.dueDate || props.n.date;
  const overdue = isOverdue({ dueDate, status: f.status });
  return (
    <div style={{ border: `1px solid ${C.line}`, borderLeft: `3px solid ${overdue ? C.danger : C.amber}`, borderRadius: 8, padding: '10px 12px', cursor: 'default', background: '#fff' }}>
      <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        复查提醒
        {f.status === 'DONE' ? <Tag tone="green">已完成</Tag> : overdue ? <Tag tone="danger">逾期</Tag> : <Tag tone="amber">待办</Tag>}
      </div>
      <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>{f.items || '复查'} · 到期 {fmtDateCN(dueDate)}</div>
    </div>
  );
}
