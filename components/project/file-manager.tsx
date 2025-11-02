'use client'

import { useState, useRef } from 'react'
import { Project, ProjectFile } from '@/lib/projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Loader2, X, RefreshCw } from 'lucide-react'
import { DeleteFileDialog } from './delete-file-dialog'
import { ReplaceFileDialog } from './replace-file-dialog'

interface FileManagerProps {
  project: Project
  files: ProjectFile[]
  onFileUploaded: (file: ProjectFile) => void
  onFileDeleted: (fileId: string) => void
}

export function FileManager({ project, files, onFileUploaded, onFileDeleted }: FileManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null)
  const [replaceFile, setReplaceFile] = useState<ProjectFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadError('')

    try {
      for (const file of Array.from(selectedFiles)) {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]

        if (!allowedTypes.includes(file.type)) {
          setUploadError('Solo se permiten archivos PDF, DOC y DOCX')
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', project.id)

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al subir archivo')
        }

        const uploadedFile = await response.json()
        onFileUploaded(uploadedFile)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir
                </>
              )}
            </Button>
          </CardTitle>
          {uploadError && (
            <p className="text-sm text-red-600 mt-2">{uploadError}</p>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

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
                onClick={() => fileInputRef.current?.click()}
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
