'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type FilterState = {
  viewMode: 'list' | 'tree'
  completion: 'all' | 'todo' | 'done'
  search: string
}

interface FilterContextType {
  filter: FilterState
  updateFilter: (updates: Partial<FilterState>) => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>({
    viewMode: 'list',
    completion: 'all',
    search: '',
  })

  const updateFilter = (updates: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...updates }))
  }

  return (
    <FilterContext.Provider value={{ filter, updateFilter }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider')
  }
  return context
} 