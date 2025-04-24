'use client'

import { useState } from 'react'
import { useFilter } from '../contexts/FilterContext'

export const Toolbar = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const { filter, updateFilter } = useFilter()

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between space-x-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateFilter({ viewMode: 'list' })}
            className={`px-3 py-1 rounded-md ${
              filter.viewMode === 'list'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            List
          </button>
          <button
            onClick={() => updateFilter({ viewMode: 'tree' })}
            className={`px-3 py-1 rounded-md ${
              filter.viewMode === 'tree'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tree
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateFilter({ completion: 'all' })}
            className={`px-3 py-1 rounded-md ${
              filter.completion === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => updateFilter({ completion: 'todo' })}
            className={`px-3 py-1 rounded-md ${
              filter.completion === 'todo'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => updateFilter({ completion: 'done' })}
            className={`px-3 py-1 rounded-md ${
              filter.completion === 'done'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Done
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateFilter({ blocking: 'all' })}
            className={`px-3 py-1 rounded-md ${
              filter.blocking === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Any
          </button>
          <button
            onClick={() => updateFilter({ blocking: 'actionable' })}
            className={`px-3 py-1 rounded-md ${
              filter.blocking === 'actionable'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Actionable
          </button>
          <button
            onClick={() => updateFilter({ blocking: 'blocked' })}
            className={`px-3 py-1 rounded-md ${
              filter.blocking === 'blocked'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Blocked
          </button>
          <button
            onClick={() => updateFilter({ blocking: 'blocking' })}
            className={`px-3 py-1 rounded-md ${
              filter.blocking === 'blocking'
                ? 'bg-yellow-100 text-yellow-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Blocking
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          value={filter.search}
          onChange={(e) => updateFilter({ search: e.target.value })}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search tasks..."
          className={`pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isSearchFocused ? 'border-indigo-500' : 'border-gray-300'
          }`}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  )
} 