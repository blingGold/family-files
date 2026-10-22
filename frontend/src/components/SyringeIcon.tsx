export function SyringeIcon({ size = 22, color = '#5b8db8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 14.5 14.5 8l3 3-6.5 6.5a2.5 2.5 0 0 1-1.8.7H6.5v-2.5c0-.7.3-1.3.7-1.8Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 6.5 14 11.5M6 20.5l-2-2M10 5l3-3 3 3M13 2l2.5 2.5M15.5 4.5l3 3 1.5 1.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 5.5 18.5 8M5 20.5 8 18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
