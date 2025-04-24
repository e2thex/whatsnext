'use client'

import { useState, useEffect, useRef } from 'react'
import { Task } from '../services/tasks'

interface MentionDropdownProps {
  tasks: Task[]
  onSelect: (task: Task) => void
  position: { top: number; left: number }
  onClose: () => void
}

export const MentionDropdown = ({ tasks, onSelect, position, onClose }: MentionDropdownProps) => {
  const [filteredTasks, setFilteredTasks] = useState(tasks)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

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
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredTasks, selectedIndex, onSelect, onClose])

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-64 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto mention-dropdown"
      style={{ top: position.top, left: position.left }}
    >
      {filteredTasks.map((task, index) => (
        <button
          key={task.id}
          onClick={() => onSelect(task)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
            index === selectedIndex ? 'bg-gray-100' : ''
          }`}
        >
          <div className="flex items-center">
            <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </span>
          </div>
        </button>
      ))}
      {filteredTasks.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-500">No tasks found</div>
      )}
    </div>
  )
} 