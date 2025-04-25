'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask } from '../services/tasks'
import { PlusIcon } from '@heroicons/react/24/outline'
import { SlateTaskEditor } from './SlateTaskEditor'
import { useFilter } from '../contexts/FilterContext'
import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../services/tasks'

type Task = Database['public']['Tables']['items']['Row']

export const TaskCreator = () => {
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const { filter } = useFilter()
  const queryClient = useQueryClient()

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreatingTask(false)
    },
  })

  if (isCreatingTask) {
    // Calculate position based on context
    const position = (() => {
      // If focused on an item, add as a child of that item
      if (filter.focusedItemId) {
        return tasks.filter(t => t.parent_id === filter.focusedItemId).length
      }
      // Otherwise, add as a top-level task
      return tasks.filter(t => !t.parent_id).length
    })()

    return (
      <div className="mt-4 p-4 border rounded-lg">
        <SlateTaskEditor
          task={{
            title: '',
            description: null,
            completed: false,
            parent_id: filter.focusedItemId || null,
            position,
            type: 'Task',
            manual_type: false
          }}
          onCancel={() => setIsCreatingTask(false)}
          tasks={tasks}
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