import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createFileRecord } from '@/lib/projects'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'No se proporcionó el ID del proyecto' },
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

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `${user.id}/${projectId}/${fileName}`

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

    // Create file record in database
    const fileRecord = await createFileRecord(
      projectId,
      file.name,
      filePath,
      file.size,
      file.type
    )

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

    return NextResponse.json(fileRecord, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Error al procesar el archivo' },
      { status: 500 }
    )
  }
}
