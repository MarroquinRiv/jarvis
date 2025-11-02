import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getProjectById, getProjectFiles } from '@/lib/projects'
import { ProjectWorkspace } from '@/components/project/project-workspace'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { id } = await params
  const project = await getProjectById(id)

  if (!project) {
    redirect('/')
  }

  const files = await getProjectFiles(id)

  return <ProjectWorkspace project={project} initialFiles={files} user={user} />
}
