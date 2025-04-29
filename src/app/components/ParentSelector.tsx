import { useState, useEffect, useRef, HTMLAttributes, ReactNode } from 'react'
import { Task } from '../services/tasks'
import type { ParentSelectorElement } from '../types/slate-elements'

interface ParentSelectorProps {
  element: ParentSelectorElement
  attributes: HTMLAttributes<HTMLDivElement>
  children: ReactNode
  tasks: Task[]
  onSelect: (task: Task) => void
}

export const ParentSelector = ({ attributes, children, tasks, onSelect }: ParentSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      })
    }
  }, [])

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div
      {...attributes}
      ref={ref}
      className="inline-block"
    >
      <div
        contentEditable={false}
        className="inline-block bg-gray-100 text-gray-800 rounded-full px-2 py-0.5 text-sm font-medium mr-1"
      >
        ^
      </div>
      {children}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-64 rounded-md bg-white shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          <div className="p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border p-1 text-sm"
              placeholder="Search tasks..."
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredTasks.map(task => (
              <button
                key={task.id}
                onClick={() => {
                  onSelect(task)
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 