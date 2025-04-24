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
  ArrowUturnLeftIcon,
  FunnelIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

export const Toolbar = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const { filter, updateFilter } = useFilter()

  const handleFilterChange = (type: string, value: string) => {
    updateFilter({ [type]: value })
    setIsDropdownOpen(false)
    setActiveDropdown(null)
  }

  const FilterDropdown = ({ 
    title, 
    type, 
    options, 
    currentValue 
  }: { 
    title: string, 
    type: string, 
    options: { value: string, label: string, icon: React.ReactNode, color?: string }[], 
    currentValue: string 
  }) => {
    const isOpen = activeDropdown === type
    const currentOption = options.find(opt => opt.value === currentValue)

    return (
      <div className="relative">
        <button
          onClick={() => setActiveDropdown(isOpen ? null : type)}
          className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
            isOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {currentOption?.icon}
          <span className="hidden lg:inline">{currentOption?.label}</span>
          <ChevronDownIcon className="h-4 w-4 hidden xl:inline" />
        </button>
        
        {isOpen && (
          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange(type, option.value)}
                  className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                    currentValue === option.value 
                      ? `bg-${option.color || 'indigo'}-50 text-${option.color || 'indigo'}-700` 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const FilterButton = ({ 
    type, 
    value, 
    icon, 
    label, 
    color = 'indigo' 
  }: { 
    type: string, 
    value: string, 
    icon: React.ReactNode, 
    label: string, 
    color?: string 
  }) => {
    const isActive = filter[type as keyof typeof filter] === value

    return (
      <button
        onClick={() => updateFilter({ [type]: value })}
        className={`px-3 py-1 rounded-md flex items-center space-x-2 ${
          isActive ? `bg-${color}-100 text-${color}-700` : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between space-x-4">
      {/* XL View - No Dropdowns */}
      <div className="hidden xl:flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FilterButton
            type="viewMode"
            value="list"
            icon={<ListBulletIcon className="h-5 w-5" />}
            label="List"
          />
          <FilterButton
            type="viewMode"
            value="tree"
            icon={<QueueListIcon className="h-5 w-5" />}
            label="Tree"
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterButton
            type="completion"
            value="all"
            icon={<CircleStackIcon className="h-5 w-5" />}
            label="All"
          />
          <FilterButton
            type="completion"
            value="todo"
            icon={<ClockIcon className="h-5 w-5" />}
            label="Todo"
          />
          <FilterButton
            type="completion"
            value="done"
            icon={<CheckCircleIcon className="h-5 w-5" />}
            label="Done"
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterButton
            type="blocking"
            value="all"
            icon={<ArrowPathIcon className="h-5 w-5" />}
            label="Any"
          />
          <FilterButton
            type="blocking"
            value="actionable"
            icon={<CheckCircleIcon className="h-5 w-5" />}
            label="Actionable"
            color="green"
          />
          <FilterButton
            type="blocking"
            value="blocked"
            icon={<NoSymbolIcon className="h-5 w-5" />}
            label="Blocked"
            color="red"
          />
          <FilterButton
            type="blocking"
            value="blocking"
            icon={<ArrowUturnLeftIcon className="h-5 w-5" />}
            label="Blocking"
            color="yellow"
          />
        </div>
      </div>

      {/* LG View - Dropdowns with Icons and Text */}
      <div className="hidden lg:flex xl:hidden items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FilterDropdown
            title="View Mode"
            type="viewMode"
            currentValue={filter.viewMode}
            options={[
              { value: 'list', label: 'List View', icon: <ListBulletIcon className="h-5 w-5" /> },
              { value: 'tree', label: 'Tree View', icon: <QueueListIcon className="h-5 w-5" /> }
            ]}
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterDropdown
            title="Completion"
            type="completion"
            currentValue={filter.completion}
            options={[
              { value: 'all', label: 'All Tasks', icon: <CircleStackIcon className="h-5 w-5" /> },
              { value: 'todo', label: 'Todo Tasks', icon: <ClockIcon className="h-5 w-5" /> },
              { value: 'done', label: 'Completed Tasks', icon: <CheckCircleIcon className="h-5 w-5" /> }
            ]}
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterDropdown
            title="Blocking Status"
            type="blocking"
            currentValue={filter.blocking}
            options={[
              { value: 'all', label: 'Any Status', icon: <ArrowPathIcon className="h-5 w-5" /> },
              { value: 'actionable', label: 'Actionable Tasks', icon: <CheckCircleIcon className="h-5 w-5" />, color: 'green' },
              { value: 'blocked', label: 'Blocked Tasks', icon: <NoSymbolIcon className="h-5 w-5" />, color: 'red' },
              { value: 'blocking', label: 'Blocking Tasks', icon: <ArrowUturnLeftIcon className="h-5 w-5" />, color: 'yellow' }
            ]}
          />
        </div>
      </div>

      {/* MD View - Dropdowns with Icons Only */}
      <div className="hidden md:flex lg:hidden items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FilterDropdown
            title="View Mode"
            type="viewMode"
            currentValue={filter.viewMode}
            options={[
              { value: 'list', label: 'List View', icon: <ListBulletIcon className="h-5 w-5" /> },
              { value: 'tree', label: 'Tree View', icon: <QueueListIcon className="h-5 w-5" /> }
            ]}
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterDropdown
            title="Completion"
            type="completion"
            currentValue={filter.completion}
            options={[
              { value: 'all', label: 'All Tasks', icon: <CircleStackIcon className="h-5 w-5" /> },
              { value: 'todo', label: 'Todo Tasks', icon: <ClockIcon className="h-5 w-5" /> },
              { value: 'done', label: 'Completed Tasks', icon: <CheckCircleIcon className="h-5 w-5" /> }
            ]}
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterDropdown
            title="Blocking Status"
            type="blocking"
            currentValue={filter.blocking}
            options={[
              { value: 'all', label: 'Any Status', icon: <ArrowPathIcon className="h-5 w-5" /> },
              { value: 'actionable', label: 'Actionable Tasks', icon: <CheckCircleIcon className="h-5 w-5" />, color: 'green' },
              { value: 'blocked', label: 'Blocked Tasks', icon: <NoSymbolIcon className="h-5 w-5" />, color: 'red' },
              { value: 'blocking', label: 'Blocking Tasks', icon: <ArrowUturnLeftIcon className="h-5 w-5" />, color: 'yellow' }
            ]}
          />
        </div>
      </div>

      {/* SM View - Single Menu */}
      <div className="md:hidden relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <FunnelIcon className="h-6 w-6 text-gray-600" />
        </button>
        
        {isDropdownOpen && (
          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {/* View Mode */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-500">View Mode</div>
              <button
                onClick={() => handleFilterChange('viewMode', 'list')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.viewMode === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => handleFilterChange('viewMode', 'tree')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.viewMode === 'tree' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <QueueListIcon className="h-5 w-5" />
                <span>Tree View</span>
              </button>

              {/* Completion Status */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-500">Completion</div>
              <button
                onClick={() => handleFilterChange('completion', 'all')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.completion === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CircleStackIcon className="h-5 w-5" />
                <span>All Tasks</span>
              </button>
              <button
                onClick={() => handleFilterChange('completion', 'todo')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.completion === 'todo' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ClockIcon className="h-5 w-5" />
                <span>Todo Tasks</span>
              </button>
              <button
                onClick={() => handleFilterChange('completion', 'done')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.completion === 'done' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>Completed Tasks</span>
              </button>

              {/* Blocking Status */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-500">Blocking Status</div>
              <button
                onClick={() => handleFilterChange('blocking', 'all')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.blocking === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ArrowPathIcon className="h-5 w-5" />
                <span>Any Status</span>
              </button>
              <button
                onClick={() => handleFilterChange('blocking', 'actionable')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.blocking === 'actionable' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>Actionable Tasks</span>
              </button>
              <button
                onClick={() => handleFilterChange('blocking', 'blocked')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.blocking === 'blocked' ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <NoSymbolIcon className="h-5 w-5" />
                <span>Blocked Tasks</span>
              </button>
              <button
                onClick={() => handleFilterChange('blocking', 'blocking')}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                  filter.blocking === 'blocking' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ArrowUturnLeftIcon className="h-5 w-5" />
                <span>Blocking Tasks</span>
              </button>
            </div>
          </div>
        )}
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