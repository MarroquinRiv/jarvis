'use client'

import { useState, useRef } from 'react'
import { ProjectFile } from '@/lib/projects'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Loader2 } from 'lucide-react'

interface ReplaceFileDialogProps {
  file: ProjectFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileReplaced: (file: ProjectFile) => void
}

export function ReplaceFileDialog({
  file,
  open,
  onOpenChange,
  onFileReplaced,
}: ReplaceFileDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile || !file) return

    setIsUploading(true)
    setError('')

    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Solo se permiten archivos PDF, DOC y DOCX')
        setIsUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/files/${file.id}/replace`, {
        method: 'PUT',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al reemplazar archivo')
      }

      const updatedFile = await response.json()
      onFileReplaced(updatedFile)
      onOpenChange(false)
    } catch (err) {
      console.error('Error replacing file:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reemplazar Archivo</DialogTitle>
          <DialogDescription>
            Selecciona un nuevo archivo para reemplazar{' '}
            <span className="font-semibold">{file?.file_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reemplazando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Seleccionar Archivo
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
