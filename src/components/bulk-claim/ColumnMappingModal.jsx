import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const REQUIRED_COLS = [
  { key: 'invoiceCol', label: 'Invoice Number *', required: true },
  { key: 'amountCol', label: 'Amount *', required: true },
  { key: 'itemsCol', label: 'Items / Description', required: false },
  { key: 'providerCol', label: 'Provider', required: false },
  { key: 'dateCol', label: 'Date', required: false },
  { key: 'patientCol', label: 'Patient Name', required: false },
]

/**
 * @param {{
 *   headers: string[],
 *   sampleRows: object[],
 *   initialMapping: object,
 *   onConfirm: (mapping: object) => void,
 *   onCancel: () => void,
 * }} props
 */
export default function ColumnMappingModal({ headers, sampleRows, initialMapping, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(initialMapping || {})

  const isValid = mapping.invoiceCol && mapping.amountCol

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Map Spreadsheet Columns</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We couldn't auto-detect all required columns. Please assign them manually.
        </p>
      </div>

      {/* Sample data preview */}
      {sampleRows?.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-t">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate">
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        {REQUIRED_COLS.map(({ key, label, required }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Select
              value={mapping[key] || ''}
              onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value || null }))}
            >
              <option value="">— {required ? 'Select column' : 'None'} —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} type="button">Cancel</Button>
        <Button onClick={() => onConfirm(mapping)} disabled={!isValid} type="button">
          Confirm Mapping
        </Button>
      </div>
    </div>
  )
}
