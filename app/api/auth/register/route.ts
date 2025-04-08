import { NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validate inputs
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Get the host from the request headers
    const host = request.headers.get('host') || ''
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    // Create the user with Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name },
      app_metadata: { role: 'user' },
      // Set the redirect URL to the production URL
      options: {
        email_confirm: true,
        data: { name },
        redirect_to: `${siteUrl}/login?verified=true`,
      },
    })

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 