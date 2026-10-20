/**
 * 防御性日期格式化：旧数据/恢复数据中日期字段可能为 null、空串或非法格式，
 * 直接 new Date(x).toLocaleDateString() 会抛 Invalid time value 导致整页崩溃。
 * 统一用本函数：空值/非法日期返回 '—'。
 */
export function fmtDate(d: any, opts?: Intl.DateTimeFormatOptions): string {
  if (d === null || d === undefined || d === '') return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('zh-CN', opts || { year: 'numeric', month: '2-digit', day: '2-digit' });
}
