'use client'

import { Toolbar } from './components/Toolbar'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Toolbar />
      <div className="container mx-auto px-4 py-8">
        {/* Task list will go here */}
      </div>
    </main>
  )
} 