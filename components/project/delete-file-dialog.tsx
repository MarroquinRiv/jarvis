'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface DeleteFileDialogProps {
  fileId: string | null
  fileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileDeleted: (fileId: string) => void
}

export function DeleteFileDialog({
  fileId,
  fileName,
  open,
  onOpenChange,
  onFileDeleted,
}: DeleteFileDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!fileId) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar el archivo')
      }

      onFileDeleted(fileId)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              ¿Estás seguro de que deseas eliminar{' '}
              <span className="font-semibold">{fileName}</span>?
            </p>
            <p className="text-sm">Esta acción no se puede deshacer.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
