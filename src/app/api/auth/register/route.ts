import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Don't need this function anymore since we're using the anon key client directly
// Removing to fix the unused variable error

export async function POST(request: Request) {
  try {
    console.log('Registration API called')
    
    // Log environment variable availability (not their values for security)
    console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing environment variables')
      return NextResponse.json(
        { message: 'Server configuration error: Missing environment variables' },
        { status: 500 }
      )
    }
    
    // Parse the request body, with error handling
    let name, email, password
    try {
      const body = await request.json()
      name = body.name
      email = body.email
      password = body.password
      console.log('Request body parsed successfully')
    } catch (e) {
      console.error('Error parsing request body:', e)
      return NextResponse.json(
        { message: 'Invalid request format' },
        { status: 400 }
      )
    }

    // Validate inputs
    if (!email || !password || !name) {
      console.log('Missing required fields:', { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasName: !!name 
      })
      return NextResponse.json(
        { message: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Get the site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    if (!siteUrl) {
      console.error('Missing NEXT_PUBLIC_SITE_URL environment variable')
      return NextResponse.json(
        { message: 'Server configuration error: Missing site URL' },
        { status: 500 }
      )
    }
    console.log('Using site URL:', siteUrl)
    
    // Create a client with the anon key for auth operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Create the client for auth operations
    const client = createClient(supabaseUrl, supabaseAnonKey)

    console.log('Attempting to sign up user with email:', email)
    // Sign up the user with redirect URL
    const { data, error } = await client.auth.signUp({
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
      console.error('No user data returned from signUp')
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 400 }
      )
    }

    console.log('User created successfully with ID:', data.user.id)
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