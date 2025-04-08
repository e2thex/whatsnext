'use client'

import { usePathname } from 'next/navigation'
import { LogoutButton } from './LogoutButton'

export const AuthHeader = () => {
  const pathname = usePathname()
  
  // Don't show header on login, signup, or signup-success pages
  const isAuthPage = pathname === '/login' || 
                     pathname === '/signup' || 
                     pathname === '/signup-success'
  
  if (isAuthPage) {
    return null
  }
  
  return (
    <header className="w-full py-4 px-6 flex justify-between items-center border-b">
      <div className="font-bold text-xl">WhatsNext</div>
      <LogoutButton />
    </header>
  )
} 