import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Alias route to support redirect URIs that point to /auth/callback.
 * This preserves query params and redirects to our API callback handler
 * at /api/auth/callback which does the server-side exchange and cookie setting.
 */
export function GET(request: NextRequest) {
  try {
    const incoming = new URL(request.url)
    const target = new URL('/api/auth/callback', incoming.origin)
    // preserve search params (code, state, next, etc.)
    target.search = incoming.search
    return NextResponse.redirect(target)
  } catch (err) {
    console.error('Alias /auth/callback redirect error:', err)
    return NextResponse.redirect(new URL('/error', request.url))
  }
}
