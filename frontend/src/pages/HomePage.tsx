import { TabBar, Dialog, DatePicker } from 'antd-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AppOutline,
  BellOutline,
  CheckShieldOutline,
  ClockCircleOutline,
  UserOutline,
} from 'antd-mobile-icons';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { compressImage } from '../utils/image';
import { usePatientStore } from '../store/patient';
import { DISEASE_PRESETS, DISEASE_CATEGORIES, CUSTOM_DISEASE, matchDisease } from '../constants/diseases';

const STATUS_META: Record<string, { label: string; bar: string; tagBg: string; tagColor: string }> = {
  FOLLOWING: { label: '随访中', bar: '#5b8db8', tagBg: 'rgba(91,141,184,0.12)', tagColor: '#3d6b94' },
  TREATING: { label: '治疗中', bar: '#c26b5a', tagBg: 'rgba(194,107,90,0.12)', tagColor: '#a04838' },
  CURED: { label: '已治愈', bar: '#c9bfb3', tagBg: 'rgba(122,130,140,0.12)', tagColor: '#7a828c' },
  CHRONIC: { label: '慢性管理', bar: '#7ba88c', tagBg: 'rgba(123,168,140,0.14)', tagColor: '#5a8069' },
};

function fmtDate(d: any) {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
// 完整日期（yyyy/mm/dd），空值/非法返回 ''
function fmtDateFull(d: any) {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t.getTime()) ? '' : t.toLocaleDateString('zh-CN');
}
function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function calcAge(birthDate?: string) {
  if (!birthDate) return '';
  const b = new Date(birthDate); const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age > 0 ? `${age} 岁` : '';
}

function BellWithBadge({ count }: { count: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', lineHeight: 1 }}>
      <BellOutline style={{ fontSize: 22, color: '#2b2f36' }} />
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16,
          padding: '0 4px', borderRadius: 8, background: '#c26b5a', color: '#fff',
          fontSize: 10, fontWeight: 600, lineHeight: '16px', textAlign: 'center',
        }}>{count > 99 ? '99+' : count}</span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e5e7ec', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff',
};

