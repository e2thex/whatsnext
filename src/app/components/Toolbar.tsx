'use client'

import { useState, useRef, useEffect } from 'react'

type ViewMode = 'tree' | 'list'
type CompletionFilter = 'all' | 'todo' | 'done'
type BlockingFilter = 'any' | 'actionable' | 'blocked'

export const Toolbar = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all')
  const [blockingFilter, setBlockingFilter] = useState<BlockingFilter>('any')
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false)
      }
    }

    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFilterMenuOpen])

  return (
    <div className="w-full bg-white shadow-sm p-4 space-y-4">
      {/* Top Row - View Mode, Search, and Mobile Filter Button */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md ${
                viewMode === 'tree'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks... (Press / to focus)"
              className="block w-full rounded-md border-gray-300 pl-3 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <span className="text-gray-400 hover:text-gray-500">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filter Button */}
        <div className="sm:hidden flex items-center">
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-2">Filters</span>
          </button>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden sm:flex flex-col sm:flex-row gap-4">
        {/* Completion Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</span>
          <div className="flex rounded-md shadow-sm">
            {(['all', 'todo', 'done'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setCompletionFilter(filter)}
                className={`px-3 py-2 text-sm font-medium ${
                  completionFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${
                  filter === 'all'
                    ? 'rounded-l-md'
                    : filter === 'done'
                    ? 'rounded-r-md'
                    : ''
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Blocking Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Blocking:</span>
          <div className="flex rounded-md shadow-sm">
            {(['any', 'actionable', 'blocked'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setBlockingFilter(filter)}
                className={`px-3 py-2 text-sm font-medium ${
                  blockingFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${
                  filter === 'any'
                    ? 'rounded-l-md'
                    : filter === 'blocked'
                    ? 'rounded-r-md'
                    : ''
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Menu */}
      {isFilterMenuOpen && (
        <div
          ref={filterMenuRef}
          className="sm:hidden absolute z-10 mt-2 w-full bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
        >
          <div className="py-1 space-y-2 px-4">
            {/* Completion Status Filter */}
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <div className="flex rounded-md shadow-sm">
                {(['all', 'todo', 'done'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setCompletionFilter(filter)
                      setIsFilterMenuOpen(false)
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${
                      completionFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } ${
                      filter === 'all'
                        ? 'rounded-l-md'
                        : filter === 'done'
                        ? 'rounded-r-md'
                        : ''
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocking Status Filter */}
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Blocking</span>
              <div className="flex rounded-md shadow-sm">
                {(['any', 'actionable', 'blocked'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setBlockingFilter(filter)
                      setIsFilterMenuOpen(false)
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${
                      blockingFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } ${
                      filter === 'any'
                        ? 'rounded-l-md'
                        : filter === 'blocked'
                        ? 'rounded-r-md'
                        : ''
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row - Add Task */}
      <div className="flex justify-end">
        <button
          onClick={() => console.log('Add task clicked')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Task
        </button>
      </div>
    </div>
  )
} 