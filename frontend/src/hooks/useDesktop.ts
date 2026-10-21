import { useEffect, useState } from 'react';

/** 桌面断点：≥1024px 渲染桌面应用壳，否则沿用移动端 TabBar 布局 */
export function useDesktop() {
  const [desktop, setDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return desktop;
}
