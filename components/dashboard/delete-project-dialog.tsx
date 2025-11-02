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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { Project } from '@/lib/projects'

interface DeleteProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectDeleted: (projectId: string) => void
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onProjectDeleted,
}: DeleteProjectDialogProps) {
  const [confirmName, setConfirmName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmName !== project.name) {
      setError('El nombre no coincide')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar el proyecto')
      }

      onProjectDeleted(project.id)
      setConfirmName('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmName('')
      setError('')
    }
    onOpenChange(open)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el proyecto{' '}
              <span className="font-semibold">{project.name}</span> y todos sus archivos asociados.
            </p>
            
            <div className="space-y-2 pt-4">
              <Label htmlFor="confirm-name">
                Para confirmar, escribe <span className="font-mono font-semibold">{project.name}</span> a continuación:
              </Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => {
                  setConfirmName(e.target.value)
                  setError('')
                }}
                placeholder="Escribe el nombre del proyecto"
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isLoading || confirmName !== project.name}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar Proyecto
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
