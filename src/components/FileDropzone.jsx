import React, { useCallback, useState } from 'react'
import { UploadCloud, FileImage, FileText, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPT_LABELS = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/pdf': 'PDF',
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-excel': 'XLS',
}

// Extension fallbacks for when the browser reports an empty MIME type
const MIME_TO_EXTENSIONS = {
  'image/jpeg':    ['.jpg', '.jpeg'],
  'image/png':     ['.png'],
  'application/pdf': ['.pdf'],
  'text/csv':      ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
}

function isImage(file) {
  const name = file.name.toLowerCase()
  return file.type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')
}

function isPdf(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function getFileIcon(file) {
  if (!file) return <UploadCloud className="h-10 w-10 text-muted-foreground" />
  if (isImage(file)) return <FileImage className="h-10 w-10 text-blue-500" />
  if (isPdf(file)) return <FileText className="h-10 w-10 text-red-500" />
  return <FileSpreadsheet className="h-10 w-10 text-green-600" />
}

/**
 * @param {object} props
 * @param {string[]} props.accept - MIME types to accept
 * @param {(file: File) => void} props.onFile - called when a file is selected/dropped
 * @param {boolean} props.disabled
 * @param {string} props.className
 */
export default function FileDropzone({ accept = [], onFile, disabled, className }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFile = useCallback(
    (file) => {
      if (!file) return
      const nameLower = file.name.toLowerCase()
      const ok = accept.length === 0 || accept.some((type) => {
        if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -2))
        if (file.type === type) return true
        // Fallback: match by file extension when browser reports empty/wrong MIME type
        const exts = MIME_TO_EXTENSIONS[type] || []
        return exts.some((ext) => nameLower.endsWith(ext))
      })
      if (!ok) return
      setSelectedFile(file)
      onFile?.(file)
    },
    [accept, onFile]
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      handleFile(file)
    },
    [handleFile]
  )

  const onInputChange = (e) => {
    handleFile(e.target.files?.[0])
    e.target.value = '' // reset so same file can be re-picked
  }

  const acceptStr = accept.join(',')
  const labels = accept.map((m) => ACCEPT_LABELS[m] || m).join(', ')

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors p-8',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {getFileIcon(selectedFile)}
      {selectedFile ? (
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {(selectedFile.size / 1024).toFixed(1)} KB — click to change
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm font-medium">Drop file here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Accepted: {labels || 'any file'}</p>
        </div>
      )}
      <input
        type="file"
        accept={acceptStr}
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
      />
    </label>
  )
}
