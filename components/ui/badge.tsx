import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'border-stroke bg-elevated text-text-secondary',
        dor: 'border-warning/25 bg-warning-tint text-warning',
        desejo: 'border-desire/25 bg-desire-tint text-desire',
        lucro: 'border-profit/25 bg-profit-tint text-profit',
        prejuizo: 'border-critical/25 bg-critical-tint text-critical',
        atencao: 'border-warning/25 bg-warning-tint text-warning',
        accent: 'border-accent/30 bg-accent/10 text-accent',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
