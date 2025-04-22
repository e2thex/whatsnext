'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database } from '@/lib/supabase/client'
import { updateTask, getBlockingTasks, getTask } from '../services/tasks'
import { useMemo } from 'react'
import { useFilter } from '../contexts/FilterContext'

type Item = Database['public']['Tables']['items']['Row']

interface ItemProps {
  item: Item
}

export const Item = ({ item }: ItemProps) => {
  const queryClient = useQueryClient()
  const { updateFilter } = useFilter()

  const { data: blockingTasks = [] } = useQuery({
    queryKey: ['blockingTasks', item.id],
    queryFn: () => getBlockingTasks(item.id),
  })

  // Get parent hierarchy
  const { data: parentHierarchy = [] } = useQuery({
    queryKey: ['parentHierarchy', item.id],
    queryFn: async () => {
      const hierarchy: Item[] = []
      const visitedIds = new Set<string>()
      let currentItem = item

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

  const handleParentClick = (parentId: string) => {
    updateFilter({ focusedItemId: parentId })
  }

  const isBlocked = blockingTasks.length > 0

  return (
    <div className="py-4">
      {parentHierarchy.length > 0 && (
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
    </div>
  )
} 