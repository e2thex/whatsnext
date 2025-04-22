'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: ''
  })

  const validateForm = () => {
    let isValid = true
    const newErrors = { name: '', email: '', password: '' }
    
    if (formData.name.length < 2) {
      newErrors.name = 'Username must be at least 2 characters.'
      isValid = false
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.'
      isValid = false
    }
    
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
      isValid = false
    }
    
    setErrors(newErrors)
    return isValid
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Something went wrong')
      }

      router.push('/signup-success')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container relative flex flex-col items-center justify-center min-h-screen">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your information below to create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john.doe@example.com"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>
          
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline text-indigo-600 hover:text-indigo-800">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
} 