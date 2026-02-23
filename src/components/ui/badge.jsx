import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = {
  default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground',
  success: 'border-transparent bg-green-100 text-green-800',
  warning: 'border-transparent bg-yellow-100 text-yellow-800',
  error: 'border-transparent bg-red-100 text-red-800',
  orange: 'border-transparent bg-orange-100 text-orange-800',
  blue: 'border-transparent bg-blue-100 text-blue-800',
  gray: 'border-transparent bg-gray-100 text-gray-700',
}

function Badge({ className, variant = 'default', ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    />
  )
}

export { Badge }
