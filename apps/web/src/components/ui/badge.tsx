import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-transparent bg-secondary/15 text-secondary',
        outline: 'border-[var(--border)] text-[var(--muted)]',
        success: 'border-transparent bg-emerald-500/15 text-emerald-500',
        warning: 'border-transparent bg-amber-500/15 text-amber-500',
        danger: 'border-transparent bg-red-500/15 text-red-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const variant =
    priority === 'URGENT' ? 'danger' : priority === 'HIGH' ? 'warning' : priority === 'LOW' ? 'outline' : 'default';
  return <Badge variant={variant}>{priority}</Badge>;
}
