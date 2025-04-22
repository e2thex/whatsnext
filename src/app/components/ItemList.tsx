'use client'

import { useQuery } from '@tanstack/react-query'
import { TreeView } from './TreeView'
import { ListView } from './ListView'
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
  return <ListView tasks={tasks} />
} 