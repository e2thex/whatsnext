'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask } from '../services/tasks'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Task } from '../services/tasks'

interface AddSubtaskModalProps {
  task: Task
  onClose: () => void
}

export const AddSubtaskModal = ({ task, onClose }: AddSubtaskModalProps) => {
  const queryClient = useQueryClient()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) => createTask({
      title,
      parent_id: task.id,
      position: 0, // Will be updated by the backend
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSubtaskTitle.trim()) {
      createSubtaskMutation.mutate(newSubtaskTitle.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Subtask</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subtask-title" className="block text-sm font-medium text-gray-700 mb-1">
              Subtask Title
            </label>
            <input
              id="subtask-title"
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Enter subtask title..."
              className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Add Subtask
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 