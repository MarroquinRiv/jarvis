import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getFileById } from '@/lib/projects'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    const existingFile = await getFileById(id)

    if (!existingFile) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se permiten PDF, DOC y DOCX' },
        { status: 400 }
      )
    }

    // Delete old file from storage
    const { error: deleteError } = await supabase.storage
      .from('project-files')
      .remove([existingFile.file_path])

    if (deleteError) {
      console.error('Error deleting old file:', deleteError)
    }

    // Upload new file to storage
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `${user.id}/${existingFile.project_id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Error al subir el archivo al almacenamiento' },
        { status: 500 }
      )
    }

    // Update file record in database
    const { data: updatedFile, error: updateError } = await supabase
      .from('project_files')
      .update({
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar el registro del archivo' },
        { status: 500 }
      )
    }

    // Send file to n8n webhook for processing
    try {
      const webhookUrl = process.env.N8N_WEBHOOK_FILE_UPLOAD
      
      if (webhookUrl) {
        const webhookFormData = new FormData()
        webhookFormData.append('file', file)

        await fetch(webhookUrl, {
          method: 'POST',
          body: webhookFormData,
        })
      }
    } catch (webhookError) {
      console.error('Webhook error:', webhookError)
      // Don't fail the upload if webhook fails
    }

    return NextResponse.json(updatedFile)
  } catch (error) {
    console.error('Error replacing file:', error)
    return NextResponse.json(
      { error: 'Error al reemplazar el archivo' },
      { status: 500 }
    )
  }
}
