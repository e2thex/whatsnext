'use client'

import { Toolbar } from './components/Toolbar'
import { ItemList } from './components/ItemList'
import { FilterProvider } from './contexts/FilterContext'

export default function Home() {
  return (
    <FilterProvider>
      <main className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10">
          <Toolbar />
        </div>
        <div className="container mx-auto px-4 py-8">
          <ItemList />
        </div>
      </main>
    </FilterProvider>
  )
} 