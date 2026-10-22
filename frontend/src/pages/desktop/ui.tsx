import React from 'react';

/** 桌面端统一色板（沿用移动端雾霾蓝体系） */
export const C = {
  bg: '#f3f6f9',
  panel: '#ffffff',
  line: '#e2e8ef',
  line2: '#eef2f6',
  ink: '#22303e',
  ink2: '#65717e',
  ink3: '#96a1ad',
  brand: '#5b8db8',
  brandDeep: '#3d6b94',
  brandSoft: '#e8f0f7',
  amber: '#c98a2e',
  amberSoft: '#faf0dc',
  green: '#4e9a6f',
  greenSoft: '#e5f1ea',
  danger: '#d97b7b',
  dangerSoft: '#fbeaea',
};

export function Card(props: { title?: React.ReactNode; dot?: string; extra?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: '16px 18px', ...props.style }}>
      {props.title !== undefined && (
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: props.dot || C.brand, flex: 'none' }} />
          {props.title}
          {props.extra && <span style={{ marginLeft: 'auto' }}>{props.extra}</span>}
        </div>
      )}
      {props.children}
    </div>
  );
}

export function Tag(props: { tone: 'brand' | 'amber' | 'green' | 'danger' | 'plain'; children: React.ReactNode; style?: React.CSSProperties }) {
  const map: any = {
    brand: { bg: C.brandSoft, fg: C.brandDeep },
    amber: { bg: C.amberSoft, fg: C.amber },
    green: { bg: C.greenSoft, fg: C.green },
    danger: { bg: C.dangerSoft, fg: C.danger },
    plain: { bg: '#f2f5f8', fg: C.ink2 },
  };
  const t = map[props.tone];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: t.bg, color: t.fg, flex: 'none', ...props.style }}>
      {props.children}
    </span>
  );
}

export function Empty(props: { text: string; style?: React.CSSProperties }) {
  return (
    <div style={{ border: `1px dashed ${C.line}`, borderRadius: 10, background: '#fbfcfe', color: C.ink3, fontSize: 13, textAlign: 'center', padding: '28px 16px', ...props.style }}>
      {props.text}
    </div>
  );
}

export function calcAge(birthDate: any): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

/** 复查是否逾期：当天到期不算逾期，从次日 0 点起算（dueDate < 今天零点） */
export function isOverdue(f: any): boolean {
  if (f.status === 'DONE') return false;
  const d = new Date(f.dueDate);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export function overdueDays(f: any): number {
  const d = new Date(f.dueDate);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - d.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

/** 每个病人的逾期复查数（列表接口已含 conditions.followUps） */
export function patientOverdueCount(p: any): number {
  let n = 0;
  (p.conditions || []).forEach((c: any) => {
    (c.followUps || []).forEach((f: any) => {
      if (f.status === 'PENDING' && isOverdue(f)) n++;
    });
  });
  return n;
}

/** 桌面端"请在手机端完成录入"提示 */
export function mobileOnly(): void {
  alert('该操作请在手机端完成录入\n\n电脑端定位为查看病历与提醒，录入功能保留在移动端。');
}

export function fmtDateCN(d: any): string {
  if (d === null || d === undefined || d === '') return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function fmtDateTimeCN(d: any): string {
  if (d === null || d === undefined || d === '') return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** 按分类分组附件 */
export function groupAttachments(atts: any[]): { cat: string; items: any[] }[] {
  const cats = ['影像', '抽血结果', 'B超结果', '其他'];
  return cats
    .map((cat) => ({ cat, items: (atts || []).filter((a: any) => (a.category || '其他') === cat) }))
    .filter((g) => g.items.length > 0);
}
