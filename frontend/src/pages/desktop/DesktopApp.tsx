import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { usePatientStore } from '../../store/patient';
import { useAuthStore } from '../../store/auth';
import { C, calcAge, patientOverdueCount, mobileOnly } from './ui';
import OverviewView from './views/OverviewView';
import RecordView from './views/RecordView';
import MedsView from './views/MedsView';
import FollowupsView from './views/FollowupsView';
import InsuranceView from './views/InsuranceView';
import VaccineView from './views/VaccineView';
import './desktop.css';

const TABS = [
  { key: 'overview', label: '总览' },
  { key: 'record', label: '病历' },
  { key: 'meds', label: '用药' },
  { key: 'followups', label: '复查' },
  { key: 'vaccines', label: '疫苗' },
  { key: 'insurance', label: '保险' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function DesktopApp() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [q, setQ] = useState('');
  const [recordTarget, setRecordTarget] = useState<{ condId: number; encId: number } | null>(null);
  const { currentPatientId, setCurrentPatientId } = usePatientStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const patientsQ = useQuery({ queryKey: ['patients'], queryFn: api.patients });
  const patients = patientsQ.data || [];

  const activeId = patients.some((p: any) => p.id === currentPatientId)
    ? currentPatientId
    : (patients[0]?.id ?? null);
  useEffect(() => {
    if (activeId && activeId !== currentPatientId) setCurrentPatientId(activeId);
  }, [activeId, currentPatientId, setCurrentPatientId]);

  const patient = patients.find((p: any) => p.id === activeId) || null;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter((p: any) => (p.name || '').toLowerCase().includes(s));
  }, [patients, q]);

  const version = import.meta.env.VITE_APP_VERSION || 'dev';

  const viewProps = {
    activeId,
    setTab: (k: TabKey) => setTab(k),
    onOpenRecord: (condId: number, encId: number) => {
      setRecordTarget({ condId, encId });
      setTab('record');
    },
    recordTarget,
  };

  return (
    <div className="d-shell">
      {/* ===== 左侧病人栏（全局常驻） ===== */}
      <aside className="d-side">
        <div className="d-brand">
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>家</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>家庭病历</div>
            <div style={{ fontSize: 11, color: C.ink3 }}>查看工作台 · v{version}</div>
          </div>
        </div>
        <div style={{ padding: '12px 14px 6px' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索病人姓名…"
            style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#f7f9fb', outline: 'none' }}
          />
          <div onClick={() => mobileOnly()}
            style={{ marginTop: 8, border: `1px dashed ${C.brand}`, color: C.brandDeep, background: 'transparent', borderRadius: 9, padding: 9, fontSize: 12, textAlign: 'center', cursor: 'pointer' }}>
            ＋ 添加病人（手机端）
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px 10px' }}>
          {filtered.length === 0 && (
            <div style={{ color: C.ink3, fontSize: 12, textAlign: 'center', padding: 16 }}>未找到匹配病人</div>
          )}
          {filtered.map((p: any) => {
            const active = p.id === activeId;
            const overdue = patientOverdueCount(p);
            return (
              <div key={p.id} className={'d-pat' + (active ? ' active' : '')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', marginBottom: 2 }} onClick={() => setCurrentPatientId(p.id)}>
                <div style={{ width: 36, height: 36, borderRadius: 18, flex: 'none', background: ['#5b8db8', '#7fa7c7', '#96b9d3'][p.id % 3], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>
                  {(p.name || '?').slice(-1)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || '未命名'}</div>
                  <div style={{ fontSize: 11, color: C.ink3 }}>{p.gender || '—'} · {calcAge(p.birthDate) ?? '?'} 岁 · {p.bloodType || '—'}</div>
                </div>
                {overdue > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: C.amberSoft, color: C.amber, padding: '2px 7px', borderRadius: 999, fontWeight: 600, flex: 'none' }}>{overdue} 逾期</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: `1px solid ${C.line2}`, padding: '10px 14px', fontSize: 12, color: C.ink2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>{user?.displayName || user?.username} · {user?.role === 'ADMIN' ? '管理员' : '成员'}</div>
          {user?.role === 'ADMIN' && (
            <div style={{ color: C.brandDeep, cursor: 'pointer' }} onClick={() => mobileOnly()}>用户管理（手机端）</div>
          )}
          <div style={{ cursor: 'pointer', color: C.ink3 }} onClick={() => { logout(); location.href = '/login'; }}>退出登录</div>
        </div>
      </aside>

      {/* ===== 主区 ===== */}
      <div className="d-main">
        <header className="d-top">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{patient?.name || '未选择病人'}</div>
            <div style={{ fontSize: 12, color: C.ink2 }}>
              {patient ? `${patient.gender || '—'} · ${calcAge(patient.birthDate) ?? '?'} 岁 · ${patient.bloodType || '血型—'} · 过敏：${patient.allergies || '无记录'}` : ''}
            </div>
          </div>
          {(patient?.chronicTags || '').split(',').filter(Boolean).map((t: string) => (
            <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: C.brandSoft, color: C.brandDeep, fontWeight: 600 }}>{t}</span>
          ))}
        </header>
        <nav className="d-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={'d-tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </nav>
        <main className="d-body">
          {activeId === null ? (
            <div style={{ background: '#fff', border: `1px dashed ${C.line}`, borderRadius: 12, padding: 40, textAlign: 'center', color: C.ink3, fontSize: 14 }}>
              暂无可见病人，请在手机端添加家庭成员
            </div>
          ) : (
            <>
              {tab === 'overview' && <OverviewView activeId={activeId} setTab={setTab} onOpenRecord={viewProps.onOpenRecord} />}
              {tab === 'record' && <RecordView activeId={activeId} recordTarget={recordTarget} />}
              {tab === 'meds' && <MedsView activeId={activeId} />}
              {tab === 'followups' && <FollowupsView activeId={activeId} />}
              {tab === 'vaccines' && <VaccineView activeId={activeId} />}
              {tab === 'insurance' && <InsuranceView activeId={activeId} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
