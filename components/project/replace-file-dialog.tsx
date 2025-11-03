'use client'

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
import { Upload } from 'lucide-react'

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
}: ReplaceFileDialogProps) {
  const handleUploadClick = () => {
    const n8nFormUrl = process.env.NEXT_PUBLIC_N8N_FORM_UPLOAD
    if (n8nFormUrl) {
      window.location.href = n8nFormUrl
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reemplazar Archivo</DialogTitle>
          <DialogDescription>
            Para reemplazar{' '}
            <span className="font-semibold">{file?.file_name}</span>, serás redirigido
            al formulario de subida donde podrás seleccionar un nuevo archivo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Button
            onClick={handleUploadClick}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Ir a Subir Archivo
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
