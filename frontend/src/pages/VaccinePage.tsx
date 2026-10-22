import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TabBar, DatePicker } from 'antd-mobile';
import { AppOutline, BellOutline, CheckShieldOutline, UserOutline } from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { usePatientStore } from '../store/patient';
import { fmtDate } from '../utils/date';
import { SyringeIcon } from '../components/SyringeIcon';

export default function VaccinePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('vac');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [pickerTarget, setPickerTarget] = useState<'vaccinatedAt' | 'nextDueDate' | null>(null);
  const [busy, setBusy] = useState(false);

  const patientsQ = useQuery({ queryKey: ['patients'], queryFn: api.patients });
  const patients = patientsQ.data || [];
  const { currentPatientId, setCurrentPatientId } = usePatientStore();
  const activeId = patients.some((p: any) => p.id === currentPatientId) ? currentPatientId : (patients[0]?.id ?? null);
  useEffect(() => { if (activeId && activeId !== currentPatientId) setCurrentPatientId(activeId); }, [activeId, currentPatientId]);

  const listQ = useQuery({
    queryKey: ['vaccines', activeId],
    queryFn: () => api.vaccines(activeId!),
    enabled: !!activeId,
  });
  const list = listQ.data || [];

  const refresh = () => { qc.invalidateQueries({ queryKey: ['vaccines', activeId] }); };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', doses: '1', doseIndex: '1', vaccinatedAt: null, nextDueDate: null, clinic: '', note: '' });
    setShowForm(true);
  };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      name: v.name || '',
      doses: String(v.doses ?? 1),
      doseIndex: String(v.doseIndex ?? 1),
      vaccinatedAt: v.vaccinatedAt ? new Date(v.vaccinatedAt) : null,
      nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
      clinic: v.clinic || '',
      note: v.note || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert('请填写疫苗名称'); return; }
    const dto: any = {
      name: form.name.trim(),
      doses: Math.max(1, Number(form.doses) || 1),
      doseIndex: Math.max(1, Number(form.doseIndex) || 1),
      vaccinatedAt: form.vaccinatedAt ? form.vaccinatedAt.toISOString() : null,
      nextDueDate: form.nextDueDate ? form.nextDueDate.toISOString() : null,
      clinic: form.clinic.trim() || undefined,
      note: form.note.trim() || undefined,
    };
    setBusy(true);
    try {
      if (editing) await api.updateVaccine(editing.id, dto);
      else await api.createVaccine(activeId!, dto);
      setShowForm(false);
      refresh();
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    } finally { setBusy(false); }
  };

  const remove = async (v: any) => {
    if (!confirm(`确定删除「${v.name}」的接种记录？`)) return;
    try { await api.deleteVaccine(v.id); refresh(); } catch (e: any) { alert(e?.response?.data?.message || '删除失败'); }
  };

  const completeNext = async (v: any) => {
    if (!confirm(`确认已于 ${fmtDate(v.nextDueDate)} 接种第 ${Math.min((v.doseIndex ?? 1) + 1, v.doses ?? 1)} 剂？`)) return;
    try { await api.completeNextVaccine(v.id); refresh(); } catch (e: any) { alert(e?.response?.data?.message || '操作失败'); }
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const statusOf = (v: any) => {
    if (!v.nextDueDate) {
      return (v.doseIndex ?? 1) >= (v.doses ?? 1)
        ? { text: '已按计划打完', color: '#4e9a6f' }
        : { text: '待安排下一针', color: '#7a828c' };
    }
    const due = new Date(v.nextDueDate);
    const diff = Math.round((due.getTime() - todayStart.getTime()) / 86400000);
    if (due < todayStart) return { text: `已逾期 ${-diff} 天`, color: '#c26b5a' };
    if (diff === 0) return { text: '今天接种', color: '#d9a648' };
    return { text: `还有 ${diff} 天`, color: '#d9a648' };
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7', paddingBottom: 80 }}>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          疫苗本 · {patients.find((p: any) => p.id === activeId)?.name || ''}
        </div>
        <div onClick={openNew} style={{ fontSize: 13, color: '#fff', background: '#5b8db8', padding: '7px 14px', borderRadius: 999 }}>
          ＋ 添加疫苗
        </div>
      </div>
      <div style={{ padding: '0 16px' }}>
        {list.length === 0 && (
          <div style={{ background: '#fff', padding: 28, borderRadius: 12, textAlign: 'center', color: '#7a828c', fontSize: 13, border: '0.5px solid #e5e7ec' }}>
            还没有疫苗记录，点击右上角"添加疫苗"录入（如乙肝疫苗、百白破、HPV 等）
          </div>
        )}
        {list.map((v: any) => {
          const st = statusOf(v);
          const pct = Math.min(100, Math.round(((v.doseIndex ?? 1) / Math.max(1, v.doses ?? 1)) * 100));
          return (
            <div key={v.id} style={{ background: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, border: '0.5px solid #e5e7ec' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: '#e8f0f7', color: '#5b8db8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <SyringeIcon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#2b2f36' }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>
                    第 {v.doseIndex ?? 1} / {v.doses ?? 1} 剂{((v.doses ?? 1) > 1) ? '' : ''}
                    {v.brand ? ` · ${v.brand}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: st.color, flexShrink: 0, fontWeight: 500 }}>{st.text}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#eef1f5', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: '#5b8db8' }} />
                </div>
                <span style={{ fontSize: 11, color: '#7a828c' }}>{pct}%</span>
              </div>

              <div style={{ fontSize: 12, color: '#7a828c', marginTop: 10, lineHeight: 1.7 }}>
                {v.vaccinatedAt && <div>最近接种：{fmtDate(v.vaccinatedAt)}</div>}
                {v.nextDueDate && <div>下一针：{fmtDate(v.nextDueDate)}</div>}
                {v.clinic && <div>接种机构：{v.clinic}</div>}
                {v.note && <div>备注：{v.note}</div>}
                {!v.vaccinatedAt && !v.nextDueDate && <div style={{ color: '#aeb6c0' }}>尚未填写接种日期</div>}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {v.nextDueDate && (
                  <button onClick={() => completeNext(v)} style={{ padding: '6px 14px', borderRadius: 999, border: 'none', background: '#5b8db8', color: '#fff', fontSize: 12 }}>
                    已接种下一针
                  </button>
                )}
                <button onClick={() => openEdit(v)} style={{ padding: '6px 14px', borderRadius: 999, border: '0.5px solid #e5e7ec', background: '#fff', color: '#4a5568', fontSize: 12 }}>
                  编辑
                </button>
                <button onClick={() => remove(v)} style={{ padding: '6px 14px', borderRadius: 999, border: '0.5px solid #e5e7ec', background: '#fff', color: '#d97b7b', fontSize: 12 }}>
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== 新增 / 编辑表单 ===== */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 18, width: '100%', maxWidth: 400, maxHeight: '86vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{editing ? '编辑疫苗' : '添加疫苗'}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>疫苗名称 *</div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：乙肝疫苗（第2剂）"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>已接种剂次</div>
                <input type="number" min={1} value={form.doseIndex} onChange={(e) => setForm({ ...form, doseIndex: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>总剂次</div>
                <input type="number" min={1} value={form.doses} onChange={(e) => setForm({ ...form, doses: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>最近接种日期</div>
              <div onClick={() => setPickerTarget('vaccinatedAt')} style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, background: '#fff' }}>
                {form.vaccinatedAt ? fmtDate(form.vaccinatedAt) : '选择日期（可空）'}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>下一针时间（多剂次填写）</div>
              <div onClick={() => setPickerTarget('nextDueDate')} style={{ padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, background: '#fff' }}>
                {form.nextDueDate ? fmtDate(form.nextDueDate) : '选择日期（可空）'}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>品牌 / 厂家（可空）</div>
              <input value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="如：科兴、默沙东"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>接种机构（可空）</div>
              <input value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} placeholder="如：社区卫生服务中心"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>备注（可空）</div>
              <textarea value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="接种反应、医生建议等"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e5e7ec', background: '#fff', fontSize: 14 }}>取消</button>
              <button onClick={save} disabled={busy} style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: busy ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 14 }}>{busy ? '保存中…' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      <DatePicker
        visible={!!pickerTarget}
        min={new Date(1900, 0, 1)}
        precision="day"
        onClose={() => setPickerTarget(null)}
        onConfirm={(d) => {
          if (pickerTarget) setForm({ ...form, [pickerTarget]: d });
          setPickerTarget(null);
        }}
      />

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', background: '#fff', borderTop: '0.5px solid #e5e7ec' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <TabBar activeKey={tab} onChange={(k) => { setTab(k); if (k === 'home') nav('/'); else if (k === 'alarm') nav('/followups'); else if (k === 'vac') nav('/vaccines'); else if (k === 'ins') nav('/insurance'); else if (k === 'me') nav('/me'); }}>
            <TabBar.Item key="home" title="首页" icon={<AppOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="alarm" title="提醒" icon={<BellOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="vac" title="疫苗" icon={<SyringeIcon />} />
            <TabBar.Item key="ins" title="保险" icon={<CheckShieldOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="me" title="我的" icon={<UserOutline style={{ fontSize: 22 }} />} />
          </TabBar>
        </div>
      </div>
    </div>
  );
}
