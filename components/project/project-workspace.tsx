'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Project, ProjectFile } from '@/lib/projects'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { FileManager } from './file-manager'
import { ProjectChat } from './project-chat'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ProjectWorkspaceProps {
  project: Project
  initialFiles: ProjectFile[]
  user: User
}

export function ProjectWorkspace({ project, initialFiles, user }: ProjectWorkspaceProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(30) // Ancho en porcentaje
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)

  // Manejar el arrastre del divisor
  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const newWidth = (e.clientX / window.innerWidth) * 100
    if (newWidth >= 20 && newWidth <= 50) {
      setLeftPanelWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleFileUploaded = (file: ProjectFile) => {
    setFiles([file, ...files])
  }

  const handleFileDeleted = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId))
  }

  return (
    <div className="min-h-screen bg-background" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <DashboardHeader user={user} />

      <main className="h-[calc(100vh-73px)] flex">
        {/* Panel izquierdo: Gestión de archivos */}
        <div
          className={`transition-all duration-300 ease-in-out border-r bg-muted/30 ${
            isLeftPanelCollapsed ? 'w-0 opacity-0' : ''
          }`}
          style={{
            width: isLeftPanelCollapsed ? '0%' : `${leftPanelWidth}%`,
          }}
        >
          {!isLeftPanelCollapsed && (
            <div className="h-full animate-in fade-in slide-in-from-left duration-300">
              <FileManager 
                project={project} 
                files={files}
                onFileUploaded={handleFileUploaded}
                onFileDeleted={handleFileDeleted}
              />
            </div>
          )}
        </div>

        {/* Divisor redimensionable */}
        {!isLeftPanelCollapsed && (
          <div
            className="w-1 cursor-col-resize hover:bg-primary/20 transition-colors relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
          </div>
        )}

        {/* Botón de colapsar/expandir */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 ml-2"
          style={{
            left: isLeftPanelCollapsed ? '0' : `${leftPanelWidth}%`,
            transition: 'left 300ms ease-in-out',
          }}
        >
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-6 rounded-r-lg rounded-l-none shadow-md bg-background"
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          >
            {isLeftPanelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Panel derecho: Chat */}
        <div className="flex-1 animate-in fade-in duration-500">
          <ProjectChat project={project} />
        </div>
      </main>
    </div>
  )
}
