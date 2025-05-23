'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  addBlockingRelationship,
  removeBlockingRelationship,
  searchTasks,
  Task,
  addDateDependency,
  removeDateDependency
} from '../services/tasks'
import { XMarkIcon, MagnifyingGlassIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useDebounce } from '../hooks/useDebounce'

type SearchResult = {
  id: string
  title: string
  completed: boolean
}

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

  const totalBlockers = task.blockedBy.length + (task.dateDependency ? 1 : 0)

  return (
    <>
      <button
        onClick={() => setShowBlockingModal(true)}
        className={`${className} flex items-center justify-center w-6 h-6 rounded-full ${
          task.isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}
        title={task.isBlocked ? `${totalBlockers} items blocking this task` : `${task.blocking.length} tasks blocked by this task`}
      >
        {task.isBlocked ? totalBlockers : task.blocking.length}
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
  const [date, setDate] = useState<string>(() => {
    if (task.dateDependency?.unblockAt) {
      // Convert UTC to local time for display
      const localDate = new Date(task.dateDependency.unblockAt)
      const year = localDate.getFullYear()
      const month = String(localDate.getMonth() + 1).padStart(2, '0')
      const day = String(localDate.getDate()).padStart(2, '0')
      const hours = String(localDate.getHours()).padStart(2, '0')
      const minutes = String(localDate.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    // Set to tomorrow at 00:00 in local timezone
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    // Format the date in local timezone
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}T00:00`
  })
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const { data: searchResults = [] } = useQuery({
    queryKey: ['searchTasks', debouncedSearchQuery],
    queryFn: () => searchTasks(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  const addBlockingMutation = useMutation({
    mutationFn: (blockingTaskId: string) => addBlockingRelationship(blockingTaskId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setSearchQuery('')
    },
  })

  const removeBlockingMutation = useMutation({
    mutationFn: (blockingTaskId: string) => removeBlockingRelationship(blockingTaskId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const addDateDependencyMutation = useMutation({
    mutationFn: (unblockAt: string) => addDateDependency(task.id, unblockAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const removeDateDependencyMutation = useMutation({
    mutationFn: () => removeDateDependency(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDate('')
      onClose()
    },
  })

  const handleAddBlocking = (blockingTaskId: string) => {
    addBlockingMutation.mutate(blockingTaskId)
  }

  const handleRemoveBlocking = (blockingTaskId: string) => {
    removeBlockingMutation.mutate(blockingTaskId)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value)
  }

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (date) {
      const localDate = new Date(Date.parse(date))
      addDateDependencyMutation.mutate(localDate.toISOString())
    }
  }

  const handleRemoveDate = (e: React.MouseEvent) => {
    e.preventDefault()
    removeDateDependencyMutation.mutate()
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const isTaskBlocking = useCallback((taskId: string) => {
    return task.blockedBy.some(t => t.id === taskId)
  }, [task.blockedBy])

  const isTaskBlocked = useCallback((taskId: string) => {
    return task.blocking.some(t => t.id === taskId)
  }, [task.blocking])

  const formatDateForDisplay = (date: Date) => {
    const localDate = new Date(date)
    return localDate.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${task.isBlocked ? 'bg-red-500' : 'bg-green-500'}`} />
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
          <h3 className="text-lg font-medium mb-2">Date Dependency</h3>
          <form onSubmit={handleDateSubmit} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="datetime-local"
                value={date}
                onChange={handleDateChange}
                min={new Date().toISOString().slice(0, 16)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!date}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set
              </button>
            </div>
            {task.dateDependency && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Unblocks at <span className="ml-1">{formatDateForDisplay(new Date(task.dateDependency.unblockAt))}</span>
                </span>
                <button
                  onClick={handleRemoveDate}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Tasks Blocking This Task</h3>
          <div className="space-y-2">
            {task.blockedBy.map(task => (
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
            {task.blockedBy.length === 0 && !task.dateDependency && (
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
              {searchResults.map((result: SearchResult) => (
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
            {task.blocking.map(task => (
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
            {task.blocking.length === 0 && (
              <p className="text-gray-500">This task is not blocking any other tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 