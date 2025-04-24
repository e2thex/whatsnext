'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, getTask, updateTask } from '../services/tasks'
import { useFilter } from '../contexts/FilterContext'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline'
import { TaskEditor } from './TaskEditor'
import { TaskBlockingButton } from './TaskBlockingModal'
import { Task } from '../services/tasks'

interface TaskItemProps {
  task: Task
  showParentHierarchy?: boolean
  className?: string
}

export const TaskItem = ({ 
  task, 
  showParentHierarchy = false, 
  className = ''
}: TaskItemProps) => {
  const queryClient = useQueryClient()
  const { filter, updateFilter } = useFilter()
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Get parent hierarchy
  const { data: parentHierarchy = [] } = useQuery({
    queryKey: ['parentHierarchy', task.id],
    queryFn: async () => {
      const hierarchy: Task[] = []
      const visitedIds = new Set<string>()
      let currentItem = task

      while (currentItem.parent_id && !visitedIds.has(currentItem.parent_id)) {
        visitedIds.add(currentItem.parent_id)
        const parent = await getTask(currentItem.parent_id)
        if (parent) {
          hierarchy.unshift(parent)
          currentItem = parent
        } else {
          break
        }
      }

      return hierarchy
    },
    enabled: showParentHierarchy
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) => createTask({
      title,
      parent_id: task.id,
      position: 0, // Will be updated by the backend
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsAddingSubtask(false)
      setNewSubtaskTitle('')
    },
  })

  const handleToggleComplete = () => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { completed: !task.completed },
    })
  }

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSubtaskTitle.trim()) {
      createSubtaskMutation.mutate(newSubtaskTitle.trim())
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleParentClick = (parentId: string) => {
    updateFilter({ focusedItemId: parentId })
  }

  const handleFocus = () => {
    updateFilter({ focusedItemId: task.id })
  }

  const isFocused = filter.focusedItemId === task.id

  return (
    <div className={`${className} ${task.isBlocked ? 'opacity-50' : ''}`}>
      {showParentHierarchy && parentHierarchy.length > 0 && (
        <div className="mb-2 flex items-center text-sm text-gray-500">
          {parentHierarchy.map((parent, index) => (
            <span key={parent.id} className="flex items-center">
              {index > 0 && <span className="mx-1">/</span>}
              <button
                onClick={() => handleParentClick(parent.id)}
                className="hover:text-indigo-600"
              >
                {parent.title}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggleComplete}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <TaskBlockingButton task={task} className="ml-2" />
        {isEditing ? (
          <div className="ml-2 flex-1">
            <TaskEditor
              task={task}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <>
            <div className="ml-2 flex-1">
              <span 
                className={`${task.completed ? 'line-through text-gray-500' : ''} cursor-pointer hover:text-indigo-600`}
                onClick={handleEdit}
              >
                {task.title}
              </span>
              {task.description && (
                <p 
                  className="text-sm text-gray-600 mt-1 cursor-pointer hover:text-indigo-600"
                  onClick={handleEdit}
                >
                  {task.description}
                </p>
              )}
            </div>
            <button
              onClick={handleEdit}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
              title="Edit task"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          onClick={() => setIsAddingSubtask(true)}
          className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
          title="Add subtask"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        <button
          onClick={handleFocus}
          className={`ml-2 p-1 rounded-full hover:bg-gray-100 ${
            isFocused ? 'text-indigo-600' : 'text-gray-400'
          }`}
          title="Focus on this item"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
      </div>
      {isAddingSubtask && (
        <form onSubmit={handleAddSubtask} className="mt-2 ml-6 flex gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Add subtask..."
            className="flex-1 rounded border p-1 text-sm"
            autoFocus
          />
          <button
            type="submit"
            className="rounded bg-blue-500 px-2 py-1 text-sm text-white hover:bg-blue-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingSubtask(false)
              setNewSubtaskTitle('')
            }}
            className="rounded border px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  )
} 