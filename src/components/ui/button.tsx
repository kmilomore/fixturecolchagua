import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]',
  {
    variants: {
      variant: {
        default:
          'bg-[image:linear-gradient(135deg,#25306b_0%,#006bb9_100%)] text-white shadow-[0_16px_36px_-20px_rgba(0,107,185,0.85)] hover:-translate-y-0.5 hover:brightness-105',
        secondary:
          'bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] text-primary shadow-[var(--shadow-soft)] ring-1 ring-white/70 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]',
        outline:
          'border border-primary/15 bg-white/70 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5',
        ghost: 'text-primary hover:bg-primary/6',
        destructive: 'bg-[image:linear-gradient(135deg,#ff1d3d_0%,#ff6b4a_100%)] text-white shadow-[0_16px_36px_-20px_rgba(255,29,61,0.8)] hover:-translate-y-0.5 hover:brightness-105',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
