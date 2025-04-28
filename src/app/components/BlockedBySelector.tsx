import { useState, useEffect, useRef } from 'react'
import { Task } from '../services/tasks'
import type { BlockedBySelectorElement } from '../types/slate-elements'

interface BlockedBySelectorProps {
  element: BlockedBySelectorElement
  attributes: any
  children: any
  tasks: Task[]
  onSelect: (task: Task) => void
}

export const BlockedBySelector = ({ element, attributes, children, tasks, onSelect }: BlockedBySelectorProps) => {
  const [showDropdown, setShowDropdown] = useState(true)
  const [filteredTasks, setFilteredTasks] = useState(tasks)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const filtered = tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredTasks(filtered)
    setSelectedIndex(0)
  }, [tasks, searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredTasks.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredTasks[selectedIndex]) {
          onSelect(filteredTasks[selectedIndex])
          setShowDropdown(false)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowDropdown(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredTasks, selectedIndex, onSelect])

  return (
    <span {...attributes} contentEditable={false}>
      <span className="inline-flex items-center bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-sm font-medium mr-1">
        @
        {showDropdown && (
          <span
            ref={dropdownRef}
            className="absolute z-50 w-64 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
            style={{ top: '100%', left: 0 }}
          >
            <span className="p-2 border-b border-gray-200">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search tasks..."
              />
            </span>
            <span className="max-h-48 overflow-y-auto">
              {filteredTasks.map((task, index) => (
                <button
                  key={task.id}
                  onClick={() => {
                    onSelect(task)
                    setShowDropdown(false)
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  }`}
                >
                  <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </span>
                </button>
              ))}
              {filteredTasks.length === 0 && (
                <span className="px-3 py-2 text-sm text-gray-500">No tasks found</span>
              )}
            </span>
          </span>
        )}
      </span>
      {children}
    </span>
  )
} 