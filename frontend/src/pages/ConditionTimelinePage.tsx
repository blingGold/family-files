import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, DatePicker, Checkbox } from 'antd-mobile';
import { useRef, useState } from 'react';
import { api } from '../api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e5e7ec', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff',
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fuStatusText(s: string) {
  return s === 'ACTIVE' ? '治疗中' : s === 'FOLLOW_UP' ? '随访中' : s === 'CHRONIC' ? '慢性管理' : s || '—';
}

function buildExportMd(condition: any, encs: any[]): string {
  const L: string[] = [];
  L.push(`# 家庭病历导出 · ${condition?.name || ''}`);
  L.push('');
  L.push(`> 导出时间：${new Date().toLocaleString('zh-CN')}　共 ${encs.length} 条就诊记录`);
  L.push('');
  L.push('## 疾病档案');
  L.push(`- 其他称呼：${condition?.aliases || '无'}`);
  L.push(`- 疾病状态：${fuStatusText(condition?.status)}`);
  if (condition?.advice) L.push(`- 医嘱：${condition.advice}`);
  if (condition?.examSuggest) L.push(`- 检查建议：${condition.examSuggest}`);
  if (condition?.examResult) L.push(`- 检查结果：${condition.examResult}`);
  if (condition?.medication) L.push(`- 用药建议：${condition.medication}`);
  L.push('');
  L.push('## 就诊记录');
  encs.forEach((e: any, i: number) => {
    const d = new Date(e.encounterDate).toLocaleDateString('zh-CN');
    L.push(`### ${i + 1}. ${d}${e.hospital ? ' · ' + e.hospital : ''}${e.doctor ? ' · ' + e.doctor : ''}`);
    if (e.diagnosis) L.push(`- **诊断**：${e.diagnosis}`);
    if (e.chiefComplaint) L.push(`- **主诉**：${e.chiefComplaint}`);
    if (e.advice) L.push(`- **医嘱**：${e.advice}`);
    if (e.exams?.length) {
      L.push('- **检查**：');
      e.exams.forEach((x: any) => L.push(`  - ${x.name}${x.resultValue ? ' ' + x.resultValue : ''}${x.conclusion ? '（' + x.conclusion + '）' : ''}`));
    }
    if (e.medications?.length) {
      L.push('- **用药**：');
      e.medications.forEach((m: any) => L.push(`  - ${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? '，' + m.frequency : ''}`));
    }
    if (e.notes) L.push(`- **备注**：${e.notes}`);
    L.push('');
  });
  return L.join('\n');
}

