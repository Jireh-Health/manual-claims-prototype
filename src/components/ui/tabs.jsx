import * as React from 'react'
import { cn } from '@/lib/utils'

const TabsContext = React.createContext({})

function Tabs({ defaultValue, value, onValueChange, children, className, ...props }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  const current = value !== undefined ? value : internalValue
  const setCurrent = onValueChange || setInternalValue

  return (
    <TabsContext.Provider value={{ current, setCurrent }}>
      <div className={cn('', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ value, className, ...props }) {
  const { current, setCurrent } = React.useContext(TabsContext)
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        current === value ? 'bg-background text-foreground shadow' : 'hover:bg-background/50',
        className
      )}
      onClick={() => setCurrent(value)}
      {...props}
    />
  )
}

function TabsContent({ value, className, ...props }) {
  const { current } = React.useContext(TabsContext)
  if (current !== value) return null
  return (
    <div
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
