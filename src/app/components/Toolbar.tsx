'use client'

import { useState } from 'react'
import { useFilter } from '../contexts/FilterContext'
import {
  ListBulletIcon,
  QueueListIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline'

export const Toolbar = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const { filter, updateFilter } = useFilter()

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between space-x-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateFilter({ viewMode: 'list' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.viewMode === 'list'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ListBulletIcon className="h-5 w-5" />
            <span className="hidden xl:inline">List</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              List View
            </span>
          </button>
          <button
            onClick={() => updateFilter({ viewMode: 'tree' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.viewMode === 'tree'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <QueueListIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Tree</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Tree View
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateFilter({ completion: 'all' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.completion === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CircleStackIcon className="h-5 w-5" />
            <span className="hidden xl:inline">All</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              All Tasks
            </span>
          </button>
          <button
            onClick={() => updateFilter({ completion: 'todo' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.completion === 'todo'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ClockIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Todo</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Todo Tasks
            </span>
          </button>
          <button
            onClick={() => updateFilter({ completion: 'done' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.completion === 'done'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Done</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Completed Tasks
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateFilter({ blocking: 'all' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.blocking === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Any</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Any Status
            </span>
          </button>
          <button
            onClick={() => updateFilter({ blocking: 'actionable' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.blocking === 'actionable'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Actionable</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Actionable Tasks
            </span>
          </button>
          <button
            onClick={() => updateFilter({ blocking: 'blocked' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.blocking === 'blocked'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <NoSymbolIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Blocked</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Blocked Tasks
            </span>
          </button>
          <button
            onClick={() => updateFilter({ blocking: 'blocking' })}
            className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
              filter.blocking === 'blocking'
                ? 'bg-yellow-100 text-yellow-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowUturnLeftIcon className="h-5 w-5" />
            <span className="hidden xl:inline">Blocking</span>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Blocking Tasks
            </span>
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
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  )
} 