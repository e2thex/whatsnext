import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Don't initialize Supabase at the module level to avoid build errors
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are not available')
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    // Get environment variables or return error
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { message: 'Server configuration error' },
        { status: 500 }
      )
    }
    
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
    
    // Initialize Supabase only when handling the request
    const supabase = getSupabaseClient()

    // Sign up the user with redirect URL
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${siteUrl}/login?verified=true`,
      },
    })

    if (error) {
      console.error('Error signing up user:', error)
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

    // Check if the user was created successfully
    if (!data.user) {
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      userId: data.user.id,
      message: 'Please check your email for confirmation link'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 