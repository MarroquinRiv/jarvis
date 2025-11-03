'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText } from 'lucide-react'

export function UploadZone() {
  const handleUploadClick = () => {
    const n8nFormUrl = process.env.NEXT_PUBLIC_N8N_FORM_UPLOAD
    if (n8nFormUrl) {
      window.location.href = n8nFormUrl
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full border-0 rounded-none shadow-none flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            {/* Zona de arrastrar y soltar visual */}
            <div 
              onClick={handleUploadClick}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="flex flex-col items-center gap-6">
                {/* Ícono principal */}
                <div className="rounded-full bg-primary/10 p-6 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-16 w-16 text-primary" />
                </div>

                {/* Texto principal */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">
                    Subir Documento
                  </h3>
                  <p className="text-muted-foreground">
                    Haz clic aquí para subir archivos PDF, DOC o DOCX
                  </p>
                </div>

                {/* Botón prominente */}
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-4"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUploadClick()
                  }}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Subir Documento
                </Button>

                {/* Información adicional */}
                <p className="text-xs text-muted-foreground mt-4">
                  Los documentos se procesarán automáticamente con IA
                  <br />
                  para extraer contenido y generar embeddings
                </p>
              </div>
            </div>

            {/* Información sobre tipos de archivo */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                <strong className="text-foreground">Formatos aceptados:</strong> PDF, DOC, DOCX
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
