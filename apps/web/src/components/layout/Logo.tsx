import { cn } from '@/lib/utils';

export function OrbitoLogo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <circle cx="20" cy="20" r="4" fill="currentColor" className="text-primary" />
      <ellipse
        cx="20"
        cy="20"
        rx="14"
        ry="6"
        stroke="url(#orbit-gradient)"
        strokeWidth="2"
        fill="none"
        transform="rotate(-20 20 20)"
      />
      <circle cx="32" cy="14" r="2.5" fill="#06B6D4" />
      <defs>
        <linearGradient id="orbit-gradient" x1="6" y1="20" x2="34" y2="20">
          <stop stopColor="#6366F1" />
          <stop offset="0.5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
