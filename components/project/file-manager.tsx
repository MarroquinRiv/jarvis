'use client'

import { useState } from 'react'
import { Project, ProjectFile } from '@/lib/projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, X, RefreshCw } from 'lucide-react'
import { DeleteFileDialog } from './delete-file-dialog'
import { ReplaceFileDialog } from './replace-file-dialog'

interface FileManagerProps {
  project: Project
  files: ProjectFile[]
  onFileUploaded: (file: ProjectFile) => void
  onFileDeleted: (fileId: string) => void
}

export function FileManager({ project, files, onFileUploaded, onFileDeleted }: FileManagerProps) {
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null)
  const [replaceFile, setReplaceFile] = useState<ProjectFile | null>(null)

  const handleUploadClick = () => {
    const n8nFormUrl = process.env.NEXT_PUBLIC_N8N_FORM_UPLOAD
    if (n8nFormUrl) {
      window.location.href = n8nFormUrl
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full border-0 rounded-none shadow-none">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <span>Archivos del Proyecto</span>
            <Button
              size="sm"
              onClick={handleUploadClick}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              Subir
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No hay archivos</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Sube documentos PDF, DOC o DOCX para comenzar
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUploadClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir Archivo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className="group p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setReplaceFile(file)}
                        title="Reemplazar archivo"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteFileId(file.id)}
                        title="Eliminar archivo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteFileDialog
        fileId={deleteFileId}
        fileName={files.find(f => f.id === deleteFileId)?.file_name || ''}
        open={deleteFileId !== null}
        onOpenChange={(open: boolean) => !open && setDeleteFileId(null)}
        onFileDeleted={onFileDeleted}
      />

      <ReplaceFileDialog
        file={replaceFile}
        open={replaceFile !== null}
        onOpenChange={(open: boolean) => !open && setReplaceFile(null)}
        onFileReplaced={(updatedFile: ProjectFile) => {
          // Actualizar el archivo en la lista
          onFileDeleted(updatedFile.id)
          onFileUploaded(updatedFile)
        }}
      />
    </div>
  )
}
