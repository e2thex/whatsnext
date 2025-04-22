'use client'

import { useQuery } from '@tanstack/react-query'
import { Item } from './Item'
import { TreeView } from './TreeView'
import { getTasks } from '../services/tasks'
import { Database } from '@/lib/supabase/client'
import { useFilter } from '../contexts/FilterContext'

type Task = Database['public']['Tables']['items']['Row']

export const ItemList = () => {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })

  const { filter } = useFilter()

  const filteredItems = tasks.filter((item) => {
    // Apply completion filter
    if (filter.completion === 'todo' && item.completed) return false
    if (filter.completion === 'done' && !item.completed) return false

    // Apply search filter
    if (filter.search && !item.title.toLowerCase().includes(filter.search.toLowerCase())) return false

    return true
  })

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading tasks...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading tasks. Please try again later.
      </div>
    )
  }

  if (filter.viewMode === 'tree') {
    return <TreeView tasks={tasks} />
  }

  return (
    <div className="w-full">
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tasks found</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {filteredItems.map((item) => (
            <Item
              key={item.id}
              item={item}
            />
          ))}
        </ul>
      )}
    </div>
  )
} 