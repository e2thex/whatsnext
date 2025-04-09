import { useEffect, useRef, useState } from 'react'

interface ToolbarProps {
  viewMode: 'tree' | 'list'
  onViewModeChange: (mode: 'tree' | 'list') => void
  showOnlyActionable: boolean
  onActionableChange: (show: boolean) => void
  showOnlyBlocked: boolean
  onBlockedChange: (show: boolean) => void
  completionFilter: 'all' | 'completed' | 'not-completed'
  onCompletionFilterChange: (filter: 'all' | 'completed' | 'not-completed') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onAddNewTask: () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  showOnlyActionable,
  onActionableChange,
  showOnlyBlocked,
  onBlockedChange,
  completionFilter,
  onCompletionFilterChange,
  searchQuery,
  onSearchChange,
  onAddNewTask
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)

  // Focus search input when pressing / key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Handle clicks outside the filter menu to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false)
      }
    }

    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterMenuOpen])

  // Clear search with Escape key when search is focused
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && searchQuery) {
      e.preventDefault()
      onSearchChange('')
    }
  }

  // Toggle status filters (actionable/blocked) ensuring they're mutually exclusive
  const toggleStatus = (status: 'all' | 'actionable' | 'blocked') => {
    if (status === 'all') {
      onActionableChange(false)
      onBlockedChange(false)
    } else if (status === 'actionable') {
      onActionableChange(true)
      onBlockedChange(false)
    } else if (status === 'blocked') {
      onActionableChange(false)
      onBlockedChange(true)
    }
  }

  // Determine current status filter state
  const currentStatusFilter = showOnlyActionable 
    ? 'actionable' 
    : showOnlyBlocked 
      ? 'blocked' 
      : 'all'

  const getFilterSummary = () => {
    const summary = []
    
    if (completionFilter !== 'all') {
      summary.push(completionFilter === 'completed' ? 'Done' : 'Todo')
    }
    
    if (currentStatusFilter !== 'all') {
      summary.push(currentStatusFilter === 'actionable' ? 'Actionable' : 'Blocked')
    }
    
    return summary.length ? summary.join(', ') : 'All'
  }

  // Render filter options for the dropdown menu
  const renderFilterOptions = () => (
    <>
      {/* View mode options */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">View</h3>
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => onViewModeChange('tree')}
            className={`flex-1 px-3 py-2 flex items-center justify-center text-sm ${
              viewMode === 'tree' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M9 4v16M3 12h6M3 20h6M15 12h6M15 20h6" />
            </svg>
            Tree
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`flex-1 px-3 py-2 flex items-center justify-center text-sm ${
              viewMode === 'list' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            List
          </button>
        </div>
      </div>

      {/* Completion filter options */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Completion</h3>
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => {
              onCompletionFilterChange('all')
              setFilterMenuOpen(false)
            }}
            className={`px-3 py-2 flex items-center text-sm rounded-md ${
              completionFilter === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            All tasks
          </button>
          <button
            onClick={() => {
              onCompletionFilterChange('not-completed')
              setFilterMenuOpen(false)
            }}
            className={`px-3 py-2 flex items-center text-sm rounded-md ${
              completionFilter === 'not-completed' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
            </svg>
            Todo
          </button>
          <button
            onClick={() => {
              onCompletionFilterChange('completed')
              setFilterMenuOpen(false)
            }}
            className={`px-3 py-2 flex items-center text-sm rounded-md ${
              completionFilter === 'completed' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="14" height="14" rx="2" strokeWidth="2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 10l3 3 5-5" />
            </svg>
            Done
          </button>
        </div>
      </div>

      {/* Status filter options */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => {
              toggleStatus('all')
              setFilterMenuOpen(false)
            }}
            className={`px-3 py-2 flex items-center text-sm rounded-md ${
              currentStatusFilter === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Any status
          </button>
          <button
            onClick={() => {
              toggleStatus('actionable')
              setFilterMenuOpen(false)
            }}
            className={`px-3 py-2 flex items-center text-sm rounded-md ${
              currentStatusFilter === 'actionable' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2 bg-green-500"></span>
            Actionable
          </button>
          <button
            onClick={() => {
              toggleStatus('blocked')
              setFilterMenuOpen(false)
            }}
            className={`px-3 py-2 flex items-center text-sm rounded-md ${
              currentStatusFilter === 'blocked' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <span className="w-3 h-3 rounded-full mr-2 bg-red-500"></span>
            Blocked
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
      {/* Left section with Add Task button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddNewTask}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Add new task"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden xl:inline">Add Task</span>
        </button>
      </div>

      {/* Center section with visual controls - Only visible on medium+ screens */}
      <div className="hidden md:flex items-center gap-3 md:gap-4 flex-wrap justify-center">
        {/* View mode toggle button */}
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => onViewModeChange('tree')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              viewMode === 'tree' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Tree view"
            title="Tree view"
          >
            <svg className="w-5 h-5 mr-1 md:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M9 4v16M3 12h6M3 20h6M15 12h6M15 20h6" />
            </svg>
            <span className="hidden xl:inline">Tree</span>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              viewMode === 'list' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="List view"
            title="List view"
          >
            <svg className="w-5 h-5 mr-1 md:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden xl:inline">List</span>
          </button>
        </div>

        {/* Completion filter segmented control */}
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => onCompletionFilterChange('all')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              completionFilter === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show all tasks"
            title="Show all tasks"
          >
            <span>All</span>
          </button>
          <button
            onClick={() => onCompletionFilterChange('not-completed')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              completionFilter === 'not-completed' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show incomplete tasks"
            title="Show incomplete tasks"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
            </svg>
            <span className="hidden xl:inline">Todo</span>
          </button>
          <button
            onClick={() => onCompletionFilterChange('completed')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              completionFilter === 'completed' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show completed tasks"
            title="Show completed tasks"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="14" height="14" rx="2" strokeWidth="2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 10l3 3 5-5" />
            </svg>
            <span className="hidden xl:inline">Done</span>
          </button>
        </div>

        {/* Status filter segmented control */}
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => toggleStatus('all')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              currentStatusFilter === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show all tasks"
            title="Show tasks with any status"
          >
            <span className="md:inline hidden">Any</span>
          </button>
          <button
            onClick={() => toggleStatus('actionable')}
            className={`px-3 py-1.5 flex items-center justify-center text-sm ${
              currentStatusFilter === 'actionable' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show only actionable tasks"
            title="Show only actionable tasks"
          >
            <span className="w-3 h-3 rounded-full md:mr-2 bg-green-500"></span>
            <span className="hidden xl:inline">Actionable</span>
          </button>
          <button
            onClick={() => toggleStatus('blocked')}
            className={`px-3 py-1.5 flex items-center justify-center text-sm ${
              currentStatusFilter === 'blocked' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show only blocked tasks"
            title="Show only blocked tasks"
          >
            <span className="w-3 h-3 rounded-full md:mr-2 bg-red-500"></span>
            <span className="hidden xl:inline">Blocked</span>
          </button>
        </div>
      </div>

      {/* Filter button for small screens */}
      <div className="relative md:hidden">
        <button
          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          className={`flex items-center justify-center px-3 py-1.5 border rounded-md ${
            filterMenuOpen || completionFilter !== 'all' || currentStatusFilter !== 'all'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          aria-expanded={filterMenuOpen}
          aria-haspopup="true"
        >
          <svg className="w-5 h-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">Filter</span>
          {(completionFilter !== 'all' || currentStatusFilter !== 'all') && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-25">
              {getFilterSummary()}
            </span>
          )}
        </button>

        {/* Filter dropdown for small screens */}
        {filterMenuOpen && (
          <div 
            ref={filterMenuRef}
            className="absolute left-0 mt-2 w-64 origin-top-left bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          >
            <div className="px-4 py-3 space-y-4">
              {renderFilterOptions()}
            </div>
          </div>
        )}
      </div>

      {/* Right section - Search */}
      <div className="relative w-full sm:w-64 md:w-80 mt-2 sm:mt-0 ml-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search... (/)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          aria-label="Search tasks"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
} 