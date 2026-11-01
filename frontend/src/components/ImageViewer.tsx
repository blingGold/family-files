import { useEffect, useRef, useState } from 'react';

const MIN_S = 1;
const MAX_S = 5;

/** 图片大图查看器：contain 自适应 + 双指捏合缩放 + 单指拖动平移 + 双击/滚轮缩放，Esc 或点击遮罩关闭 */
export default function ImageViewer(props: { url: string; onClose: () => void }) {
  const { url, onClose } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const gRef = useRef<{ type: 'pinch' | 'pan'; dist?: number; startScale?: number; lastX?: number; lastY?: number } | null>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });

  const apply = (s: number, x: number, y: number) => {
    const ns = Math.min(MAX_S, Math.max(MIN_S, s));
    scaleRef.current = ns;
    posRef.current = { x, y };
    setView({ s: ns, x, y });
  };
  const reset = () => apply(1, 0, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        gRef.current = {
          type: 'pinch',
          dist: Math.hypot(dx, dy),
          startScale: scaleRef.current,
        };
      } else if (e.touches.length === 1) {
        gRef.current = {
          type: 'pan',
          lastX: e.touches[0].clientX,
          lastY: e.touches[0].clientY,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const g = gRef.current;
      if (!g) return;
      if (g.type === 'pinch' && e.touches.length >= 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy) || g.dist || 1;
        apply((g.startScale || 1) * (dist / (g.dist || 1)), posRef.current.x, posRef.current.y);
        e.preventDefault();
      } else if (g.type === 'pan' && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - (g.lastX ?? 0);
        const dy = t.clientY - (g.lastY ?? 0);
        g.lastX = t.clientX;
        g.lastY = t.clientY;
        apply(scaleRef.current, posRef.current.x + dx, posRef.current.y + dy);
        e.preventDefault();
      }
    };
    const onTouchEnd = () => {
      gRef.current = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      apply(scaleRef.current * f, posRef.current.x, posRef.current.y);
    };
    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      if (scaleRef.current > 1) reset();
      else apply(2.5, 0, 0);
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('dblclick', onDblClick);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('dblclick', onDblClick);
    };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, boxSizing: 'border-box',
      }}
    >
      <div
        ref={wrapRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
          maxWidth: '100%', maxHeight: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab',
        }}
      >
        <img
          src={url}
          alt="图片预览"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 6,
            boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
            background: '#fff',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        />
      </div>
      <span
        onClick={onClose}
        style={{
          position: 'fixed', top: 14, right: 18,
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, cursor: 'pointer', userSelect: 'none', lineHeight: 1,
        }}
      >
        ×
      </span>
      <span
        onClick={onClose}
        style={{
          position: 'fixed', bottom: 16, left: 0, right: 0, textAlign: 'center',
          color: 'rgba(255,255,255,0.6)', fontSize: 12,
        }}
      >
        双指捏合缩放 · 拖动平移 · 双击还原 · 点击遮罩或 Esc 关闭
      </span>
    </div>
  );
}
