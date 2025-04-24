'use client'

import { useMemo } from 'react'
import { TaskItem } from './TaskItem'
import { useFilter } from '../contexts/FilterContext'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Task } from '../services/tasks'
import { taskOrDescendantsMatchFilter } from '../utils/taskUtils'

interface ListViewProps {
  tasks: Task[]
}

export const ListView = ({ tasks }: ListViewProps) => {
  const { filter, updateFilter } = useFilter()

  // Get focused item and its hierarchy
  const focusedItem = useMemo(() => {
    if (!filter.focusedItemId) return null
    return tasks.find(task => task.id === filter.focusedItemId)
  }, [filter.focusedItemId, tasks])

  const focusedItemHierarchy = useMemo(() => {
    if (!focusedItem) return []
    const hierarchy: Task[] = []
    let currentItem = focusedItem
    while (currentItem.parent_id) {
      const parent = tasks.find(t => t.id === currentItem.parent_id)
      if (parent) {
        hierarchy.unshift(parent)
        currentItem = parent
      } else {
        break
      }
    }
    return hierarchy
  }, [focusedItem, tasks])

  // Memoize bottom-level tasks calculation
  const bottomLevelTasks = useMemo(() => {
    if (filter.focusedItemId) {
      // Get all descendants of the focused item
      const getDescendants = (itemId: string): Task[] => {
        const descendants: Task[] = []
        const queue = [itemId]
        while (queue.length > 0) {
          const currentId = queue.shift()!
          const children = tasks.filter(t => t.parent_id === currentId)
          descendants.push(...children)
          queue.push(...children.map(c => c.id))
        }
        return descendants
      }

      const descendants = getDescendants(filter.focusedItemId)
      return filter.type === 'all' 
        ? descendants.filter(task => !tasks.some(t => t.parent_id === task.id))
        : descendants.filter(task => task.effectiveType === filter.type)
    }
    return filter.type === 'all' 
      ? tasks.filter((task) => !tasks.some((t) => t.parent_id === task.id))
      : tasks.filter(task => task.effectiveType === filter.type)
  }, [tasks, filter.focusedItemId, filter.type])

  // Memoize filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    const filtered = bottomLevelTasks.filter(task => taskOrDescendantsMatchFilter(task, tasks, filter))

    const getAncestors = (task: Task): Task[] => {
      const buildAncestors = (t: Task, acc: Task[] = []): Task[] => {
        const parent = tasks.find(p => p.id === t.parent_id)
        return parent ? buildAncestors(parent, [t, ...acc]) : [t, ...acc]
      }
      return buildAncestors(task)
    }

    const compareTasks = (a: Task, b: Task): number => {
      const pathA = getAncestors(a)
      const pathB = getAncestors(b)
      
      // Compare each level of the hierarchy
      for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
        const result = pathA[i].position - pathB[i].position
        if (result !== 0) return result
      }
      
      // If all positions are equal up to the minimum length, the shorter path comes first
      return pathA.length - pathB.length
    }

    return filtered.sort(compareTasks)
  }, [bottomLevelTasks, filter, tasks])

  return (
    <div className="w-full">
      {focusedItem && (
        <div className="mb-4 flex items-center">
          <button
            onClick={() => updateFilter({ focusedItemId: null })}
            className="mr-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
            title="Exit focus mode"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center text-sm text-gray-500">
            {focusedItemHierarchy.map((item, index) => (
              <span key={item.id} className="flex items-center">
                {index > 0 && <span className="mx-1">/</span>}
                <button
                  onClick={() => updateFilter({ focusedItemId: item.id })}
                  className="hover:text-indigo-600"
                >
                  {item.title}
                </button>
              </span>
            ))}
            <span className="mx-1">/</span>
            <span className="font-medium text-gray-900">{focusedItem.title}</span>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No tasks found</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <li key={task.id} className="py-4">
              <TaskItem 
                task={task}
                showParentHierarchy={true}
                tasks={tasks}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
} 