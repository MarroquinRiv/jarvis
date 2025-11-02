import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { deleteFile } from '@/lib/projects'

export async function DELETE(
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
    await deleteFile(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el archivo' },
      { status: 500 }
    )
  }
}
