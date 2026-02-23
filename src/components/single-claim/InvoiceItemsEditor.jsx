import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Add / edit / delete line items; auto-recalculates total on change.
 *
 * @param {{ items: {id,description,amount}[], onChange: (items) => void }} props
 */
export default function InvoiceItemsEditor({ items = [], onChange }) {
  const addItem = () => {
    onChange([...items, { id: crypto.randomUUID(), description: '', amount: 0 }])
  }

  const removeItem = (id) => {
    onChange(items.filter((i) => i.id !== id))
  }

  const updateItem = (id, field, value) => {
    onChange(
      items.map((i) =>
        i.id === id
          ? { ...i, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
          : i
      )
    )
  }

  const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Line Items
        </span>
        <Button size="sm" variant="outline" onClick={addItem} type="button">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2">
          No items — click "Add Item" to add at least one line item.
        </p>
      )}

      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={item.id} className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
            <Input
              value={item.description}
              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
              placeholder="Description"
              className="flex-1 h-8 text-xs"
            />
            <Input
              type="number"
              value={item.amount || ''}
              onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
              placeholder="0.00"
              className="w-28 h-8 text-xs"
              min="0"
              step="0.01"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeItem(item.id)}
              type="button"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex justify-end pt-1 border-t">
          <span className="text-sm font-semibold">
            Total: KES {total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
