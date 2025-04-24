'use client'

import { useState, useCallback } from 'react'
import { Database } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getBlockedTasksWithDetails, 
  getBlockingTasksWithDetails,
  addBlockingRelationship,
  removeBlockingRelationship,
  searchTasks,
  getBlockingTasks
} from '../services/tasks'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useDebounce } from '../hooks/useDebounce'

type Task = Database['public']['Tables']['items']['Row']

interface TaskBlockingButtonProps {
  task: Task
  className?: string
}

interface TaskBlockingModalProps {
  task: Task
  onClose: () => void
}

export const TaskBlockingButton = ({ task, className = '' }: TaskBlockingButtonProps) => {
  const [showBlockingModal, setShowBlockingModal] = useState(false)

  const { data: blockingTasks = [] } = useQuery({
    queryKey: ['blockingTasks', task.id],
    queryFn: () => getBlockingTasks(task.id),
  })

  const { data: blockedTasks = [] } = useQuery({
    queryKey: ['blockedTasks', task.id],
    queryFn: () => getBlockedTasksWithDetails(task.id),
  })

  const isBlocked = blockingTasks.length > 0

  return (
    <>
      <button
        onClick={() => setShowBlockingModal(true)}
        className={`${className} flex items-center justify-center w-6 h-6 rounded-full ${
          isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}
        title={isBlocked ? `${blockingTasks.length} tasks blocking this task` : `${blockedTasks.length} tasks blocked by this task`}
      >
        {isBlocked ? blockingTasks.length : blockedTasks.length}
      </button>

      {showBlockingModal && (
        <TaskBlockingModal
          task={task}
          onClose={() => setShowBlockingModal(false)}
        />
      )}
    </>
  )
}

export const TaskBlockingModal = ({ task, onClose }: TaskBlockingModalProps) => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const { data: blockingTasks = [] } = useQuery({
    queryKey: ['blockingTasksWithDetails', task.id],
    queryFn: () => getBlockingTasksWithDetails(task.id),
  })

  const { data: blockedTasks = [] } = useQuery({
    queryKey: ['blockedTasksWithDetails', task.id],
    queryFn: () => getBlockedTasksWithDetails(task.id),
  })

  const { data: searchResults = [] } = useQuery({
    queryKey: ['searchTasks', debouncedSearchQuery],
    queryFn: () => searchTasks(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  const addBlockingMutation = useMutation({
    mutationFn: (blockingTaskId: string) => addBlockingRelationship(blockingTaskId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockingTasksWithDetails', task.id] })
      queryClient.invalidateQueries({ queryKey: ['blockedTasksWithDetails', task.id] })
      setSearchQuery('')
    },
  })

  const removeBlockingMutation = useMutation({
    mutationFn: (blockingTaskId: string) => removeBlockingRelationship(blockingTaskId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockingTasksWithDetails', task.id] })
      queryClient.invalidateQueries({ queryKey: ['blockedTasksWithDetails', task.id] })
    },
  })

  const handleAddBlocking = (blockingTaskId: string) => {
    addBlockingMutation.mutate(blockingTaskId)
  }

  const handleRemoveBlocking = (blockingTaskId: string) => {
    removeBlockingMutation.mutate(blockingTaskId)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const isTaskBlocking = useCallback((taskId: string) => {
    return blockingTasks.some(t => t.id === taskId)
  }, [blockingTasks])

  const isTaskBlocked = useCallback((taskId: string) => {
    return blockedTasks.some(t => t.id === taskId)
  }, [blockedTasks])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${blockingTasks.length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            <h2 className="text-xl font-semibold">Task Dependencies</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Tasks Blocking This Task</h3>
          <div className="space-y-2">
            {blockingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className={task.completed ? 'line-through text-gray-500' : ''}>
                  {task.title}
                </span>
                <button
                  onClick={() => handleRemoveBlocking(task.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            {blockingTasks.length === 0 && (
              <p className="text-gray-500">No tasks are blocking this task</p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Add a Task That Blocks This Task</h3>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for a task that blocks this task..."
              className="w-full rounded border p-2 pl-8"
            />
            <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          {searchQuery && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {searchResults.map(result => (
                <div
                  key={result.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    isTaskBlocking(result.id) || isTaskBlocked(result.id)
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className={result.completed ? 'line-through' : ''}>
                    {result.title}
                  </span>
                  {!isTaskBlocking(result.id) && !isTaskBlocked(result.id) && (
                    <button
                      onClick={() => handleAddBlocking(result.id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}
              {searchResults.length === 0 && (
                <p className="text-gray-500 text-center py-2">No tasks found</p>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Blocked By This Task</h3>
          <div className="space-y-2">
            {blockedTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className={task.completed ? 'line-through text-gray-500' : ''}>
                  {task.title}
                </span>
                <button
                  onClick={() => handleRemoveBlocking(task.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            {blockedTasks.length === 0 && (
              <p className="text-gray-500">This task is not blocking any other tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 