export default function HomePage() {
  const [tab, setTab] = useState('home');
  const [patientId, setPatientId] = useState<number | null>(null);
  const { currentPatientId, setCurrentPatientId } = usePatientStore();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewCondition, setShowNewCondition] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrMatched, setOcrMatched] = useState<any>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const [np, setNp] = useState<any>({});
  const [nc, setNc] = useState<any>({});
  const [condPending, setCondPending] = useState<{ cat: string; file: File; preview: string; uid: number }[]>([]);
  const [condCat, setCondCat] = useState('影像');
  const condAttInputRef = useRef<HTMLInputElement>(null);
  const condPendingUid = useRef(0);
  // 新增疾病时的首次复查安排
  const [fuOn, setFuOn] = useState(false);
  const [fuItems, setFuItems] = useState('');
  const [fuDate, setFuDate] = useState<Date | null>(null);
  const [fuPicker, setFuPicker] = useState(false);
  // 时间组件（统一 antd-mobile DatePicker 弹层交互）
  const [npBirthPicker, setNpBirthPicker] = useState(false);
  const [visitPicker, setVisitPicker] = useState(false);
  const [discoverPicker, setDiscoverPicker] = useState(false);
  // 用药编辑弹窗内日期选择
  const [medDatePicker, setMedDatePicker] = useState<{ row: number; field: 'start' | 'end' } | null>(null);
  const [fuRecurring, setFuRecurring] = useState(false);
  const [fuInterval, setFuInterval] = useState(3);
  // 当前用药手动编辑弹窗
  const [showMedEdit, setShowMedEdit] = useState(false);
  const [medRows, setMedRows] = useState<any[]>([]);
  // 防重复提交
  const [savingMed, setSavingMed] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingCondition, setSavingCondition] = useState(false);

  const patientsQ = useQuery({ queryKey: ['patients'], queryFn: api.patients });
  const patients = patientsQ.data || [];

  useEffect(() => {
    if (patientId === null && patients.length > 0) {
      const valid = patients.some((p: any) => p.id === currentPatientId) ? currentPatientId : patients[0].id;
      setPatientId(valid);
      if (valid !== currentPatientId) setCurrentPatientId(valid);
    }
  }, [patients, patientId]);

  const detailQ = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.patient(patientId!),
    enabled: !!patientId,
  });
  const badgeQ = useQuery({ queryKey: ['badge'], queryFn: api.followupBadge, refetchInterval: 30000 });

  const patient = detailQ.data;
  const conditions = patient?.conditions || [];
  const activeConditions = conditions.filter((c: any) => c.status !== 'CURED');
  const fuQ = useQuery({
    queryKey: ['followups', patientId],
    queryFn: () => api.followups({ scope: 'patient', patientId }),
    enabled: !!patientId,
  });
  const pendingFus = (fuQ.data || []).map((f: any) => ({ ...f, conditionName: f.condition?.name || '' }));
  const insurances = patient?.insurances || [];
  // 当前用药：自动过滤已失效（endDate 早于今天）的记录
  const todayStr = new Date().toISOString().slice(0, 10);
  const meds: any[] = (Array.isArray(patient?.currentMedications) ? patient.currentMedications : [])
    .filter((m: any) => !m.endDate || m.endDate >= todayStr);

  const closeNewPatient = () => {
    setShowNewPatient(false);
    setNp({});
  };

  const openMedEdit = () => {
    const rows = (Array.isArray(patient?.currentMedications) ? patient.currentMedications : [])
      .filter((m: any) => !m.endDate || m.endDate >= todayStr)
      .map((m: any) => ({
        id: m.id || '', diseaseId: m.diseaseId ?? null, sourceEncounterId: m.sourceEncounterId ?? null,
        manual: !!m.manual, text: m.text || m.name || '',
        startDate: m.startDate || null, endDate: m.endDate || null,
        rangeType: (m.startDate || m.endDate) ? '期间' : '长期',
        start: m.startDate || '', end: m.endDate || '',
        removed: false,
      }));
    setMedRows(rows);
    setShowMedEdit(true);
  };

  const saveMedEdit = async () => {
    if (savingMed) return;
    setSavingMed(true);
    // 手动记录：全量提交（含新增/修改/删除）；就诊绑定记录：标记移除的解除绑定
    const manual = medRows.filter((r) => r.manual && !r.removed && r.text.trim()).map((r) => ({
      id: r.id || undefined,
      text: r.text.trim(),
      startDate: r.rangeType === '期间' && r.start ? r.start : null,
      endDate: r.rangeType === '期间' && r.end ? r.end : null,
    }));
    const removeDiseaseIds = medRows.filter((r) => !r.manual && r.removed && r.diseaseId != null).map((r) => r.diseaseId);
    try {
      await api.updatePatientMedications(patientId!, { manual, removeDiseaseIds });
      setShowMedEdit(false);
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    } finally {
      setSavingMed(false);
    }
  };

  const closeNewCondition = () => {
    setShowNewCondition(false);
    setNc({});
    setCondPending([]);
    setCondCat('影像');
    setFuOn(false); setFuItems(''); setFuDate(null); setFuRecurring(false);
    setOcrText(''); setOcrMatched(null);
  };

  const submitNewPatient = async () => {
    if (savingPatient) return;
    if (!np.name) return alert('请输入姓名');
    setSavingPatient(true);
    try {
      const created = await api.createPatient(np);
      setShowNewPatient(false); setNp({});
      qc.invalidateQueries({ queryKey: ['patients'] });
      setPatientId(created.id); setCurrentPatientId(created.id);
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    } finally {
      setSavingPatient(false);
    }
  };
  const handleOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrBusy(true); setOcrText(''); setOcrMatched(null);
    try {
      const r = await api.ocr(file);
      setOcrText(r.text);
      const p = r.parsed;
      if (p) {
        const m = p.disease ? matchDisease(p.disease) : null;
        if (m) {
          setOcrMatched(m);
          setNc((prev: any) => ({
            ...prev, name: m.name,
            aliases: p.aliases || m.aliases,
            advice: p.advice || '', examSuggest: p.examSuggest || '',
            examResult: p.examResult || '', medication: p.medication || '',
          }));
        } else {
          setNc((prev: any) => ({
            ...prev,
            name: p.disease || prev.name,
            aliases: p.aliases || prev.aliases,
            advice: p.advice || '', examSuggest: p.examSuggest || '',
            examResult: p.examResult || '', medication: p.medication || '',
          }));
        }
        if (p.followUpDate) { setFuOn(true); setFuDate(new Date(p.followUpDate)); }
        if (p.followUpItems) setFuItems(p.followUpItems);
        setNc((prev: any) => ({
          ...prev,
          visitDate: p.visitDate || prev.visitDate,
          hospital: p.hospital || prev.hospital,
          doctor: p.doctor || prev.doctor,
        }));
      } else {
        const m = matchDisease(r.text);
        if (m) {
          setOcrMatched(m);
          setNc((prev: any) => ({ ...prev, name: m.name, aliases: m.aliases }));
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || '识别失败，请重试');
    } finally {
      setOcrBusy(false);
      e.target.value = '';
    }
  };

  const submitNewCondition = async () => {
    if (savingCondition) return;
    const name = nc.name === CUSTOM_DISEASE ? (nc.customName || '').trim() : nc.name;
    if (!name) return alert('请输入疾病名称');
    setSavingCondition(true);
    try {
    const created = await api.createCondition(patientId!, { status: 'FOLLOWING', ...nc, name });
    // OCR/手动填了就诊信息 → 自动创建就诊记录
    if (nc.visitDate || nc.hospital || nc.doctor || nc.advice || nc.examResult || nc.medication) {
      const exams = nc.examResult ? [{ name: '辅助检查', conclusion: nc.examResult }] : [];
      const medications = nc.medication ? [{ name: '用药', dosage: nc.medication }] : [];
      await api.createEncounter(created.id, {
        encounterDate: nc.visitDate ? new Date(nc.visitDate).toISOString() : new Date().toISOString(),
        hospital: nc.hospital || '',
        doctor: nc.doctor || '',
        diagnosis: name,
        advice: nc.advice || '',
        exams,
        medications,
      });
    }
    if (fuOn) {
      await api.createFollowUp(created.id, {
        patientId: patientId!,
        dueDate: fuDate ? (fmtDateFull(fuDate) ? new Date(fuDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString()) : new Date(Date.now() + 30 * 86400000).toISOString(),
        items: fuItems || '首次复查',
        recurring: fuRecurring,
        intervalMonths: fuRecurring ? fuInterval : undefined,
      });
    }
    // 新增疾病暂存图片 → 保存后自动上传
    for (const pf of condPending) {
      try {
        await api.uploadConditionAttachment(created.id, await compressImage(pf.file), pf.cat);
      } catch (err: any) {
        alert(`图片「${pf.file.name}」上传失败：${err?.response?.data?.message || '请稍后进入疾病页补传'}`);
      }
    }
    closeNewCondition();
    qc.invalidateQueries({ queryKey: ['patient', patientId] });
    qc.invalidateQueries();
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    } finally {
      setSavingCondition(false);
    }
  };

  if (patientsQ.isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7', paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={patientId ?? ''} onChange={(e) => { const id = Number(e.target.value); setPatientId(id); setCurrentPatientId(id); }}
            style={{ fontSize: 18, fontWeight: 600, color: '#2b2f36', border: 'none', background: 'transparent', outline: 'none' }}>
            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span onClick={() => setShowNewPatient(true)} style={{ fontSize: 20, color: '#5b8db8', padding: '0 6px', cursor: 'pointer' }}>+</span>
        </div>
        <BellWithBadge count={badgeQ.data?.count || 0} />
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, border: '0.5px solid #e5e7ec' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div onClick={() => patient && nav(`/patients/${patient.id}`)} style={{ width: 52, height: 52, borderRadius: 16, background: '#5b8db8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
              <UserOutline style={{ fontSize: 26 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#2b2f36' }}>
                  {patient?.name || '未选择'}
                  <span style={{ fontSize: 12, color: '#7a828c', fontWeight: 400, marginLeft: 8 }}>
                    {patient?.gender === 'MALE' ? '男' : patient?.gender === 'FEMALE' ? '女' : ''}
                  </span>
                </div>
                {patient && (
                  <span
                    onClick={() => nav(`/patients/${patient.id}`)}
                    style={{ fontSize: 12, color: '#3d6b94', cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}
                  >编辑资料</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#7a828c', marginTop: 4 }}>
                {calcAge(patient?.birthDate) || '年龄未知'} · {patient?.heightCm ? `${patient.heightCm} cm` : '身高—'} · {patient?.weightKg ? `${patient.weightKg} kg` : '体重—'}
              </div>
              <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>
                血型 {patient?.bloodType || '—'}　过敏：{patient?.allergies || '无记录'}
              </div>
            </div>
          </div>
          {patient?.chronicTags && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {patient.chronicTags.split(',').filter(Boolean).map((t: string) => (
                <span key={t} style={{ fontSize: 12, color: '#4a5568', background: '#eef1f5', padding: '4px 10px', borderRadius: 999 }}>{t}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, borderTop: '0.5px solid #eef0f3', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2b2f36' }}>当前用药</span>
              <span onClick={openMedEdit} style={{ fontSize: 12, color: '#3d6b94', cursor: 'pointer' }}>编辑</span>
            </div>
            {meds.length === 0 ? (
              <div style={{ fontSize: 12, color: '#7a828c', marginTop: 8 }}>暂无用药记录（新增疾病/就诊时自动带出，可手动编辑）</div>
            ) : (
              meds.map((m: any, i: number) => (
                <div key={i} style={{ marginTop: 8, padding: '8px 10px', background: '#fafbfc', border: '0.5px solid #eef0f3', borderRadius: 8 }}>
                  {(m.text || '').split('\n').filter(Boolean).map((line: string, j: number) => (
                    <div key={j} style={{ fontSize: 12, color: '#4a5568', lineHeight: 1.7 }}>· {line}</div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(123,168,140,0.14)', color: '#5a8069', padding: '1px 8px', borderRadius: 999, fontSize: 11 }}>
                      {m.timeRange || '长期'}
                    </span>
                    {m.manual ? (
                      <span style={{ background: '#eef1f5', color: '#7a828c', padding: '1px 8px', borderRadius: 999, fontSize: 11 }}>手动</span>
                    ) : (
                      <span style={{ background: '#e8eef5', color: '#3d6b94', padding: '1px 8px', borderRadius: 999, fontSize: 11 }}>来自就诊{m.diseaseName ? '·' + m.diseaseName : ''}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: '#2b2f36', margin: '20px 0 10px' }}>即将复查</div>
        {pendingFus.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, color: '#7a828c', fontSize: 13, border: '0.5px solid #e5e7ec' }}>近期没有待复查项</div>
        )}
        {pendingFus.map((f: any) => {
          const due = new Date(f.dueDate); const now = new Date();
          const overdue = due < now; const d = daysBetween(now, due);
          return (
            <div key={f.id} onClick={() => nav(`/conditions/${f.conditionId}`)} style={{ background: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, border: '0.5px solid #e5e7ec', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: overdue ? 'rgba(194,107,90,0.12)' : 'rgba(217,166,72,0.14)', color: overdue ? '#c26b5a' : '#d9a648', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockCircleOutline style={{ fontSize: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2b2f36' }}>{f.conditionName} · {f.items || '复查'}</div>
                <div style={{ fontSize: 12, marginTop: 3, color: overdue ? '#c26b5a' : '#7a828c' }}>
                  {overdue ? `逾期 ${-d} 天 · ` : `${d} 天后 · `}{fmtDate(f.dueDate)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <span onClick={(e) => { e.stopPropagation(); nav(`/conditions/${f.conditionId}/new-encounter`); }} style={{ fontSize: 12, color: '#4a5568', background: '#eef1f5', padding: '6px 12px', borderRadius: 999, cursor: 'pointer' }}>去复查</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定删除这条复查计划？')) {
                      api.deleteFollowup(f.id).then(() => {
                        qc.invalidateQueries({ queryKey: ['patient', patientId] });
                        qc.invalidateQueries();
                      }).catch(() => alert('删除失败'));
                    }
                  }}
                  style={{ fontSize: 12, color: '#d97b7b', background: '#fdf3f3', padding: '6px 10px', borderRadius: 999, cursor: 'pointer' }}
                >删除</span>
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#2b2f36' }}>当前疾病</div>
          <span onClick={() => patientId && setShowNewCondition(true)} style={{ fontSize: 13, color: '#3d6b94', cursor: 'pointer' }}>+ 新增</span>
        </div>
        {activeConditions.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, color: '#7a828c', fontSize: 13, border: '0.5px solid #e5e7ec' }}>暂无疾病记录</div>
        )}
        {activeConditions.map((c: any) => {
          const meta = STATUS_META[c.status] || STATUS_META.FOLLOWING;
          const lastVisit = c.encounters?.[0]; const nextFu = c.followUps?.[0];
          return (
            <div key={c.id} onClick={() => nav(`/conditions/${c.id}`)} style={{ background: '#fff', borderRadius: 16, marginBottom: 10, cursor: 'pointer', border: '0.5px solid #e5e7ec', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: 4, background: meta.bar, flexShrink: 0 }} />
              <div style={{ padding: 14, flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#2b2f36' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: meta.tagColor, background: meta.tagBg, padding: '2px 8px', borderRadius: 999 }}>{meta.label}</span>
                </div>
                {c.aliases && (
                  <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>俗称：{c.aliases}</div>
                )}
                <div style={{ fontSize: 12, color: '#7a828c', marginTop: 8 }}>最近就诊 {lastVisit ? `${fmtDate(lastVisit.encounterDate)} · ${lastVisit.hospital || ''}` : '—'}</div>
                <div style={{ fontSize: 12, marginTop: 2, color: '#7a828c' }}>{nextFu ? `下次复查 ${fmtDate(nextFu.dueDate)}` : '暂无待复查'}</div>
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#2b2f36' }}>可用保险（{insurances.length}）</div>
          <span onClick={() => nav('/insurance')} style={{ fontSize: 13, color: '#3d6b94', cursor: 'pointer' }}>查看</span>
        </div>
        <div onClick={() => nav('/insurance')} style={{ background: '#fff', borderRadius: 16, padding: 14, border: '0.5px solid #e5e7ec', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: 'rgba(91,141,184,0.12)', color: '#5b8db8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckShieldOutline style={{ fontSize: 18 }} />
          </div>
          <div style={{ flex: 1, fontSize: 13, color: '#4a5568' }}>
            {insurances.length === 0 ? '暂无保险记录，点击添加' : insurances.map((i: any) => i.kind === 'MEDICAL' ? '医保' : i.insurer).join(' · ')}
          </div>
        </div>
      </div>

      {showNewPatient && (
        <div onClick={closeNewPatient} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>添加家庭成员</div>
            <Field label="姓名 *"><input style={inputStyle} value={np.name || ''} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="如：妈妈" /></Field>
            <Field label="性别">
              <select style={inputStyle} value={np.gender || ''} onChange={(e) => setNp({ ...np, gender: e.target.value })}>
                <option value="">请选择</option><option value="MALE">男</option><option value="FEMALE">女</option>
              </select>
            </Field>
            <Field label="出生日期"><div style={inputStyle as any} onClick={() => setNpBirthPicker(true)}>{np.birthDate ? np.birthDate : '选择日期'}</div></Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}><Field label="身高 (cm)"><input style={inputStyle} inputMode="decimal" value={np.heightCm ?? ''} onChange={(e) => setNp({ ...np, heightCm: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="如：172" /></Field></div>
              <div style={{ flex: 1 }}><Field label="体重 (kg)"><input style={inputStyle} inputMode="decimal" value={np.weightKg ?? ''} onChange={(e) => setNp({ ...np, weightKg: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="如：70" /></Field></div>
            </div>
            <Field label="血型"><input style={inputStyle} value={np.bloodType || ''} onChange={(e) => setNp({ ...np, bloodType: e.target.value })} placeholder="如：A+" /></Field>
            <Field label="过敏史"><input style={inputStyle} value={np.allergies || ''} onChange={(e) => setNp({ ...np, allergies: e.target.value })} placeholder="如：青霉素" /></Field>
            <Field label="慢性病标签"><div style={{ fontSize: 12, color: '#7a828c', padding: '8px 0' }}>标签将根据已录入的疾病自动生成</div></Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={closeNewPatient} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={submitNewPatient} disabled={savingPatient} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: savingPatient ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{savingPatient ? '保存中…' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {showMedEdit && (
        <div onClick={() => setShowMedEdit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>当前用药</div>
            <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 14 }}>新增/编辑疾病时自动同步，此处可手动修改</div>
            {medRows.map((r: any, i: number) => (
              <div key={i} style={{ border: r.removed ? '0.5px solid #e8b9b9' : '0.5px solid #e5e7ec', borderRadius: 10, padding: 12, marginBottom: 10, opacity: r.removed ? 0.6 : 1 }}>
                {r.manual ? (
                  <>
                    <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 6 }}>
                      手动用药 {r.removed ? '（保存后删除）' : ''}
                    </div>
                    <textarea style={{ ...inputStyle, minHeight: 40 }} value={r.text} onChange={(e) => setMedRows(medRows.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} placeholder="药名 剂量 频次，如：维生素D 400IU 每日一次" />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: '#3d6b94', marginBottom: 6 }}>
                      来自就诊{r.diseaseName ? '·' + r.diseaseName : ''} {r.removed ? '（保存后解除绑定，就诊记录不受影响）' : ''}
                    </div>
                    <div style={{ fontSize: 13, color: '#2b2f36', whiteSpace: 'pre-line' }}>{r.text || '暂无内容'}</div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#7a828c' }}>有效期：</span>
                  <span onClick={() => setMedRows(medRows.map((x, j) => j === i ? { ...x, rangeType: '长期' } : x))} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, cursor: 'pointer', background: r.rangeType === '长期' ? '#5b8db8' : '#eef1f5', color: r.rangeType === '长期' ? '#fff' : '#4a5568' }}>长期</span>
                  <span onClick={() => setMedRows(medRows.map((x, j) => j === i ? { ...x, rangeType: '期间' } : x))} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, cursor: 'pointer', background: r.rangeType === '期间' ? '#5b8db8' : '#eef1f5', color: r.rangeType === '期间' ? '#fff' : '#4a5568' }}>时间段</span>
                  {r.rangeType === '期间' && (
                    <span style={{ fontSize: 12, color: '#4a5568' }}>
                      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setMedDatePicker({ row: i, field: 'start' })}>{r.start || '开始日期'}</span>
                      {' ~ '}
                      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setMedDatePicker({ row: i, field: 'end' })}>{r.end || '结束日期'}</span>
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <button onClick={() => setMedRows(medRows.map((x, j) => j === i ? { ...x, removed: !x.removed } : x))} style={{ fontSize: 12, color: '#d97b7b', border: 'none', background: 'none', padding: '4px 8px' }}>{r.removed ? '撤销' : (r.manual ? '删除' : '解除绑定')}</button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setMedRows([...medRows, { id: '', diseaseId: null, sourceEncounterId: null, manual: true, text: '', rangeType: '长期', start: '', end: '', removed: false }])}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px dashed #b7c4d0', background: '#f6f7f9', fontSize: 14, color: '#3d6b94' }}
            >+ 添加手动用药（不与就诊记录关联）</button>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowMedEdit(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={saveMedEdit} disabled={savingMed} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: savingMed ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{savingMed ? '保存中…' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {showNewCondition && (
        <div onClick={closeNewCondition} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, margin: '0 auto', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>添加疾病</div>
            <div style={{ background: '#f6f7f9', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <button
                onClick={() => ocrInputRef.current?.click()}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#5b8db8', color: '#fff', fontSize: 14 }}
              >{ocrBusy ? '识别中…' : '📷 拍照/选图识别病历'}</button>
              <input ref={ocrInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOcr} />
              {ocrMatched && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#5a8069', background: 'rgba(123,168,140,0.14)', padding: '6px 10px', borderRadius: 6 }}>
                  识别到「{ocrMatched.name}」，已自动选中并填入称呼（可修改）
                </div>
              )}
              {ocrText && !ocrMatched && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#7a828c', background: '#fff', padding: '6px 10px', borderRadius: 6, border: '0.5px solid #e5e7ec', maxHeight: 80, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {ocrText.slice(0, 300)}
                </div>
              )}
            </div>
            <Field label="疾病 *">
              <select
                style={inputStyle}
                value={nc.name === CUSTOM_DISEASE ? CUSTOM_DISEASE : (nc.name || '')}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === CUSTOM_DISEASE) {
                    setNc({ ...nc, name: CUSTOM_DISEASE, customName: '', aliases: '' });
                  } else {
                    const preset = DISEASE_PRESETS.find((d) => d.name === v);
                    setNc({ ...nc, name: v, aliases: preset ? preset.aliases : '' });
                  }
                }}
              >
                <option value="">请选择疾病</option>
                {DISEASE_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {DISEASE_PRESETS.filter((d) => d.category === cat).map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </optgroup>
                ))}
                <option value={CUSTOM_DISEASE}>其他（自定义）</option>
              </select>
            </Field>
            {nc.name === CUSTOM_DISEASE && (
              <Field label="疾病名称 *"><input style={inputStyle} value={nc.customName || ''} onChange={(e) => setNc({ ...nc, customName: e.target.value })} placeholder="输入疾病名称" /></Field>
            )}
            <Field label="其他称呼"><input style={inputStyle} value={nc.aliases || ''} onChange={(e) => setNc({ ...nc, aliases: e.target.value })} placeholder="选中疾病自动带出，可修改；逗号分隔" /></Field>
            <Field label="就诊日期"><div style={inputStyle as any} onClick={() => setVisitPicker(true)}>{nc.visitDate ? nc.visitDate : '选择日期'}</div></Field>
            <Field label="医院"><input style={inputStyle} value={nc.hospital || ''} onChange={(e) => setNc({ ...nc, hospital: e.target.value })} placeholder="如：北京大学第三医院（OCR 自动填入）" /></Field>
            <Field label="医生"><input style={inputStyle} value={nc.doctor || ''} onChange={(e) => setNc({ ...nc, doctor: e.target.value })} placeholder="主治医生（手写签名需手动填）" /></Field>
            <Field label="状态">
              <select style={inputStyle} value={nc.status || 'FOLLOWING'} onChange={(e) => setNc({ ...nc, status: e.target.value })}>
                <option value="FOLLOWING">随访中</option><option value="TREATING">治疗中</option>
                <option value="CHRONIC">慢性</option><option value="CURED">已治愈</option>
              </select>
            </Field>
            <Field label="发现日期"><div style={inputStyle as any} onClick={() => setDiscoverPicker(true)}>{nc.discoveredDate ? nc.discoveredDate : '选择日期'}</div></Field>
            <Field label="备注"><textarea style={{ ...inputStyle, minHeight: 60 }} value={nc.notes || ''} onChange={(e) => setNc({ ...nc, notes: e.target.value })} /></Field>
            <Field label="医嘱"><textarea style={{ ...inputStyle, minHeight: 52 }} value={nc.advice || ''} onChange={(e) => setNc({ ...nc, advice: e.target.value })} placeholder="医生交代的注意事项（OCR 识别自动填入）" /></Field>
            <Field label="检查建议"><textarea style={{ ...inputStyle, minHeight: 52 }} value={nc.examSuggest || ''} onChange={(e) => setNc({ ...nc, examSuggest: e.target.value })} placeholder="建议做的检查（OCR 识别自动填入）" /></Field>
            <Field label="检查结果"><textarea style={{ ...inputStyle, minHeight: 52 }} value={nc.examResult || ''} onChange={(e) => setNc({ ...nc, examResult: e.target.value })} placeholder="本次检查结果（OCR 识别自动填入）" /></Field>
            <Field label="用药建议"><textarea style={{ ...inputStyle, minHeight: 52 }} value={nc.medication || ''} onChange={(e) => setNc({ ...nc, medication: e.target.value })} placeholder="用药方案（OCR 识别自动填入）" /></Field>

            <div style={{ background: '#f6f7f9', borderRadius: 8, padding: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2b2f36' }}>安排首次复查</span>
                <input type="checkbox" checked={fuOn} onChange={(e) => setFuOn(e.target.checked)} style={{ width: 18, height: 18 }} />
              </div>
              {fuOn && (
                <>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>复查项目</div>
                    <input style={inputStyle} value={fuItems} onChange={(e) => setFuItems(e.target.value)} placeholder="如：复查血压" />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>提醒日期（自定义）</div>
                    <div style={inputStyle as any} onClick={() => setFuPicker(true)}>{fuDate ? (fmtDateFull(fuDate) || '选择日期') : '选择日期'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: 13, color: '#2b2f36' }}>周期复查（每 N 个月提醒）</span>
                    <input type="checkbox" checked={fuRecurring} onChange={(e) => setFuRecurring(e.target.checked)} style={{ width: 18, height: 18 }} />
                  </div>
                  {fuRecurring && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>间隔（月）</div>
                      <select style={inputStyle} value={fuInterval} onChange={(e) => setFuInterval(Number(e.target.value))}>
                        {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n} 个月</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={closeNewCondition} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <div style={{ background: '#f6f7f9', borderRadius: 8, padding: 12, marginTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2b2f36', marginBottom: 8 }}>确诊图片（保存后自动上传，如诊断证明/影像单）</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {['影像', '抽血结果', 'B超结果', '其他'].map((c) => (
                    <span key={c} onClick={() => { setCondCat(c); condAttInputRef.current?.click(); }} style={{
                      fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                      background: condCat === c ? '#5b8db8' : '#fff',
                      color: condCat === c ? '#fff' : '#4a5568',
                      border: '0.5px solid #e5e7ec',
                    }}>{condCat === c ? `正在传：${c}` : c}</span>
                  ))}
                </div>
                <input ref={condAttInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  if (!files.length) return;
                  setCondPending((prev) => [...prev, ...files.map((f) => ({ cat: condCat, file: f as File, preview: URL.createObjectURL(f as File), uid: ++condPendingUid.current }))]);
                }} />
                {condPending.length === 0 && <div style={{ fontSize: 12, color: '#aab2bd', textAlign: 'center', padding: '10px 0' }}>暂未选择图片</div>}
                {['影像', '抽血结果', 'B超结果', '其他'].map((cat) => {
                  const items = condPending.filter((p) => p.cat === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 4 }}>{cat}（{items.length}）</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {items.map((p) => (
                          <div key={p.uid} style={{ position: 'relative' }}>
                            <img src={p.preview} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '0.5px solid #e5e7ec' }} />
                            <span onClick={() => setCondPending((prev) => prev.filter((x) => x.uid !== p.uid))} style={{
                              position: 'absolute', top: -6, right: -6, background: '#d97b7b', color: '#fff',
                              width: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, cursor: 'pointer',
                            }}>×</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={submitNewCondition} disabled={savingCondition} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: savingCondition ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{savingCondition ? '保存中…' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', background: '#fff', borderTop: '0.5px solid #e5e7ec', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <TabBar activeKey={tab} style={{ height: 56 }} onChange={(k) => { setTab(k); if (k === 'alarm') nav('/followups'); else if (k === 'home') nav('/'); else if (k === 'ins') nav('/insurance'); else if (k === 'me') nav('/me'); }}>
            <TabBar.Item key="home" title="首页" icon={<AppOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="alarm" title="提醒" icon={<BellWithBadge count={badgeQ.data?.count || 0} />} />
            <TabBar.Item key="ins" title="保险" icon={<CheckShieldOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="me" title="我的" icon={<UserOutline style={{ fontSize: 22 }} />} />
          </TabBar>
        </div>
      </div>

      {/* 统一时间组件：antd-mobile DatePicker 弹层 */}
      {npBirthPicker && (
        <DatePicker visible={npBirthPicker} value={np.birthDate ? new Date(np.birthDate) : new Date()} precision="day" min={new Date(1900, 0, 1)} max={new Date()} onClose={() => setNpBirthPicker(false)} onConfirm={(d) => { setNp({ ...np, birthDate: d.toISOString().slice(0, 10) }); setNpBirthPicker(false); }} />
      )}
      {visitPicker && (
        <DatePicker visible={visitPicker} value={nc.visitDate ? new Date(nc.visitDate) : new Date()} precision="day" min={new Date(1900, 0, 1)} onClose={() => setVisitPicker(false)} onConfirm={(d) => { setNc({ ...nc, visitDate: d.toISOString().slice(0, 10) }); setVisitPicker(false); }} />
      )}
      {discoverPicker && (
        <DatePicker visible={discoverPicker} value={nc.discoveredDate ? new Date(nc.discoveredDate) : new Date()} precision="day" min={new Date(1900, 0, 1)} onClose={() => setDiscoverPicker(false)} onConfirm={(d) => { setNc({ ...nc, discoveredDate: d.toISOString().slice(0, 10) }); setDiscoverPicker(false); }} />
      )}
      {fuPicker && (
        <DatePicker visible={fuPicker} value={fuDate || new Date()} precision="day" min={new Date(1900, 0, 1)} onClose={() => setFuPicker(false)} onConfirm={(d) => { setFuDate(d); setFuPicker(false); }} />
      )}
      {medDatePicker && (
        <DatePicker
          visible={!!medDatePicker}
          value={(() => { const v = medDatePicker.field === 'start' ? medRows[medDatePicker.row]?.start : medRows[medDatePicker.row]?.end; return v ? new Date(v) : new Date(); })()}
          precision="day"
          min={new Date(1900, 0, 1)}
          onClose={() => setMedDatePicker(null)}
          onConfirm={(d) => {
            const val = d.toISOString().slice(0, 10);
            setMedRows(medRows.map((x, j) => j === medDatePicker.row ? { ...x, [medDatePicker.field]: val } : x));
            setMedDatePicker(null);
          }}
        />
      )}
    </div>
  );
}
