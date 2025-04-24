'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export type FilterState = {
  viewMode: 'list' | 'tree'
  completion: 'all' | 'todo' | 'done'
  blocking: 'all' | 'blocked' | 'actionable' | 'blocking'
  search: string
  focusedItemId: string | null
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
    blocking: 'all',
    search: '',
    focusedItemId: null,
  })

  useEffect(() => {
    const savedViewMode = localStorage.getItem('viewMode')
    if (savedViewMode === 'list' || savedViewMode === 'tree') {
      setFilter(prev => ({ ...prev, viewMode: savedViewMode }))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('viewMode', filter.viewMode)
  }, [filter.viewMode])

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