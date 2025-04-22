'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/client'
import { useFilter } from '../contexts/FilterContext'

type Task = Database['public']['Tables']['items']['Row']

interface TreeViewProps {
  tasks: Task[]
}

export const TreeView = ({ tasks }: TreeViewProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const { filter } = useFilter()

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const renderNode = (task: Task, level: number = 0) => {
    const children = tasks.filter((t) => t.parent_id === task.id)
    const isExpanded = expandedNodes.has(task.id)

    return (
      <div key={task.id} className="pl-4">
        <div className="flex items-center py-2">
          <div className="flex items-center">
            {level > 0 && (
              <div className="w-4 h-px bg-gray-300 mr-2" />
            )}
            {children.length > 0 && (
              <button
                onClick={() => toggleNode(task.id)}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}
            {children.length === 0 && <div className="w-4" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={task.completed}
                readOnly
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <span className={`ml-2 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </span>
            </div>
          </div>
        </div>
        {isExpanded && children.map((child) => renderNode(child, level + 1))}
      </div>
    )
  }

  const rootTasks = tasks.filter((task) => !task.parent_id)
  const filteredRootTasks = rootTasks.filter((task) => {
    if (filter.completion === 'todo' && task.completed) return false
    if (filter.completion === 'done' && !task.completed) return false
    if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="w-full">
      {filteredRootTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tasks found</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredRootTasks.map((task) => renderNode(task))}
        </div>
      )}
    </div>
  )
} 