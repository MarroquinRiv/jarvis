import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserProjects } from '@/lib/projects'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProjectsGrid } from '@/components/dashboard/projects-grid'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const projects = await getUserProjects()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Mis Proyectos</h1>
              <p className="text-muted-foreground">
                Gestiona tus proyectos y documentos en un solo lugar
              </p>
            </div>
          </div>
          <ProjectsGrid projects={projects} />
        </div>
      </main>
    </div>
  )
}
