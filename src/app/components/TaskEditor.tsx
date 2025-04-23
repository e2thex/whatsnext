'use client'

import { useState, useRef } from 'react'
import { Database } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask, createTask } from '../services/tasks'

type Task = Database['public']['Tables']['items']['Row']
type TaskInput = Omit<Task, 'id' | 'created_at' | 'completed_at' | 'user_id'>

interface TaskEditorProps {
  task: Partial<Task> & TaskInput
  onCancel: () => void
}

export const TaskEditor = ({ task, onCancel }: TaskEditorProps) => {
  const queryClient = useQueryClient()
  const [editedContent, setEditedContent] = useState(
    task.description ? `${task.title}\n${task.description}` : task.title
  )
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onCancel()
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onCancel()
    },
  })

  const handleSave = () => {
    const [title, ...descriptionLines] = editedContent.split('\n')
    if (title.trim()) {
      if (task.id) {
        updateTaskMutation.mutate({ 
          id: task.id, 
          updates: {
            title: title.trim(),
            description: descriptionLines.join('\n').trim() || null
          }
        })
      } else {
        createTaskMutation.mutate({
          title: title.trim(),
          description: descriptionLines.join('\n').trim() || null,
          completed: false,
          parent_id: task.parent_id || null,
          position: 0,
          type: 'task',
          manual_type: false
        })
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the blur was caused by clicking the cancel button
    if (cancelButtonRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    handleSave()
  }

  return (
    <div className="flex-1 flex flex-col gap-2">
      <textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="flex-1 rounded border p-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        rows={3}
        autoFocus
        placeholder="Title (first line)&#10;Description (subsequent lines)"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="rounded bg-blue-500 px-2 py-1 text-sm text-white hover:bg-blue-600"
        >
          Save
        </button>
        <button
          ref={cancelButtonRef}
          onClick={onCancel}
          className="rounded border px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
} 