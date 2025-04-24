'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTask, moveChildrenUp, Task } from '../services/tasks'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface TaskDeleteModalProps {
  task: Task
  onClose: () => void
  tasks: Task[]
}

type DeleteMode = 'delete-all' | 'move-children' | null

export const TaskDeleteModal = ({ task, onClose, tasks }: TaskDeleteModalProps) => {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null)

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: DeleteMode }) => {
      if (mode === 'move-children') {
        await moveChildrenUp(id)
      }
      await deleteTask(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
    onError: () => {
      setIsDeleting(false)
    }
  })

  const handleDelete = () => {
    if (!deleteMode) return
    setIsDeleting(true)
    deleteTaskMutation.mutate({ id: task.id, mode: deleteMode })
  }

  // Find all child tasks
  const getChildTasks = (taskId: string): Task[] => {
    const children = tasks.filter(t => t.parent_id === taskId)
    return children.concat(...children.map(child => getChildTasks(child.id)))
  }

  const childTasks = getChildTasks(task.id)
  const hasChildren = childTasks.length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-600">Delete Task</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          
          {hasChildren && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">This task has child tasks. What would you like to do with them?</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="delete-all"
                    checked={deleteMode === 'delete-all'}
                    onChange={() => setDeleteMode('delete-all')}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span>Delete all child tasks</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="move-children"
                    checked={deleteMode === 'move-children'}
                    onChange={() => setDeleteMode('move-children')}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span>Move child tasks to the same level as this task</span>
                </label>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Affected Tasks:</h3>
            <ul className="space-y-1">
              <li className="flex items-center">
                <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </span>
              </li>
              {childTasks.map(task => (
                <li key={task.id} className="flex items-center pl-4">
                  <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDeleting || (hasChildren && !deleteMode)}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
} 