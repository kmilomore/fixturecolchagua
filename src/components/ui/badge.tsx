import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/10 bg-primary/8 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
        secondary: 'border-secondary/15 bg-secondary/10 text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
        damas: 'border-accent/15 bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
        varones: 'border-secondary/15 bg-secondary/10 text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
        live: 'border-emerald-300/40 bg-emerald-500/15 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] animate-pulse-live',
        muted: 'border-black/5 bg-black/5 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
        warn: 'border-accent/15 bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
