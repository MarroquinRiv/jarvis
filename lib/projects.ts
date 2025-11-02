import { createClient } from '@/utils/supabase/server'

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
  updated_at: string
}

/**
 * Get all projects for the authenticated user
 */
export async function getUserProjects(): Promise<Project[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get a single project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  
  return data
}

/**
 * Create a new project
 */
export async function createProject(name: string, description?: string): Promise<Project> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name,
      description: description || null
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a project's name or description
 */
export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string }
): Promise<Project> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a project and all its associated files
 */
export async function deleteProject(projectId: string): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  // Delete all files from storage first
  const { data: files } = await supabase
    .from('project_files')
    .select('file_path')
    .eq('project_id', projectId)
    .eq('user_id', user.id)

  if (files && files.length > 0) {
    const filePaths = files.map(f => f.file_path)
    await supabase.storage
      .from('project-files')
      .remove(filePaths)
  }

  // Delete the project (cascade will delete project_files records)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Get all files for a specific project
 */
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get a single file by ID
 */
export async function getFileById(fileId: string): Promise<ProjectFile | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data
}

/**
 * Create a file record in the database
 */
export async function createFileRecord(
  projectId: string,
  fileName: string,
  filePath: string,
  fileSize: number,
  mimeType: string
): Promise<ProjectFile> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      user_id: user.id,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      mime_type: mimeType
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a file from storage and database
 */
export async function deleteFile(fileId: string): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  // Get file path first
  const { data: file } = await supabase
    .from('project_files')
    .select('file_path')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single()

  if (!file) throw new Error('File not found')

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('project-files')
    .remove([file.file_path])

  if (storageError) throw storageError

  // Delete from database
  const { error } = await supabase
    .from('project_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Get a signed URL to download a file
 */
export async function getFileDownloadUrl(filePath: string): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) throw error
  return data.signedUrl
}
