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
import typeIcons from './typeIcons'

type FilterOption = {
  value: string
  label: string
  icon: React.ReactNode
  color?: string
}

type FilterGroup = {
  title: string
  type: string
  options: FilterOption[]
}

const filterGroups: FilterGroup[] = [
  {
    title: 'View Mode',
    type: 'viewMode',
    options: [
      { value: 'list', label: 'List View', icon: <ListBulletIcon className="h-5 w-5" /> },
      { value: 'tree', label: 'Tree View', icon: <QueueListIcon className="h-5 w-5" /> }
    ]
  },
  {
    title: 'Completion',
    type: 'completion',
    options: [
      { value: 'all', label: 'All Tasks', icon: <CircleStackIcon className="h-5 w-5" /> },
      { value: 'todo', label: 'Todo Tasks', icon: <ClockIcon className="h-5 w-5" /> },
      { value: 'done', label: 'Completed Tasks', icon: <CheckCircleIcon className="h-5 w-5" /> }
    ]
  },
  {
    title: 'Blocking Status',
    type: 'blocking',
    options: [
      { value: 'all', label: 'Any Status', icon: <ArrowPathIcon className="h-5 w-5" /> },
      { value: 'actionable', label: 'Actionable Tasks', icon: <CheckCircleIcon className="h-5 w-5" />, color: 'green' },
      { value: 'blocked', label: 'Blocked Tasks', icon: <NoSymbolIcon className="h-5 w-5" />, color: 'red' },
      { value: 'blocking', label: 'Blocking Tasks', icon: <ArrowUturnLeftIcon className="h-5 w-5" />, color: 'yellow' }
    ]
  },
  {
    title: 'Task Type',
    type: 'type',
    options: [
      { value: 'all', label: 'All Types', icon: <CircleStackIcon className="h-5 w-5" /> },
      { value: 'Task', label: 'Tasks', icon: typeIcons.Task, color: 'blue' },
      { value: 'Mission', label: 'Missions', icon: typeIcons.Mission, color: 'green' },
      { value: 'Objective', label: 'Objectives', icon: typeIcons.Objective, color: 'purple' },
      { value: 'Ambition', label: 'Ambitions', icon: typeIcons.Ambition, color: 'red' }
    ]
  }
]

const FilterButton = ({ 
  type, 
  option,
  showLabel = true
}: { 
  type: string, 
  option: FilterOption,
  showLabel?: boolean
}) => {
  const { filter, updateFilter } = useFilter()
  const isActive = filter[type as keyof typeof filter] === option.value

  return (
    <button
      onClick={() => updateFilter({ [type]: option.value })}
      className={`px-3 py-1 rounded-md flex items-center space-x-2 ${
        isActive ? `bg-${option.color || 'indigo'}-100 text-${option.color || 'indigo'}-700` : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {option.icon}
      {showLabel && <span>{option.label.replace(' Tasks', '').replace(' View', '')}</span>}
    </button>
  )
}

const FilterDropdown = ({ 
  group,
  currentValue,
  showLabel = false
}: { 
  group: FilterGroup,
  currentValue: string,
  showLabel?: boolean
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const { updateFilter } = useFilter()
  const isOpen = activeDropdown === group.type
  const currentOption = group.options.find(opt => opt.value === currentValue)

  const handleFilterChange = (value: string) => {
    updateFilter({ [group.type]: value })
    setActiveDropdown(null)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setActiveDropdown(isOpen ? null : group.type)}
        className={`px-3 py-1 rounded-md flex items-center space-x-2 group relative ${
          isOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {currentOption?.icon}
        {showLabel && <span>{currentOption?.label}</span>}
        <ChevronDownIcon className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {group.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
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

const MobileMenu = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { filter, updateFilter } = useFilter()

  const handleFilterChange = (type: string, value: string) => {
    updateFilter({ [type]: value })
    setIsDropdownOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="p-2 rounded-md hover:bg-gray-100"
      >
        <FunnelIcon className="h-6 w-6 text-gray-600" />
      </button>
      
      {isDropdownOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {filterGroups.map((group) => (
              <div key={group.type}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500">{group.title}</div>
                {group.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(group.type, option.value)}
                    className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                      filter[group.type as keyof typeof filter] === option.value 
                        ? `bg-${option.color || 'indigo'}-50 text-${option.color || 'indigo'}-700` 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const Toolbar = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const { filter, updateFilter } = useFilter()

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between space-x-4">
      {/* XL View - No Dropdowns */}
      <div className="hidden xl:flex items-center space-x-4">
        {filterGroups.map((group) => (
          <div key={group.type} className="flex items-center space-x-2">
            {group.options.map((option) => (
              <FilterButton
                key={option.value}
                type={group.type}
                option={option}
              />
            ))}
          </div>
        ))}
      </div>

      {/* LG View - Dropdowns with Icons and Text */}
      <div className="hidden lg:flex xl:hidden items-center space-x-4">
        {filterGroups.map((group) => (
          <div key={group.type} className="flex items-center space-x-2">
            <FilterDropdown
              group={group}
              currentValue={filter[group.type as keyof typeof filter] as string}
              showLabel={true}
            />
          </div>
        ))}
      </div>

      {/* MD View - Dropdowns with Icons Only */}
      <div className="hidden md:flex lg:hidden items-center space-x-4">
        {filterGroups.map((group) => (
          <div key={group.type} className="flex items-center space-x-2">
            <FilterDropdown
              group={group}
              currentValue={filter[group.type as keyof typeof filter] as string}
              showLabel={false}
            />
          </div>
        ))}
      </div>

      {/* SM View - Single Menu */}
      <div className="md:hidden">
        <MobileMenu />
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