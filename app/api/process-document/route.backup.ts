import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import * as pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import {
  chunkText,
  cleanText,
  generateEmbeddingsBatch,
  createChunkMetadata,
  type ChunkMetadata,
} from '@/lib/document-processing'

export async function POST(request: Request) {
  const debugId = `[${Date.now()}]` // ID único para este request
  
  try {
    console.log(`${debugId} ============= INICIO DEL PROCESO =============`)
    
    // ✅ ETAPA 1: AUTENTICACIÓN
    console.log(`${debugId} [1/6] Verificando autenticación...`)
    const supabase = await createClient()
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error(`${debugId} ❌ Error de autenticación:`, authError)
      return NextResponse.json({ 
        error: 'Error de autenticación', 
        details: authError.message 
      }, { status: 401 })
    }

    if (!user) {
      console.error(`${debugId} ❌ Usuario no autenticado`)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    console.log(`${debugId} ✅ Usuario autenticado: ${user.id}`)

    // ✅ ETAPA 2: RECEPCIÓN DEL ARCHIVO
    console.log(`${debugId} [2/6] Recibiendo archivo del cliente...`)
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file) {
      console.error(`${debugId} ❌ No se recibió archivo`)
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    if (!projectId) {
      console.error(`${debugId} ❌ No se recibió projectId`)
      return NextResponse.json(
        { error: 'No se proporcionó el ID del proyecto' },
        { status: 400 }
      )
    }

    console.log(`${debugId} ✅ Archivo recibido:`)
    console.log(`${debugId}    - Nombre: ${file.name}`)
    console.log(`${debugId}    - Tipo: ${file.type}`)
    console.log(`${debugId}    - Tamaño: ${(file.size / 1024).toFixed(2)} KB`)
    console.log(`${debugId}    - Proyecto: ${projectId}`)

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      console.error(`${debugId} ❌ Tipo de archivo no permitido: ${file.type}`)
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se permiten PDF, DOC y DOCX' },
        { status: 400 }
      )
    }

    console.log(`${debugId} ✅ Tipo de archivo válido`)

    // PASO 1: Extraer texto del archivo
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''

    if (file.type === 'application/pdf') {
      const pdfData = await (pdfParse as any).default(buffer)
      extractedText = pdfData.text
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    } else if (file.type === 'application/msword') {
      // DOC antiguo - mammoth también lo soporta
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del documento' },
        { status: 400 }
      )
    }

    console.log(`[EXTRACT] Extracted ${extractedText.length} characters`)

    // PASO 2: Limpiar y dividir en chunks
    const cleanedText = cleanText(extractedText)
    const chunks = chunkText(cleanedText, 1000, 200)

    console.log(`[CHUNK] Created ${chunks.length} chunks`)

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'El documento no contiene suficiente texto para procesar' },
        { status: 400 }
      )
    }

    // PASO 3: Generar embeddings con HuggingFace
    const hfApiKey = process.env.HUGGINGFACE_API_KEY

    if (!hfApiKey) {
      return NextResponse.json(
        { error: 'API de HuggingFace no configurada' },
        { status: 500 }
      )
    }

    console.log(`[EMBEDDING] Generating embeddings for ${chunks.length} chunks...`)

    const embeddings = await generateEmbeddingsBatch(chunks, hfApiKey, 5, 1000)

    console.log(`[EMBEDDING] Generated ${embeddings.length} embeddings`)

    // Verificar que todos los embeddings tengan 768 dimensiones
    const invalidEmbeddings = embeddings.filter(emb => emb.length !== 768)
    if (invalidEmbeddings.length > 0) {
      return NextResponse.json(
        { error: `Embeddings con dimensiones incorrectas: esperado 768, recibido ${invalidEmbeddings[0].length}` },
        { status: 500 }
      )
    }

    // PASO 4: Eliminar chunks anteriores del mismo archivo (mantener versiones)
    // Nota: No eliminamos, mantenemos historial (opción B)
    
    // PASO 5: Insertar chunks en vector_documents
    console.log(`[DB] Inserting ${chunks.length} chunks into vector_documents...`)

    const insertPromises = chunks.map(async (chunk, index) => {
      const metadata = createChunkMetadata(
        file.name,
        index,
        chunks.length,
        projectId,
        user.id,
        file.type
      )

      const { error } = await supabase.from('vector_documents').insert({
        content: chunk,
        metadata: metadata,
        embedding: JSON.stringify(embeddings[index]), // pgvector acepta array como string
      })

      if (error) {
        console.error(`[DB] Error inserting chunk ${index}:`, error)
        throw error
      }
    })

    await Promise.all(insertPromises)

    console.log(`[SUCCESS] Document processed successfully: ${file.name}`)

    // También registrar en project_files para referencia
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `${user.id}/${projectId}/${fileName}`

    // Subir a Storage (opcional, para respaldo)
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.warn('[STORAGE] Warning: Could not upload to storage:', uploadError)
      // No fallar la operación si el storage falla
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      chunks: chunks.length,
      message: `Documento procesado exitosamente. ${chunks.length} fragmentos indexados.`,
    }, { status: 200 })

  } catch (error) {
    console.error('[ERROR] Error processing document:', error)
    return NextResponse.json(
      {
        error: 'Error al procesar el documento',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