export default function ConditionTimelinePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => api.timeline(Number(id)),
    enabled: !!id,
  });

  // 新增复查计划弹窗
  const [showFu, setShowFu] = useState(false);
  const [fuItems, setFuItems] = useState('');
  const [fuDate, setFuDate] = useState<Date>(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; });
  const [fuPicker, setFuPicker] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [intervalMonths, setIntervalMonths] = useState(3);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [editingFu, setEditingFu] = useState<any>(null);
  const [ocrExtra, setOcrExtra] = useState('');
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // 导出
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState<'range' | 'manual'>('manual');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date>(new Date());
  const [exportPicker, setExportPicker] = useState<'from' | 'to' | null>(null);
  const [checkedEncIds, setCheckedEncIds] = useState<number[]>([]);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  const data = q.data;
  const condition = data?.condition;
  const nodes = data?.nodes || [];

  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrBusy(true); setOcrText('');
    try {
      const r = await api.ocr(file);
      setOcrText(r.text);
      const p = r.parsed;
      if (p) {
        if (p.followUpDate) {
          const d = new Date(p.followUpDate);
          if (!isNaN(d.getTime())) setFuDate(d);
        }
        if (p.followUpItems) setFuItems(p.followUpItems);
        const extra: string[] = [];
        if (p.advice) extra.push(`医嘱：${p.advice}`);
        if (p.examResult) extra.push(`检查结果：${p.examResult}`);
        if (p.medication) extra.push(`用药建议：${p.medication}`);
        setOcrExtra(extra.join('\n'));
      } else {
        const t = r.text;
        const dateMatch =
          t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/) ||
          t.match(/(\d{4})[\-/.](\d{1,2})[\-/.](\d{1,2})/) ||
          t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
        if (dateMatch) {
          const y = +dateMatch[1], m = +dateMatch[2], d = +dateMatch[3];
          if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            setFuDate(new Date(y, m - 1, d));
          }
        }
        const itemMatch = t.match(/复查\s*([^\s，。；、\n]{1,14})/) || t.match(/复诊\s*([^\s，。；、\n]{1,14})/);
        if (itemMatch) {
          setFuItems(itemMatch[1].replace(/建议|后复查$/g, '').trim());
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || '识别失败，请重试');
    } finally {
      setOcrBusy(false);
      e.target.value = '';
    }
  };

  const encounters = (data?.nodes || []).filter((n: any) => n.type === 'encounter').map((n: any) => n.data);

  const calcRange = (from: Date | null, to: Date) => {
    const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
    return encounters
      .filter((e: any) => {
        const d = new Date(e.encounterDate);
        if (from && d < from) return false;
        if (d > toEnd) return false;
        return true;
      })
      .map((e: any) => e.id);
  };

  const openExport = () => {
    setShowExport(true);
    setSummaryResult(null);
    setExportMode('manual');
    setCheckedEncIds(encounters.map((e: any) => e.id));
  };
  const switchExportMode = (m: 'range' | 'manual') => {
    setExportMode(m);
    setSummaryResult(null);
    setCheckedEncIds(m === 'range' ? calcRange(fromDate, toDate) : encounters.map((e: any) => e.id));
  };
  const onFromChange = (d: Date) => { setFromDate(d); setCheckedEncIds(calcRange(d, toDate)); };
  const onToChange = (d: Date) => { setToDate(d); setCheckedEncIds(calcRange(fromDate, d)); };

  const downloadMd = () => {
    const sel = encounters
      .filter((e: any) => checkedEncIds.includes(e.id))
      .sort((a: any, b: any) => new Date(a.encounterDate).getTime() - new Date(b.encounterDate).getTime());
    if (!sel.length) { alert('请先选择就诊记录'); return; }
    const md = buildExportMd(condition, sel);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ds = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `${condition?.name || '疾病'}_病历导出_${ds}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doSummary = async () => {
    const sel = encounters.filter((e: any) => checkedEncIds.includes(e.id));
    if (!sel.length) { alert('请先选择就诊记录'); return; }
    setSummaryBusy(true);
    try {
      const r = await api.exportSummary(Number(id), sel.map((e: any) => e.id));
      setSummaryResult(r.summary);
    } catch (e: any) {
      alert(e?.response?.data?.message || '总结失败');
    } finally {
      setSummaryBusy(false);
    }
  };

  const closeFuModal = () => {
    setShowFu(false);
    setEditingFu(null);
    setFuItems('');
    setOcrExtra('');
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    setFuDate(d);
  };

  const openEditFu = (f: any) => {
    setEditingFu(f);
    setFuItems(f.items || '');
    setFuDate(new Date(f.dueDate));
    setRecurring(f.recurring || false);
    setIntervalMonths(f.intervalMonths || 3);
    setShowFu(true);
  };

  const addFollowUp = async () => {
    try {
      if (editingFu) {
        await api.updateFollowup(editingFu.id, {
          dueDate: fuDate.toISOString(),
          items: fuItems || '复查',
          recurring,
          intervalMonths: recurring ? intervalMonths : undefined,
        });
        closeFuModal();
        qc.invalidateQueries({ queryKey: ['timeline', id] });
        qc.invalidateQueries();
        return;
      }
      await api.createFollowUp(Number(id), {
        patientId: condition.patientId,
        dueDate: fuDate.toISOString(),
        items: fuItems || '复查',
        recurring,
        intervalMonths: recurring ? intervalMonths : undefined,
      });
      closeFuModal();
      qc.invalidateQueries({ queryKey: ['timeline', id] });
      qc.invalidateQueries();
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7' }}>
      <NavBar onBack={() => nav(-1)}>
        {condition?.name || '疾病详情'}
      </NavBar>
      {condition?.aliases && (
        <div style={{ padding: '0 16px', fontSize: 12, color: '#7a828c', marginTop: -8, paddingBottom: 8 }}>
          俗称：{condition.aliases}
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => nav(`/conditions/${id}/new-encounter`)} style={{
            flex: 1, padding: '12px', borderRadius: 8, border: 'none',
            background: '#5b8db8', color: '#fff', fontSize: 14, fontWeight: 500,
          }}>+ 添加就诊记录</button>
          <button onClick={() => setShowFu(true)} style={{
            flex: 1, padding: '12px', borderRadius: 8,
            background: '#fff', color: '#5b8db8', fontSize: 14, fontWeight: 500,
            border: '0.5px solid #5b8db8',
          }}>+ 添加复查计划</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={openExport} style={{
            fontSize: 13, color: '#3d6b94', background: 'rgba(91,141,184,0.08)',
            padding: '6px 14px', borderRadius: 999, border: '0.5px solid rgba(91,141,184,0.4)',
          }}>⬇ 导出病历</button>
        </div>

        {(condition?.advice || condition?.examSuggest || condition?.examResult || condition?.medication) && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, border: '0.5px solid #e5e7ec' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2b2f36', marginBottom: 8 }}>疾病档案</div>
            {condition.advice && <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 4 }}><b>医嘱：</b>{condition.advice}</div>}
            {condition.examSuggest && <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 4 }}><b>检查建议：</b>{condition.examSuggest}</div>}
            {condition.examResult && <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 4 }}><b>检查结果：</b>{condition.examResult}</div>}
            {condition.medication && <div style={{ fontSize: 13, color: '#4a5568' }}><b>用药建议：</b>{condition.medication}</div>}
          </div>
        )}

        {q.isLoading && <div style={{ textAlign: 'center', padding: 40, color: '#7a828c' }}>加载中…</div>}
        {!q.isLoading && nodes.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, color: '#7a828c', fontSize: 13, textAlign: 'center' }}>
            暂无记录，先添加一次就诊吧
          </div>
        )}
        {nodes.map((n: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 12, height: 12, borderRadius: 6, marginTop: 6,
                background: n.type === 'encounter' ? '#5b8db8' : '#d9a648',
                flexShrink: 0,
              }} />
              {idx < nodes.length - 1 && <div style={{ width: 2, flex: 1, background: '#e5e7ec' }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#7a828c' }}>{fmtDateTime(n.date)}</div>
              {n.type === 'encounter' ? (
                <div onClick={() => nav(`/encounters/${n.data.id}/edit`)} style={{ background: '#fff', borderRadius: 12, padding: 12, marginTop: 6, border: '0.5px solid #e5e7ec', cursor: 'pointer' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#2b2f36' }}>
                    {n.data.hospital || '就诊'}{n.data.department ? ` · ${n.data.department}` : ''}
                  </div>
                  {n.data.doctor && <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>医生：{n.data.doctor}</div>}
                  {n.data.diagnosis && <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>诊断：{n.data.diagnosis}</div>}
                  {n.data.advice && <div style={{ fontSize: 13, color: '#7a828c', marginTop: 2 }}>医嘱：{n.data.advice}</div>}
                  {n.data.exams?.map((e: any) => (
                    <div key={e.id} style={{ marginTop: 8, padding: 8, background: '#f6f7f9', borderRadius: 8, fontSize: 12 }}>
                      <b>{e.name}</b>：{e.resultValue || ''} {e.conclusion ? `（${e.conclusion}）` : ''}
                    </div>
                  ))}
                  {n.data.medications?.map((m: any) => (
                    <div key={m.id} style={{ marginTop: 4, fontSize: 12, color: '#4a5568' }}>{m.name} {m.dosage || ''} {m.frequency || ''}</div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 12, padding: 12, marginTop: 6, border: '0.5px solid #e5e7ec' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, color: '#d9a648' }}>复查计划：{n.data.items || '复查'}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => openEditFu(n.data)} style={{ fontSize: 12, color: '#5b8db8', border: 'none', background: 'none', padding: 0 }}>编辑</button>
                      <button
                        onClick={async () => {
                          if (!confirm('确定删除这条复查计划？')) return;
                          try {
                            await api.deleteFollowup(n.data.id);
                            qc.invalidateQueries({ queryKey: ['timeline', id] });
                            qc.invalidateQueries();
                          } catch (e: any) {
                            alert(e?.response?.data?.message || '删除失败');
                          }
                        }}
                        style={{ fontSize: 12, color: '#d97b7b', border: 'none', background: 'none', padding: 0 }}
                      >删除</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>
                    状态：{n.data.status === 'DONE' ? '已完成' : n.data.status === 'PENDING' ? '待复查' : n.data.status}
                    {n.data.recurring ? ` · 每 ${n.data.intervalMonths} 个月` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 添加复查计划弹窗 */}
      {showExport && (
        <div onClick={() => setShowExport(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '82vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>导出病历 · {condition?.name}</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([['range', '时间范围'], ['manual', '手动勾选']] as const).map(([k, label]) => (
                <span key={k} onClick={() => switchExportMode(k)} style={{
                  fontSize: 13, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                  background: exportMode === k ? '#5b8db8' : '#f4f5f7',
                  color: exportMode === k ? '#fff' : '#4a5568',
                }}>{label}</span>
              ))}
            </div>

            {exportMode === 'range' ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 4 }}>开始日期</div>
                    <div onClick={() => setExportPicker('from')} style={{ ...inputStyle, fontSize: 13, textAlign: 'center' }}>
                      {fromDate ? fromDate.toLocaleDateString('zh-CN') : '不限'}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 4 }}>结束日期</div>
                    <div onClick={() => setExportPicker('to')} style={{ ...inputStyle, fontSize: 13, textAlign: 'center' }}>
                      {toDate.toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#7a828c', marginTop: 6 }}>按就诊日期筛选，已选 {checkedEncIds.length} 条</div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#7a828c' }}>勾选要导出的就诊记录（{checkedEncIds.length}/{encounters.length}）</span>
                  <span
                    onClick={() => setCheckedEncIds(checkedEncIds.length === encounters.length ? [] : encounters.map((e: any) => e.id))}
                    style={{ fontSize: 12, color: '#3d6b94', cursor: 'pointer' }}
                  >{checkedEncIds.length === encounters.length ? '取消全选' : '全选'}</span>
                </div>
                <div style={{ maxHeight: 220, overflow: 'auto', border: '0.5px solid #e5e7ec', borderRadius: 8, padding: '4px 10px' }}>
                  {encounters.length === 0 && <div style={{ padding: 16, color: '#7a828c', fontSize: 13, textAlign: 'center' }}>暂无就诊记录</div>}
                  {encounters.map((e: any) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '0.5px solid #f0f1f4' }}>
                      <input type="checkbox" checked={checkedEncIds.includes(e.id)} onChange={(ev) => {
                        setCheckedEncIds(ev.target.checked ? [...checkedEncIds, e.id] : checkedEncIds.filter((x) => x !== e.id));
                      }} />
                      <div style={{ fontSize: 13, color: '#2b2f36' }}>
                        {new Date(e.encounterDate).toLocaleDateString('zh-CN')}{e.hospital ? ' · ' + e.hospital : ''}{e.doctor ? ' · ' + e.doctor : ''}
                      </div>
                      {e.diagnosis && <div style={{ fontSize: 12, color: '#7a828c', marginLeft: 'auto', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.diagnosis}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summaryResult && (
              <div style={{ marginBottom: 12, background: '#f6f7f9', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2b2f36' }}>AI 总结（{checkedEncIds.length} 条记录）</span>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText(summaryResult); alert('已复制'); } catch { alert('复制失败，请手动长按选择复制'); } }}
                    style={{ fontSize: 12, color: '#3d6b94', border: 'none', background: 'none', padding: 0 }}
                  >复制</button>
                </div>
                <pre style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, maxHeight: 260, overflow: 'auto' }}>{summaryResult}</pre>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowExport(false)} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>关闭</button>
              <button onClick={downloadMd} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#5b8db8', color: '#fff', fontSize: 14 }}>导出 Markdown 文件</button>
              <button onClick={doSummary} disabled={summaryBusy} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '0.5px solid #5b8db8', background: '#fff', color: '#5b8db8', fontSize: 14 }}>
                {summaryBusy ? '总结中…' : 'AI 总结'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFu && (
        <div onClick={closeFuModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{editingFu ? '编辑复查计划' : '添加复查计划'}</div>
            <div style={{ background: '#f6f7f9', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <button
                onClick={() => ocrInputRef.current?.click()}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#5b8db8', color: '#fff', fontSize: 14 }}
              >{ocrBusy ? '识别中…' : '📷 拍照/选图识别复查单'}</button>
              <input ref={ocrInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOcr} />
              {ocrText && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#7a828c', background: '#fff', padding: '6px 10px', borderRadius: 6, border: '0.5px solid #e5e7ec', maxHeight: 80, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {ocrText.slice(0, 300)}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>复查项目</div>
              <input style={inputStyle} value={fuItems} onChange={(e) => setFuItems(e.target.value)} placeholder="如：复查血压" />
            </div>
            {ocrExtra && (
              <div style={{ marginBottom: 12, fontSize: 12, color: '#7a828c', background: '#f6f7f9', padding: '8px 10px', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                {ocrExtra}
                <div style={{ marginTop: 4, color: '#5b8db8' }}>如需记录以上内容，请到"就诊记录"中录入</div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>提醒日期（自定义）</div>
              <div style={inputStyle as any} onClick={() => setFuPicker(true)}>{fuDate.toLocaleDateString('zh-CN')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#2b2f36' }}>周期复查</span>
              <Checkbox checked={recurring} onChange={(c) => setRecurring(c)} />
            </div>
            {recurring && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>间隔（月）</div>
                <select style={inputStyle} value={intervalMonths} onChange={(e) => setIntervalMonths(Number(e.target.value))}>
                  {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n} 个月</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={closeFuModal} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={addFollowUp} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#5b8db8', color: '#fff', fontSize: 14 }}>保存</button>
            </div>
          </div>
        </div>
      )}

      <DatePicker visible={fuPicker} value={fuDate} onClose={() => setFuPicker(false)} onConfirm={(d) => { setFuDate(d); setFuPicker(false); }} />
      <DatePicker
        visible={exportPicker !== null}
        value={exportPicker === 'from' ? (fromDate || new Date()) : toDate}
        onClose={() => setExportPicker(null)}
        onConfirm={(d) => {
          if (exportPicker === 'from') onFromChange(d);
          else if (exportPicker === 'to') onToChange(d);
          setExportPicker(null);
        }}
        title={exportPicker === 'from' ? '选择开始日期' : '选择结束日期'}
      />
    </div>
  );
}
