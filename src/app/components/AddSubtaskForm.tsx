'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask } from '../services/tasks'
import { Task } from '../services/tasks'

interface AddSubtaskFormProps {
  task: Task
  onClose: () => void
  tasks: Task[] // Add tasks prop to access all tasks
}

export const AddSubtaskForm = ({ task, onClose, tasks }: AddSubtaskFormProps) => {
  const queryClient = useQueryClient()
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // Calculate position based on number of existing children
  const children = tasks.filter(t => t.parent_id === task.id)
  const position = children.length

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) => createTask({
      title,
      parent_id: task.id,
      position,
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
  )
} 