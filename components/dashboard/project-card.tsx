'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Project } from '@/lib/projects'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { RenameProjectDialog } from './rename-project-dialog'
import { DeleteProjectDialog } from './delete-project-dialog'

interface ProjectCardProps {
  project: Project
  onDeleted: (projectId: string) => void
  onUpdated: (project: Project) => void
}

export function ProjectCard({ project, onDeleted, onUpdated }: ProjectCardProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const formattedDate = new Date(project.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl line-clamp-1">{project.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description || 'Sin descripción'}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Creado el {formattedDate}
            </p>
            <Link href={`/project/${project.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <FolderOpen className="mr-2 h-4 w-4" />
                Abrir
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <RenameProjectDialog
        project={project}
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onProjectUpdated={onUpdated}
      />

      <DeleteProjectDialog
        project={project}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onProjectDeleted={onDeleted}
      />
    </>
  )
}
