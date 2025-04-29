'use client'

import { useState, useEffect } from 'react'
import { useFilter } from '../contexts/FilterContext'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { DraggableTaskItem } from './DraggableTaskItem'
import { Task } from '../services/tasks'
import { getDefaultIsExpanded, taskOrDescendantsMatchFilter } from '../utils/taskUtils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '../services/tasks'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

interface TreeViewProps {
  tasks: Task[]
}

interface TreeNodeProps {
  task: Task
  level?: number
  tasks: Task[]
  onMoveTask: (draggedId: string, targetId: string, position: 'before' | 'after' | 'child') => void
}

const TreeNode = ({ task, level = 0, tasks, onMoveTask }: TreeNodeProps) => {
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
          <DraggableTaskItem 
            task={task}
            tasks={tasks}
            onMoveTask={onMoveTask}
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
          onMoveTask={onMoveTask}
        />
      ))}
    </div>
  )
}

export const TreeView = ({ tasks }: TreeViewProps) => {
  const { filter, updateFilter } = useFilter()
  const queryClient = useQueryClient()

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleMoveTask = async (draggedId: string, targetId: string, position: 'before' | 'after' | 'child') => {
    const draggedTask = tasks.find(t => t.id === draggedId)
    const targetTask = tasks.find(t => t.id === targetId)
    if (!draggedTask || !targetTask) return

    // Get all tasks that need to be updated
    const tasksToUpdate: { id: string; updates: Partial<Task> }[] = []

    if (position === 'child') {
      // Move task to be a child of target
      tasksToUpdate.push({
        id: draggedId,
        updates: {
          parent_id: targetId,
          position: 0
        }
      })

      // Update positions of other children
      const siblings = tasks.filter(t => t.parent_id === targetId && t.id !== draggedId)
      siblings.forEach((sibling, index) => {
        tasksToUpdate.push({
          id: sibling.id,
          updates: { position: index + 1 }
        })
      })
    } else {
      // Move task to be before or after target
      const newParentId = targetTask.parent_id
      const siblings = tasks.filter(t => t.parent_id === newParentId && t.id !== draggedId)
      const targetIndex = siblings.findIndex(t => t.id === targetId)
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1

      // Update dragged task
      tasksToUpdate.push({
        id: draggedId,
        updates: {
          parent_id: newParentId,
          position: insertIndex
        }
      })

      // Update positions of other siblings
      siblings.forEach((sibling, index) => {
        const newPosition = index < insertIndex ? index : index + 1
        tasksToUpdate.push({
          id: sibling.id,
          updates: { position: newPosition }
        })
      })
    }

    // Apply all updates
    for (const { id, updates } of tasksToUpdate) {
      await updateTaskMutation.mutateAsync({ id, updates })
    }
  }

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

  // Filter tasks to show only focused item and its descendants
  const filteredTasks = filter.focusedItemId ? (() => {
    const getDescendants = (itemId: string): Task[] => {
      const descendants: Task[] = []
      const queue = [itemId]
      while (queue.length > 0) {
        const currentId = queue.shift()!
        const children = tasks.filter(t => t.parent_id === currentId)
        descendants.push(...children)
        queue.push(...children.map(c => c.id))
      }
      return descendants
    }

    const descendants = getDescendants(filter.focusedItemId)
    return [focusedItem!, ...descendants]
  })() : tasks

  // Get the root tasks to display
  const rootTasks = filter.focusedItemId 
    ? [focusedItem!]  // If focused, show only the focused item as root
    : filteredTasks.filter((task) => !task.parent_id)  // Otherwise show all top-level tasks

  return (
    <DndProvider backend={HTML5Backend}>
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

        {rootTasks.map((task) => (
          <TreeNode 
            key={task.id}
            task={task}
            tasks={filteredTasks}
            onMoveTask={handleMoveTask}
          />
        ))}
      </div>
    </DndProvider>
  )
} 