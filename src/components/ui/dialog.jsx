import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DialogContext = React.createContext({})

function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({ asChild, children, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        children.props.onClick?.(e)
        onOpenChange?.(true)
      },
    })
  }
  return (
    <button onClick={() => onOpenChange?.(true)} {...props}>
      {children}
    </button>
  )
}

function DialogPortal({ children }) {
  return children
}

function DialogOverlay({ className, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/80 animate-in fade-in-0',
        className
      )}
      onClick={() => onOpenChange?.(false)}
      {...props}
    />
  )
}

function DialogContent({ className, children, onClose, ...props }) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  if (!open) return null

  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <DialogOverlay />
      <div
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] rounded-xl',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
  )
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
