'use client'

import { useMemo, useState } from 'react'
import { Database } from '@/lib/supabase/client'
import { Item } from './Item'
import { useFilter } from '../contexts/FilterContext'
import { createTask } from '../services/tasks'
import { useQueryClient } from '@tanstack/react-query'

type Task = Database['public']['Tables']['items']['Row']

interface ListViewProps {
  tasks: Task[]
}

export const ListView = ({ tasks }: ListViewProps) => {
  const { filter, updateFilter } = useFilter()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const queryClient = useQueryClient()

  // Memoize bottom-level tasks calculation
  const bottomLevelTasks = useMemo(() => {
    return tasks.filter((task) => {
      return !tasks.some((t) => t.parent_id === task.id)
    })
  }, [tasks])

  // Memoize filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    const filtered = bottomLevelTasks.filter((task) => {
      if (filter.completion === 'todo' && task.completed) return false
      if (filter.completion === 'done' && !task.completed) return false
      if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false
      return true
    })

    // Sort tasks based on their hierarchy
    return filtered.sort((a, b) => {
      // Get the full path for each task
      const getPath = (task: Task): string[] => {
        const path: string[] = []
        let currentTask = task
        while (currentTask.parent_id) {
          const parent = tasks.find(t => t.id === currentTask.parent_id)
          if (parent) {
            path.unshift(parent.id)
            currentTask = parent
          } else {
            break
          }
        }
        return path
      }

      const pathA = getPath(a)
      const pathB = getPath(b)

      // Compare paths element by element
      for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
        if (pathA[i] !== pathB[i]) {
          // If the paths diverge, sort by the position in the parent's children
          const parentId = pathA[i - 1] || null
          if (parentId) {
            const siblings = tasks.filter(t => t.parent_id === parentId)
            const indexA = siblings.findIndex(t => t.id === a.id)
            const indexB = siblings.findIndex(t => t.id === b.id)
            return indexA - indexB
          }
          return 0
        }
      }

      // If one path is a prefix of the other, the shorter path comes first
      return pathA.length - pathB.length
    })
  }, [bottomLevelTasks, filter, tasks])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      await createTask({
        title: newTaskTitle.trim(),
        parent_id: filter.focusedItemId,
      })
      setNewTaskTitle('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleCreateTask} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Task
          </button>
        </div>
      </form>

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