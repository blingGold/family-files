import { NavBar, Toast, Dialog } from 'antd-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e7ec',
  background: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: '#7a828c', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const q = useQuery({
    queryKey: ['patient', Number(id)],
    queryFn: () => api.patient(Number(id)),
    enabled: !!id,
  });
  const patient = q.data;

  useEffect(() => {
    if (patient && !form) {
      setForm({
        name: patient.name || '',
        gender: patient.gender || '',
        birthDate: patient.birthDate || '',
        heightCm: patient.heightCm ?? '',
        weightKg: patient.weightKg ?? '',
        bloodType: patient.bloodType || '',
        allergies: patient.allergies || '',
        familyHistory: patient.familyHistory || '',
        notes: patient.notes || '',
      });
    }
  }, [patient]);

  if (q.isLoading || !form) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>;
  if (q.isError || !patient) return <div style={{ padding: 40, textAlign: 'center' }}>人员不存在</div>;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.updatePatient(patient.id, {
        ...form,
        heightCm: form.heightCm === '' ? undefined : Number(form.heightCm),
        weightKg: form.weightKg === '' ? undefined : Number(form.weightKg),
      });
      Toast.show('已保存');
      qc.invalidateQueries({ queryKey: ['patient', patient.id] });
      qc.invalidateQueries({ queryKey: ['patients'] });
    } catch (e: any) {
      alert(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除人员：两次确认（第一次普通确认，第二次最后确认）
  const removePatient = () => {
    Dialog.confirm({
      title: '删除人员',
      content: `确定要删除「${patient.name}」吗？\n\n删除后该成员及其疾病、就诊、复查记录将全部隐藏（数据保留，可恢复）。`,
      confirmText: '继续',
      cancelText: '取消',
      onConfirm: () => {
        Dialog.confirm({
          title: '最后确认',
          content: `再次确认：真的要删除「${patient.name}」吗？\n\n删除后该成员的全部健康档案将从界面隐藏，请谨慎操作。`,
          confirmText: '确认删除',
          cancelText: '再想想',
          onConfirm: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              await api.deletePatient(patient.id);
              Toast.show('已删除');
              qc.invalidateQueries({ queryKey: ['patients'] });
              qc.invalidateQueries({ queryKey: ['patient'] });
              qc.invalidateQueries({ queryKey: ['badge'] });
              qc.invalidateQueries();
              nav('/');
            } catch (e: any) {
              alert(e?.response?.data?.message || '删除失败');
            } finally {
              setDeleting(false);
            }
          },
        });
      },
    });
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7' }}>
      <NavBar onBack={() => nav(-1)}>人员资料</NavBar>
      <div style={{ padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, border: '0.5px solid #e5e7ec' }}>
          <Field label="姓名 *">
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：爸爸" />
          </Field>
          <Field label="性别">
            <select style={inputStyle} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">请选择</option>
              <option value="MALE">男</option>
              <option value="FEMALE">女</option>
              <option value="OTHER">其他</option>
            </select>
          </Field>
          <Field label="出生日期">
            <input style={inputStyle} type="date" value={form.birthDate || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field label="身高 (cm)">
                <input style={inputStyle} inputMode="decimal" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} placeholder="如：172" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="体重 (kg)">
                <input style={inputStyle} inputMode="decimal" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} placeholder="如：70" />
              </Field>
            </div>
          </div>
          <Field label="血型">
            <input style={inputStyle} value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} placeholder="如：A+" />
          </Field>
          <Field label="过敏史">
            <input style={inputStyle} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="如：青霉素" />
          </Field>
          <Field label="家族病史">
            <input style={inputStyle} value={form.familyHistory} onChange={(e) => setForm({ ...form, familyHistory: e.target.value })} placeholder="如：父亲有高血压" />
          </Field>
          <Field label="备注">
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="其他说明" />
          </Field>
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: saving ? '#9dbcd4' : '#5b8db8', color: '#fff', fontSize: 15 }}>{saving ? '保存中…' : '保存修改'}</button>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '0.5px solid #e5e7ec' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2b2f36', marginBottom: 4 }}>危险操作</div>
          <div style={{ fontSize: 12, color: '#7a828c', marginBottom: 12 }}>删除后该成员及其疾病、就诊、复查记录全部隐藏（数据保留，可恢复）</div>
          <button onClick={removePatient} disabled={deleting} style={{ width: '100%', padding: 13, borderRadius: 10, border: '0.5px solid #e8b9b9', background: '#fdf3f3', color: '#c26b5a', fontSize: 15 }}>{deleting ? '删除中…' : '删除人员'}</button>
        </div>
      </div>
    </div>
  );
}
