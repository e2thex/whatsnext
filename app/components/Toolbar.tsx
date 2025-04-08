import { useEffect, useRef } from 'react'

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
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>

      {/* Center section with visual controls */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
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
            <svg className="w-5 h-5 mr-1 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M9 4v16M3 12h6M3 20h6M15 12h6M15 20h6" />
            </svg>
            <span className="hidden sm:inline">Tree</span>
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
            <svg className="w-5 h-5 mr-1 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">List</span>
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
            <span className="hidden sm:inline">Todo</span>
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
            <span className="hidden sm:inline">Done</span>
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
            <span>Any</span>
          </button>
          <button
            onClick={() => toggleStatus('actionable')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              currentStatusFilter === 'actionable' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show only actionable tasks"
            title="Show only actionable tasks"
          >
            <span className="w-2 h-2 rounded-full mr-2 bg-green-500"></span>
            <span className="hidden sm:inline">Actionable</span>
            <span className="sm:hidden">Action</span>
          </button>
          <button
            onClick={() => toggleStatus('blocked')}
            className={`px-3 py-1.5 flex items-center text-sm ${
              currentStatusFilter === 'blocked' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Show only blocked tasks"
            title="Show only blocked tasks"
          >
            <span className="w-2 h-2 rounded-full mr-2 bg-red-500"></span>
            <span className="hidden sm:inline">Blocked</span>
            <span className="sm:hidden">Block</span>
          </button>
        </div>
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
          placeholder="Search tasks... (Press '/' to focus)"
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