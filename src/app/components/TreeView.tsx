'use client'

import { useState, useEffect } from 'react'
import { useFilter } from '../contexts/FilterContext'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { TaskItem } from './TaskItem'
import { Task } from '../services/tasks'
import { getDefaultIsExpanded, taskOrDescendantsMatchFilter } from '../utils/taskUtils'

interface TreeViewProps {
  tasks: Task[]
}

interface TreeNodeProps {
  task: Task
  level?: number
  tasks: Task[]
}

const TreeNode = ({ task, level = 0, tasks }: TreeNodeProps) => {
  const { filter } = useFilter();
  const children = tasks.filter((t) => t.parent_id === task.id)
  const defaultisExpanded = getDefaultIsExpanded(filter, task)
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | null>(null)
  const isExpanded = localIsExpanded === null ? defaultisExpanded : localIsExpanded
  const setIsExpanded = (value: boolean | null) => {
    setLocalIsExpanded(value)
  }

  // Reset localIsExpanded when filter changes
  useEffect(() => {
    setLocalIsExpanded(null)
  }, [filter])

  // Apply filters
  if (!taskOrDescendantsMatchFilter(task, tasks, filter)) return null

  return (
    <div key={task.id} className="pl-4">
      <div className="flex items-center py-2">
        <div className="flex items-center">
          {level > 0 && (
            <div className="w-4 h-px bg-gray-300 mr-2" />
          )}
          {children.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
          {children.length === 0 && <div className="w-4" />}
        </div>
        <div className="flex-1">
          <TaskItem 
            task={task}
            showParentHierarchy={false}
            className="flex-1"
          />
        </div>
      </div>
      {isExpanded && children.map((child) => (
        <TreeNode 
          key={child.id}
          task={child}
          level={level + 1}
          tasks={tasks}
        />
      ))}
    </div>
  )
}

export const TreeView = ({ tasks }: TreeViewProps) => {
  const { filter, updateFilter } = useFilter()

  // Get focused item and its hierarchy
  const focusedItem = filter.focusedItemId ? tasks.find(task => task.id === filter.focusedItemId) : null
  const focusedItemHierarchy = focusedItem ? (() => {
    const hierarchy: Task[] = []
    let currentItem = focusedItem
    while (currentItem.parent_id) {
      const parent = tasks.find(t => t.id === currentItem.parent_id)
      if (parent) {
        hierarchy.unshift(parent)
        currentItem = parent
      } else {
        break
      }
    }
    return hierarchy
  })() : []

  return (
    <div className="w-full">
      {focusedItem && (
        <div className="mb-4 flex items-center">
          <button
            onClick={() => updateFilter({ focusedItemId: null })}
            className="mr-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
            title="Exit focus mode"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center text-sm text-gray-500">
            {focusedItemHierarchy.map((item, index) => (
              <span key={item.id} className="flex items-center">
                {index > 0 && <span className="mx-1">/</span>}
                <button
                  onClick={() => updateFilter({ focusedItemId: item.id })}
                  className="hover:text-indigo-600"
                >
                  {item.title}
                </button>
              </span>
            ))}
            <span className="mx-1">/</span>
            <span className="font-medium text-gray-900">{focusedItem.title}</span>
          </div>
        </div>
      )}

      {tasks
        .filter((task) => !task.parent_id)
        .map((task) => (
          <TreeNode 
            key={task.id}
            task={task}
            tasks={tasks}
          />
        ))}
    </div>
  )
} 