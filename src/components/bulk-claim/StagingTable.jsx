import React, { useState } from 'react'
import {
  CheckCircle, AlertTriangle, AlertCircle, Copy, Clock,
  Trash2, ChevronDown, ChevronRight, RefreshCw, Send, X, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { batchVerify } from '@/lib/mockApi'

const STATUS_CONFIG = {
  pending:         { label: 'Pending',       color: 'gray',    icon: Clock,         bg: '' },
  valid:           { label: 'Verified',       color: 'success', icon: CheckCircle,   bg: 'bg-green-50' },
  amount_mismatch: { label: 'Amt Mismatch',   color: 'warning', icon: AlertTriangle, bg: 'bg-yellow-50' },
  missing_items:   { label: 'Missing Items',  color: 'error',   icon: AlertCircle,   bg: 'bg-red-50' },
  unknown:         { label: 'Unknown',        color: 'error',   icon: AlertCircle,   bg: 'bg-red-50' },
  duplicate:       { label: 'Duplicate',      color: 'orange',  icon: Copy,          bg: 'bg-orange-50' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.color} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  )
}

/** Sum item amounts for a row */
function itemsSum(items) {
  return (items || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
}

/**
 * Inline item editor shown in the expanded panel.
 * Edits bubble up: any change recalculates the row total and resets verify status.
 */
function RowItemsEditor({ row, onRowChange }) {
  const items = row.items || []

  const updateItem = (id, field, value) => {
    const updated = items.map((i) =>
      i.id === id
        ? { ...i, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
        : i
    )
    const total = itemsSum(updated)
    onRowChange({ items: updated, amount: total, status: 'pending', verifyResult: null })
  }

  const addItem = () => {
    const updated = [...items, { id: crypto.randomUUID(), description: '', amount: 0 }]
    onRowChange({ items: updated, status: 'pending', verifyResult: null })
  }

  const removeItem = (id) => {
    const updated = items.filter((i) => i.id !== id)
    const total = itemsSum(updated)
    onRowChange({ items: updated, amount: total, status: 'pending', verifyResult: null })
  }

  const total = itemsSum(items)

  return (
    <div className="py-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Line Items</span>
        <Button size="sm" variant="outline" onClick={addItem} type="button" className="h-6 px-2 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add item
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No items — add at least one.</p>
      )}

      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
            <Input
              value={item.description}
              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
              placeholder="Description"
              className="flex-1 h-7 text-xs"
            />
            <Input
              type="number"
              value={item.amount || ''}
              onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
              placeholder="0"
              className="w-28 h-7 text-xs"
              min="0"
              step="0.01"
            />
            <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
              KES {Number(item.amount || 0).toLocaleString()}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-muted-foreground hover:text-destructive shrink-0"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex justify-end border-t pt-1.5 gap-2 text-xs font-semibold">
          <span className="text-muted-foreground font-normal">Items total →</span>
          <span>KES {total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {row.verifyResult?.message && (
        <p className="text-xs text-muted-foreground pt-1 border-t">{row.verifyResult.message}</p>
      )}
    </div>
  )
}

export default function StagingTable({ rows, onRowsChange, onSubmitValid }) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [selected, setSelected] = useState(new Set())

  const updateRow = (id, updates) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const deleteRow = (id) => {
    onRowsChange(rows.filter((r) => r.id !== id))
    setSelected((s) => { const n = new Set(s); n.delete(id); return n })
  }

  const deleteSelected = () => {
    onRowsChange(rows.filter((r) => !selected.has(r.id)))
    setSelected(new Set())
  }

  const selectInvalid = () => {
    setSelected(new Set(
      rows
        .filter((r) => ['unknown', 'missing_items', 'duplicate', 'amount_mismatch'].includes(r.status))
        .map((r) => r.id)
    ))
  }

  const toggleExpand = (id) => {
    setExpandedRows((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const verifyAll = async () => {
    setIsVerifying(true)
    try {
      const results = await batchVerify(rows)
      onRowsChange(rows.map((row, i) => ({
        ...row,
        status: results[i].status,
        verifyResult: results[i],
      })))
    } finally {
      setIsVerifying(false)
    }
  }

  const validRows     = rows.filter((r) => r.status === 'valid')
  const countByStatus = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const totalValue    = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/30 rounded-lg border text-xs">
        <span className="font-medium">Total: {rows.length}</span>
        {countByStatus.valid         > 0 && <Badge variant="success">{countByStatus.valid} Valid</Badge>}
        {countByStatus.amount_mismatch > 0 && <Badge variant="warning">{countByStatus.amount_mismatch} Mismatch</Badge>}
        {(countByStatus.unknown || 0) + (countByStatus.missing_items || 0) > 0 && (
          <Badge variant="error">{(countByStatus.unknown || 0) + (countByStatus.missing_items || 0)} Error</Badge>
        )}
        {countByStatus.duplicate > 0 && <Badge variant="orange">{countByStatus.duplicate} Duplicate</Badge>}
        {countByStatus.pending   > 0 && <Badge variant="gray">{countByStatus.pending} Pending</Badge>}
        <span className="ml-auto font-semibold">
          Batch Value: KES {totalValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Action bar */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={verifyAll} disabled={isVerifying || rows.length === 0} size="sm">
          {isVerifying
            ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Verifying…</>
            : 'Verify All'}
        </Button>
        <Button
          onClick={() => onSubmitValid(validRows)}
          disabled={validRows.length === 0}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Submit Valid ({validRows.length})
        </Button>
        {selected.size > 0 && (
          <Button onClick={deleteSelected} size="sm" variant="destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Selected ({selected.size})
          </Button>
        )}
        <Button onClick={selectInvalid} size="sm" variant="outline">
          Select All Invalid
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Invoice #</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Amount (KES)</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Items</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Del</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const cfg        = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending
              const isExpanded = expandedRows.has(row.id)
              const computed   = itemsSum(row.items)
              const hasItems   = (row.items?.length || 0) > 0

              return (
                <React.Fragment key={row.id}>
                  <tr className={`border-b transition-colors ${cfg.bg} hover:brightness-95`}>
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={(e) => {
                          setSelected((s) => {
                            const n = new Set(s)
                            e.target.checked ? n.add(row.id) : n.delete(row.id)
                            return n
                          })
                        }}
                        className="rounded"
                      />
                    </td>

                    {/* Row number */}
                    <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>

                    {/* Invoice # */}
                    <td className="px-3 py-2">
                      <Input
                        value={row.invoiceNumber || ''}
                        onChange={(e) => updateRow(row.id, { invoiceNumber: e.target.value.toUpperCase(), status: 'pending', verifyResult: null })}
                        className="h-7 text-xs w-36"
                      />
                    </td>

                    {/* Amount — read-only when derived from items */}
                    <td className="px-3 py-2 min-w-[140px]">
                      {hasItems && computed > 0 ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">
                              KES {computed.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">from items</span>
                          </div>
                          {row.verifyResult?.expectedAmount && row.status === 'amount_mismatch' && (
                            <button
                              className="text-[10px] text-yellow-700 underline"
                              onClick={() => {
                                // Distribute expected amount proportionally across items
                                const expected = row.verifyResult.expectedAmount
                                const ratio = expected / (computed || 1)
                                const adjustedItems = row.items.map((item) => ({
                                  ...item,
                                  amount: Math.round(item.amount * ratio * 100) / 100,
                                }))
                                updateRow(row.id, { items: adjustedItems, amount: expected, status: 'pending', verifyResult: null })
                              }}
                              type="button"
                            >
                              Scale to expected KES {row.verifyResult.expectedAmount.toLocaleString()}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <Input
                            type="number"
                            value={row.amount || ''}
                            onChange={(e) => updateRow(row.id, { amount: parseFloat(e.target.value) || 0, status: 'pending', verifyResult: null })}
                            className="h-7 text-xs w-28"
                          />
                          {row.verifyResult?.expectedAmount && row.status === 'amount_mismatch' && (
                            <p className="text-[10px] text-yellow-700">
                              Expected: KES {row.verifyResult.expectedAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Items expand toggle */}
                    <td className="px-3 py-2">
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpand(row.id)}
                        type="button"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                        {row.items?.length || 0} item{row.items?.length !== 1 ? 's' : ''}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteRow(row.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>

                  {/* Expanded items editor */}
                  {isExpanded && (
                    <tr className={`border-b ${cfg.bg}`}>
                      <td colSpan={7} className="px-8">
                        <RowItemsEditor
                          row={row}
                          onRowChange={(updates) => updateRow(row.id, updates)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No rows to display.</div>
        )}
      </div>
    </div>
  )
}
