import { useQuery } from '@tanstack/react-query';
import { TabBar } from 'antd-mobile';
import { AppOutline, BellOutline, CheckShieldOutline, UserOutline } from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';

export default function InsurancePage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('ins');
  const patientsQ = useQuery({ queryKey: ['patients'], queryFn: api.patients });
  const patients = patientsQ.data || [];
  const insurancesQ = useQuery({
    queryKey: ['insurances', patients[0]?.id],
    queryFn: () => api.insurances(patients[0].id),
    enabled: patients.length > 0,
  });
  const list = insurancesQ.data || [];

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f5f7', paddingBottom: 80 }}>
      <div style={{ padding: '14px 16px 8px', fontSize: 18, fontWeight: 600 }}>保险保单</div>
      <div style={{ padding: '0 16px' }}>
        {list.length === 0 && <div style={{ background: '#fff', padding: 24, borderRadius: 12, textAlign: 'center', color: '#7a828c', fontSize: 13 }}>暂无保单</div>}
        {list.map((i: any) => (
          <div key={i.id} style={{ background: '#fff', padding: 14, borderRadius: 16, marginBottom: 10, border: '0.5px solid #e5e7ec' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{i.kind === 'MEDICAL' ? '医保' : i.insurer}</div>
            <div style={{ fontSize: 12, color: '#7a828c', marginTop: 4 }}>{i.policyNo ? `保单号 ${i.policyNo}` : ''}</div>
            {i.validFrom && <div style={{ fontSize: 12, color: '#7a828c', marginTop: 2 }}>有效期 {new Date(i.validFrom).toLocaleDateString()} ~ {i.validTo ? new Date(i.validTo).toLocaleDateString() : '长期'}</div>}
          </div>
        ))}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #e5e7ec' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <TabBar activeKey={tab} onChange={(k) => { setTab(k); if (k === 'home') nav('/'); else if (k === 'alarm') nav('/followups'); else if (k === 'me') nav('/me'); }}>
            <TabBar.Item key="home" title="首页" icon={<AppOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="alarm" title="提醒" icon={<BellOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="ins" title="保险" icon={<CheckShieldOutline style={{ fontSize: 22 }} />} />
            <TabBar.Item key="me" title="我的" icon={<UserOutline style={{ fontSize: 22 }} />} />
          </TabBar>
        </div>
      </div>
    </div>
  );
}
