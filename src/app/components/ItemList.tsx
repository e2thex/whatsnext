'use client'

import { useQuery } from '@tanstack/react-query'
import { TreeView } from './TreeView'
import { ListView } from './ListView'
import { getTasks } from '../services/tasks'
import { useFilter } from '../contexts/FilterContext'
import { TaskCreator } from './TaskCreator'

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

  return (
    <div className="w-full">
      {filter.viewMode === 'tree' ? (
        <TreeView tasks={tasks} />
      ) : (
        <ListView tasks={tasks} />
      )}
      <TaskCreator />
    </div>
  )
} 