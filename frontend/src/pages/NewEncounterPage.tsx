import { NavBar, DatePicker, Checkbox } from 'antd-mobile';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e5e7ec', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff',
};

export default function NewEncounterPage() {
  const { conditionId, encounterId } = useParams();
  const nav = useNavigate();
  const isEdit = !!encounterId;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [date, setDate] = useState<Date>(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [form, setForm] = useState<any>({});

  // OCR
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // 复查安排（仅新建时展示）
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [fuDate, setFuDate] = useState<Date>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d;
  });
  const [fuPickerVisible, setFuPickerVisible] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [intervalMonths, setIntervalMonths] = useState(3);

  const [encounterNotes, setEncounterNotes] = useState('');

  // 编辑模式：加载已有就诊记录预填
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const e = await api.encounter(Number(encounterId));
        setDate(new Date(e.encounterDate));
        setEncounterNotes(e.notes || '');
        setForm({
          hospital: e.hospital || '',
          department: e.department || '',
          doctor: e.doctor || '',
          diagnosis: e.diagnosis || '',
          advice: e.advice || '',
          notes: e.notes || '',
          chiefComplaint: e.chiefComplaint || '',
          examResult: (e.exams || []).map((x: any) => `${x.name}${x.conclusion ? '：' + x.conclusion : ''}${x.resultValue ? '，' + x.resultValue : ''}`).join('\n'),
          medication: (e.medications || []).map((m: any) => `${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`).join('\n'),
        });
      } catch (e: any) {
        alert(e?.response?.data?.message || '加载失败');
        nav(-1);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, encounterId]);

  const handleOcr = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setOcrBusy(true); setOcrText('');
    try {
      const r = await api.ocr(file);
      setOcrText(r.text);
      const p = r.parsed;
      if (p) {
        setForm((prev: any) => ({
          ...prev,
          hospital: p.hospital || prev.hospital,
          doctor: p.doctor || prev.doctor,
          diagnosis: p.disease || prev.diagnosis,
          advice: p.advice || prev.advice,
          examResult: p.examResult ? (prev.examResult ? prev.examResult + '\n' + p.examResult : p.examResult) : prev.examResult,
          medication: p.medication ? (prev.medication ? prev.medication + '\n' + p.medication : p.medication) : prev.medication,
        }));
        if (p.visitDate) {
          const d = new Date(p.visitDate);
          if (!isNaN(d.getTime())) setDate(d);
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || '识别失败，请重试');
    } finally {
      setOcrBusy(false);
      ev.target.value = '';
    }
  };

  const onSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const exams = form.examResult ? form.examResult.split('\n').filter((x: string) => x.trim()).map((x: string) => ({ name: '辅助检查', conclusion: x.trim() })) : [];
      const medications = form.medication ? form.medication.split('\n').filter((x: string) => x.trim()).map((x: string) => ({ name: '用药', dosage: x.trim() })) : [];
      const base: any = {
        encounterDate: date.toISOString(),
        hospital: form.hospital,
        department: form.department,
        doctor: form.doctor,
        diagnosis: form.diagnosis,
        advice: form.advice,
        notes: form.notes,
        chiefComplaint: form.chiefComplaint,
      };
      if (isEdit) {
        const payload: any = { ...base };
        if (exams.length) payload.exams = exams;
        if (medications.length) payload.medications = medications;
        await api.updateEncounter(Number(encounterId), payload);
      } else {
        const payload: any = { ...base };
        if (exams.length) payload.exams = exams;
        if (medications.length) payload.medications = medications;
        if (hasFollowUp) {
          payload.hasFollowUp = true;
          payload.followUpItems = form.followUpItems || '复查';
          payload.followUpDueDate = fuDate.toISOString();
          payload.followUpRecurring = recurring;
          payload.followUpIntervalMonths = recurring ? intervalMonths : undefined;
        }
        await api.createEncounter(Number(conditionId), payload);
      }
      nav(-1);
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#7a828c' }}>加载中…</div>;

  // 复查完成自动生成的记录 → 顶部提示补全
  const autoFromFollowup = encounterNotes.startsWith('复查完成');

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#f4f5f7', minHeight: '100vh', paddingBottom: 24 }}>
      <NavBar onBack={() => nav(-1)}>{isEdit ? '编辑就诊' : '新建就诊'}</NavBar>
      {autoFromFollowup && (
        <div style={{ margin: '0 16px 12px', background: 'rgba(91,141,184,0.1)', border: '0.5px solid rgba(91,141,184,0.3)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3d6b94' }}>该记录由「复查完成」自动生成</div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 3, lineHeight: 1.5 }}>
            请上传就诊单图片自动识别（如上按钮），或手动补充医院、医生、医嘱、检查结果、用药等信息，让记录更完整。
          </div>
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ background: '#f6f7f9', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <button
            onClick={() => ocrInputRef.current?.click()}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#5b8db8', color: '#fff', fontSize: 14 }}
          >{ocrBusy ? '识别中…' : '📷 拍照/选图识别就诊单'}</button>
          <input ref={ocrInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOcr} />
          {ocrText && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#7a828c', background: '#fff', padding: '6px 10px', borderRadius: 6, border: '0.5px solid #e5e7ec', maxHeight: 80, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {ocrText.slice(0, 300)}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>就诊日期</div>
          <div style={inputStyle as any} onClick={() => setPickerVisible(true)}>{date.toLocaleDateString('zh-CN')}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>医院</div>
          <input style={inputStyle} value={form.hospital || ''} onChange={(e) => setForm({ ...form, hospital: e.target.value })} placeholder="如：协和医院" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>科室</div>
          <input style={inputStyle} value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="如：心内科" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>医生</div>
          <input style={inputStyle} value={form.doctor || ''} onChange={(e) => setForm({ ...form, doctor: e.target.value })} placeholder="主治医生" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>诊断结论</div>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>医嘱</div>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.advice || ''} onChange={(e) => setForm({ ...form, advice: e.target.value })} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>检查结果（每行一条，保存为检查记录）</div>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.examResult || ''} onChange={(e) => setForm({ ...form, examResult: e.target.value })} placeholder="如：MRI显示左侧基底节梗死（OCR 自动填入）" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>用药建议（每行一条，保存为用药记录）</div>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.medication || ''} onChange={(e) => setForm({ ...form, medication: e.target.value })} placeholder="如：硝苯地平缓释片 30mg 每日一次（OCR 自动填入）" />
        </div>

        {!isEdit && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '0.5px solid #e5e7ec', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasFollowUp ? 12 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>安排复查提醒</span>
              <Checkbox checked={hasFollowUp} onChange={(c) => setHasFollowUp(c)} />
            </div>
            {hasFollowUp && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>复查项目</div>
                  <input style={inputStyle} value={form.followUpItems || ''} onChange={(e) => setForm({ ...form, followUpItems: e.target.value })} placeholder="如：复查血压、空腹血糖" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>下次提醒日期（自定义）</div>
                  <div style={inputStyle as any} onClick={() => setFuPickerVisible(true)}>{fuDate.toLocaleDateString('zh-CN')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#2b2f36' }}>周期复查（每 N 个月提醒一次）</span>
                  <Checkbox checked={recurring} onChange={(c) => setRecurring(c)} />
                </div>
                {recurring && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>间隔（月）</div>
                    <select style={inputStyle} value={intervalMonths} onChange={(e) => setIntervalMonths(Number(e.target.value))}>
                      {[1, 2, 3, 6, 12].map((n) => <option key={n} value={n}>{n} 个月</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button onClick={onSubmit} disabled={saving} style={{
          width: '100%', padding: '14px', borderRadius: 8, border: 'none',
          background: '#5b8db8', color: '#fff', fontSize: 15, fontWeight: 500,
        }}>{saving ? '保存中…' : '保存就诊记录'}</button>
      </div>
      <DatePicker visible={pickerVisible} value={date} onClose={() => setPickerVisible(false)} onConfirm={(d) => { setDate(d); setPickerVisible(false); }} />
      <DatePicker visible={fuPickerVisible} value={fuDate} onClose={() => setFuPickerVisible(false)} onConfirm={(d) => { setFuDate(d); setFuPickerVisible(false); }} />
    </div>
  );
}
