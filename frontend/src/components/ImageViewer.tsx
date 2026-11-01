import { useEffect } from 'react';

/** 图片大图查看器：全屏遮罩，图片按 contain 自动缩放适配屏幕，Esc 或点击遮罩关闭 */
export default function ImageViewer(props: { url: string; onClose: () => void }) {
  const { url, onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      <img
        src={url}
        alt="图片预览"
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        style={{
          maxWidth: '100%', maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: 6,
          boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
          background: '#fff',
        }}
      />
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
        点击遮罩或按 Esc 关闭
      </span>
    </div>
  );
}
