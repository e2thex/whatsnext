'use client'

import { useMemo } from 'react'
import { Database } from '@/lib/supabase/client'
import { Item } from './Item'
import { useFilter } from '../contexts/FilterContext'

type Task = Database['public']['Tables']['items']['Row']

interface ListViewProps {
  tasks: Task[]
}

export const ListView = ({ tasks }: ListViewProps) => {
  const { filter, updateFilter } = useFilter()

  // Memoize bottom-level tasks calculation
  const bottomLevelTasks = useMemo(() => {
    return tasks.filter((task) => {
      return !tasks.some((t) => t.parent_id === task.id)
    })
  }, [tasks])

  // Memoize filtered tasks
  const filteredTasks = useMemo(() => {
    return bottomLevelTasks.filter((task) => {
      if (filter.completion === 'todo' && task.completed) return false
      if (filter.completion === 'done' && !task.completed) return false
      if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })
  }, [bottomLevelTasks, filter])

  return (
    <div className="w-full">
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tasks found</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <li key={task.id} className="py-4">
              <Item item={task} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
} 