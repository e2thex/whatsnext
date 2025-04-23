'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask } from '../services/tasks'
import { PlusIcon } from '@heroicons/react/24/outline'
import { TaskEditor } from './TaskEditor'
import { useFilter } from '../contexts/FilterContext'

type Task = Database['public']['Tables']['items']['Row']

export const TaskCreator = () => {
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const { filter } = useFilter()
  const queryClient = useQueryClient()

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreatingTask(false)
    },
  })

  if (isCreatingTask) {
    return (
      <div className="mt-4 p-4 border rounded-lg">
        <TaskEditor
          task={{
            title: '',
            description: null,
            completed: false,
            parent_id: filter.focusedItemId || null,
            position: 0,
            type: 'task',
            manual_type: false
          }}
          onCancel={() => setIsCreatingTask(false)}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsCreatingTask(true)}
      className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
    >
      <PlusIcon className="h-5 w-5" />
      Add Task
    </button>
  )
} 