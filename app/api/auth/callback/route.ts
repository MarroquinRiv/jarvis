import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * OAuth callback route. Exchanges provider code for a session server-side
 * and sets httpOnly cookies so SSR can access the session.
 *
 * Expected usage: provider will redirect back to
 * /api/auth/callback?code=...&state=...&next=/protected
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    console.error('No code provided in callback')
    return NextResponse.redirect(`${origin}/error`)
  }

  // Create response object that we'll build throughout the request
  const redirectResponse = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          // Set cookie on both request and response
          request.cookies.set({ name, value, ...options })
          redirectResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          // Remove cookie from both request and response
          request.cookies.set({ name, value: '', ...options })
          redirectResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(`${origin}/error`)
    }

    // Verify the session was created
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user after exchange:', userError)
      return NextResponse.redirect(`${origin}/error`)
    }

    console.log('✅ User authenticated successfully:', user.email)

    // Ensure profile exists in database
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email!)
        .single()

      if (!existing) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
          email: user.email,
        })
        
        if (insertError) {
          console.warn('Profile insert warning (may be handled by trigger):', insertError.message)
        } else {
          console.log('✅ Profile created for user:', user.email)
        }
      }
    } catch (profileErr) {
      console.warn('Error checking/creating profile:', profileErr)
      // Don't fail the auth flow if profile creation fails
    }

    // Return the redirect response with cookies set
    return redirectResponse
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${origin}/error`)
  }
}
