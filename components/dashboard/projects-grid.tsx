'use client'

import { useState } from 'react'
import { Project } from '@/lib/projects'
import { ProjectCard } from './project-card'
import { CreateProjectDialog } from './create-project-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface ProjectsGridProps {
  projects: Project[]
}

export function ProjectsGrid({ projects: initialProjects }: ProjectsGridProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects])
  }

  const handleProjectDeleted = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId))
  }

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p))
  }

  return (
    <>
      <div className="mb-6">
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nuevo Proyecto
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No tienes proyectos aún</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Crea tu primer proyecto para empezar a organizar tus documentos y conversaciones con IA
          </p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear Proyecto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProjectCard
                project={project}
                onDeleted={handleProjectDeleted}
                onUpdated={handleProjectUpdated}
              />
            </div>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </>
  )
}
