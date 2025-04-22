'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database } from '@/lib/supabase/client'
import { updateTask, getBlockingTasks } from '../services/tasks'

type Item = Database['public']['Tables']['items']['Row']

interface ItemProps {
  item: Item
}

export const Item = ({ item }: ItemProps) => {
  const queryClient = useQueryClient()

  const { data: blockingTasks = [] } = useQuery({
    queryKey: ['blockingTasks', item.id],
    queryFn: () => getBlockingTasks(item.id),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Item> }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleToggleComplete = () => {
    updateTaskMutation.mutate({ 
      id: item.id, 
      updates: { 
        completed: !item.completed,
        completed_at: !item.completed ? new Date().toISOString() : null
      } 
    })
  }

  const isBlocked = blockingTasks.length > 0

  return (
    <li className="py-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={handleToggleComplete}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <span
          className={`ml-3 ${
            item.completed ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {item.title}
        </span>
        {isBlocked && (
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Blocked
          </span>
        )}
      </div>
    </li>
  )
} 