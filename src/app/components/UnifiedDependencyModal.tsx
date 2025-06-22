'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  addBlockingRelationship,
  removeBlockingRelationship,
  searchTasks,
  Task,
  addDateDependency,
  removeDateDependency
} from '../services/tasks'
import { XMarkIcon, MagnifyingGlassIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useDebounce } from '../hooks/useDebounce'
import toast from 'react-hot-toast'

type SearchResult = {
  id: string
  title: string
  completed: boolean
}

type DependencyItem = {
  id: string
  type: 'task' | 'date'
  title: string
  completed?: boolean
  unblockAt?: string
}

interface UnifiedDependencyModalProps {
  task: Task
  onClose: () => void
}

export const UnifiedDependencyModal = ({ task, onClose }: UnifiedDependencyModalProps) => {
  const queryClient = useQueryClient()
  const [inputValue, setInputValue] = useState('')
  const [isDateMode, setIsDateMode] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const debouncedInputValue = useDebounce(inputValue, 300)

  // Detect if input looks like a date
  const detectDateInput = useCallback((value: string) => {
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}/, // MM/DD
      /^\d{1,2}-\d{1,2}/,  // MM-DD
      /^\d{4}-\d{1,2}-\d{1,2}/, // YYYY-MM-DD
      /^tomorrow/i,
      /^next week/i,
      /^next month/i,
      /^in \d+ days/i,
      /^in \d+ weeks/i,
      /^in \d+ months/i,
      /^\d{1,2}:\d{2}/, // HH:MM
      /^today/i,
      /^tonight/i,
      /^this evening/i,
      /^this afternoon/i,
      /^this morning/i,
      /^next monday/i,
      /^next tuesday/i,
      /^next wednesday/i,
      /^next thursday/i,
      /^next friday/i,
      /^next saturday/i,
      /^next sunday/i,
      /^monday/i,
      /^tuesday/i,
      /^wednesday/i,
      /^thursday/i,
      /^friday/i,
      /^saturday/i,
      /^sunday/i,
    ]
    return datePatterns.some(pattern => pattern.test(value))
  }, [])

  // Parse date input to get a Date object
  const parseDateInput = useCallback((input: string): Date | null => {
    const now = new Date()
    const inputLower = input.toLowerCase().trim()
    
    // Natural language parsing
    if (inputLower.includes('tomorrow')) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }
    
    if (inputLower.includes('today')) {
      return new Date(now)
    }
    
    if (inputLower.includes('tonight') || inputLower.includes('this evening')) {
      const tonight = new Date(now)
      tonight.setHours(20, 0, 0, 0) // 8 PM
      return tonight
    }
    
    if (inputLower.includes('this afternoon')) {
      const afternoon = new Date(now)
      afternoon.setHours(14, 0, 0, 0) // 2 PM
      return afternoon
    }
    
    if (inputLower.includes('this morning')) {
      const morning = new Date(now)
      morning.setHours(9, 0, 0, 0) // 9 AM
      return morning
    }
    
    if (inputLower.includes('next week')) {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek
    }
    
    if (inputLower.includes('next month')) {
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth
    }
    
    // Parse "in X days/weeks/months"
    const inDaysMatch = inputLower.match(/in (\d+) days?/i)
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1])
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + days)
      return futureDate
    }
    
    const inWeeksMatch = inputLower.match(/in (\d+) weeks?/i)
    if (inWeeksMatch) {
      const weeks = parseInt(inWeeksMatch[1])
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + (weeks * 7))
      return futureDate
    }
    
    const inMonthsMatch = inputLower.match(/in (\d+) months?/i)
    if (inMonthsMatch) {
      const months = parseInt(inMonthsMatch[1])
      const futureDate = new Date(now)
      futureDate.setMonth(futureDate.getMonth() + months)
      return futureDate
    }
    
    // Parse days of the week
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayIndex = dayNames.findIndex(day => inputLower.includes(day))
    if (dayIndex !== -1) {
      const targetDay = new Date(now)
      const currentDay = targetDay.getDay()
      const daysToAdd = (dayIndex - currentDay + 7) % 7
      
      // If it's "next [day]", add 7 more days
      const isNext = inputLower.includes('next ')
      const totalDays = daysToAdd + (isNext ? 7 : 0)
      
      targetDay.setDate(targetDay.getDate() + totalDays)
      targetDay.setHours(9, 0, 0, 0) // Default to 9 AM
      return targetDay
    }
    
    // Parse MM/DD or MM-DD format
    const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})/)
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1 // JS months are 0-indexed
      const day = parseInt(slashMatch[2])
      const year = now.getFullYear()
      const parsedDate = new Date(year, month, day)
      
      // If the date has passed this year, assume next year
      if (parsedDate < now) {
        parsedDate.setFullYear(year + 1)
      }
      return parsedDate
    }
    
    const dashMatch = input.match(/^(\d{1,2})-(\d{1,2})/)
    if (dashMatch) {
      const month = parseInt(dashMatch[1]) - 1
      const day = parseInt(dashMatch[2])
      const year = now.getFullYear()
      const parsedDate = new Date(year, month, day)
      
      // If the date has passed this year, assume next year
      if (parsedDate < now) {
        parsedDate.setFullYear(year + 1)
      }
      return parsedDate
    }
    
    // Parse YYYY-MM-DD format
    const fullDateMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (fullDateMatch) {
      const year = parseInt(fullDateMatch[1])
      const month = parseInt(fullDateMatch[2]) - 1
      const day = parseInt(fullDateMatch[3])
      return new Date(year, month, day)
    }
    
    // Parse time (HH:MM) - assume today
    const timeMatch = input.match(/^(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      const hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const today = new Date(now)
      today.setHours(hours, minutes, 0, 0)
      return today
    }
    
    return null
  }, [])

  // Generate date suggestions based on input
  const generateDateSuggestions = useCallback((input: string) => {
    const suggestions = []
    const parsedDate = parseDateInput(input)
    
    if (parsedDate) {
      // Add the parsed date as the first suggestion
      const formattedDate = parsedDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
      
      suggestions.push({
        label: `Use parsed date: ${formattedDate}`,
        value: parsedDate.toISOString(),
        display: formattedDate
      })
    }
    
    // Add common suggestions based on input
    const inputLower = input.toLowerCase()
    
    if (inputLower.includes('tomorrow')) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      suggestions.push({
        label: 'Tomorrow at 9:00 AM',
        value: tomorrow.toISOString(),
        display: 'Tomorrow at 9:00 AM'
      })
    }
    
    if (inputLower.includes('today')) {
      const today = new Date()
      today.setHours(9, 0, 0, 0)
      suggestions.push({
        label: 'Today at 9:00 AM',
        value: today.toISOString(),
        display: 'Today at 9:00 AM'
      })
    }
    
    if (inputLower.includes('tonight') || inputLower.includes('this evening')) {
      const tonight = new Date()
      tonight.setHours(20, 0, 0, 0)
      suggestions.push({
        label: 'Tonight at 8:00 PM',
        value: tonight.toISOString(),
        display: 'Tonight at 8:00 PM'
      })
    }
    
    if (inputLower.includes('next week')) {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      nextWeek.setHours(9, 0, 0, 0)
      suggestions.push({
        label: 'Next Monday at 9:00 AM',
        value: nextWeek.toISOString(),
        display: 'Next Monday at 9:00 AM'
      })
    }
    
    if (inputLower.includes('next month')) {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setHours(9, 0, 0, 0)
      suggestions.push({
        label: 'Next month at 9:00 AM',
        value: nextMonth.toISOString(),
        display: 'Next month at 9:00 AM'
      })
    }
    
    // Add custom date picker option
    suggestions.push({
      label: 'Pick a custom date...',
      value: 'custom',
      display: 'Pick a custom date...'
    })
    
    return suggestions
  }, [parseDateInput])

  // Search for tasks
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['searchTasks', debouncedInputValue],
    queryFn: () => searchTasks(debouncedInputValue),
    enabled: debouncedInputValue.length > 0 && !isDateMode,
  })

  // Mutations
  const addBlockingMutation = useMutation({
    mutationFn: (blockingTaskId: string) => addBlockingRelationship(blockingTaskId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setInputValue('')
      toast.success('Task dependency added successfully')
    },
    onError: (error) => {
      toast.error('Failed to add task dependency')
      console.error('Error adding task dependency:', error)
    }
  })

  const removeBlockingMutation = useMutation({
    mutationFn: (blockingTaskId: string) => removeBlockingRelationship(blockingTaskId, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task dependency removed successfully')
    },
    onError: (error) => {
      toast.error('Failed to remove task dependency')
      console.error('Error removing task dependency:', error)
    }
  })

  const addDateDependencyMutation = useMutation({
    mutationFn: (unblockAt: string) => addDateDependency(task.id, unblockAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setInputValue('')
      setSelectedDate('')
      toast.success('Date dependency added successfully')
    },
    onError: (error) => {
      toast.error('Failed to add date dependency')
      console.error('Error adding date dependency:', error)
    }
  })

  const removeDateDependencyMutation = useMutation({
    mutationFn: () => removeDateDependency(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Date dependency removed successfully')
    },
    onError: (error) => {
      toast.error('Failed to remove date dependency')
      console.error('Error removing date dependency:', error)
    }
  })

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    if (value.length > 0) {
      const looksLikeDate = detectDateInput(value)
      setIsDateMode(looksLikeDate)
    } else {
      setIsDateMode(false)
    }
  }

  // Handle key press for Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      if (isDateMode && dateSuggestions.length > 0) {
        // Add the first date suggestion
        handleAddDateDependency(dateSuggestions[0].value)
      } else if (!isDateMode && searchResults.length > 0) {
        // Add the first task suggestion that's not already blocking
        const firstAvailableTask = searchResults.find(result => !isTaskBlocking(result.id))
        if (firstAvailableTask) {
          handleAddTaskDependency(firstAvailableTask.id)
        }
      }
    }
  }

  // Handle escape key to close modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Handle keyboard navigation for suggestions
  const handleSuggestionKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  // Handle adding a task dependency
  const handleAddTaskDependency = (taskId: string) => {
    addBlockingMutation.mutate(taskId)
  }

  // Handle adding a date dependency
  const handleAddDateDependency = (dateValue: string) => {
    if (dateValue === 'custom') {
      // Parse the current input to get a starting date
      const parsedDate = parseDateInput(inputValue)
      if (parsedDate) {
        // Format for datetime-local input (YYYY-MM-DDTHH:MM)
        const year = parsedDate.getFullYear()
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
        const day = String(parsedDate.getDate()).padStart(2, '0')
        const hours = String(parsedDate.getHours()).padStart(2, '0')
        const minutes = String(parsedDate.getMinutes()).padStart(2, '0')
        setSelectedDate(`${year}-${month}-${day}T${hours}:${minutes}`)
      } else {
        // Fallback to tomorrow at 9 AM
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)
        const year = tomorrow.getFullYear()
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
        const day = String(tomorrow.getDate()).padStart(2, '0')
        setSelectedDate(`${year}-${month}-${day}T09:00`)
      }
      return
    }
    
    if (selectedDate) {
      const localDate = new Date(Date.parse(selectedDate))
      addDateDependencyMutation.mutate(localDate.toISOString())
    } else {
      addDateDependencyMutation.mutate(dateValue)
    }
  }

  // Handle removing any dependency
  const handleRemoveDependency = (dependency: DependencyItem) => {
    if (dependency.type === 'task') {
      removeBlockingMutation.mutate(dependency.id)
    } else {
      removeDateDependencyMutation.mutate()
    }
  }

  // Combine all dependencies into a single list
  const allDependencies: DependencyItem[] = useMemo(() => {
    const dependencies: DependencyItem[] = []
    
    // Add task dependencies
    task.blockedBy.forEach(task => {
      dependencies.push({
        id: task.id,
        type: 'task',
        title: task.title,
        completed: task.completed
      })
    })
    
    // Add date dependency
    if (task.dateDependency) {
      dependencies.push({
        id: 'date-dependency',
        type: 'date',
        title: 'Date Dependency',
        unblockAt: task.dateDependency.unblockAt
      })
    }
    
    return dependencies
  }, [task.blockedBy, task.dateDependency])

  // Generate date suggestions
  const dateSuggestions = useMemo(() => {
    return generateDateSuggestions(inputValue)
  }, [inputValue, generateDateSuggestions])

  // Format date for display
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

  // Check if a task is already blocking
  const isTaskBlocking = useCallback((taskId: string) => {
    return task.blockedBy.some(t => t.id === taskId)
  }, [task.blockedBy])

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${task.isBlocked ? 'bg-red-500' : 'bg-green-500'}`} />
            <h2 className="text-xl font-semibold">Dependencies</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            title="Close (Esc)"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Unified Input */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Add Dependency</h3>
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a task name or date (e.g., 'tomorrow', 'next week')..."
              className="w-full rounded border p-2 pl-8"
            />
            <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Help text */}
          <p className="text-sm text-gray-500 mt-1">
            {isDateMode 
              ? parseDateInput(inputValue) 
                ? `Date detected: ${parseDateInput(inputValue)?.toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}`
                : "Press Enter to add the first date suggestion, or click any suggestion below"
              : "Press Enter to add the first available task, or click any task below"
            }
          </p>

          {/* Date Suggestions */}
          {isDateMode && inputValue && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {dateSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-150 ${
                    addDateDependencyMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => !addDateDependencyMutation.isPending && handleAddDateDependency(suggestion.value)}
                  onKeyPress={(e) => !addDateDependencyMutation.isPending && handleSuggestionKeyPress(e, () => handleAddDateDependency(suggestion.value))}
                  tabIndex={addDateDependencyMutation.isPending ? -1 : 0}
                  role="button"
                  aria-label={`Add date dependency: ${suggestion.display}`}
                >
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-blue-600 mr-2" />
                    {suggestion.display}
                  </span>
                  <span className="text-blue-500 hover:text-blue-700">
                    {addDateDependencyMutation.isPending ? 'Adding...' : 'Add'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Custom Date Picker */}
          {selectedDate && (
            <div className="mt-2 p-2 border rounded">
              <div className="flex items-center space-x-2">
                <input
                  type="datetime-local"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleAddDateDependency(selectedDate)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Set
                </button>
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Task Suggestions */}
          {!isDateMode && inputValue && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-500">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result: SearchResult) => (
                  <div
                    key={result.id}
                    className={`flex items-center justify-between p-2 rounded transition-colors duration-150 ${
                      isTaskBlocking(result.id)
                        ? 'bg-gray-100 text-gray-500'
                        : `bg-gray-50 hover:bg-gray-100 cursor-pointer ${
                            addBlockingMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                          }`
                    }`}
                    onClick={() => !isTaskBlocking(result.id) && !addBlockingMutation.isPending && handleAddTaskDependency(result.id)}
                    onKeyPress={(e) => !isTaskBlocking(result.id) && !addBlockingMutation.isPending && handleSuggestionKeyPress(e, () => handleAddTaskDependency(result.id))}
                    tabIndex={isTaskBlocking(result.id) || addBlockingMutation.isPending ? -1 : 0}
                    role={isTaskBlocking(result.id) ? undefined : "button"}
                    aria-label={isTaskBlocking(result.id) ? undefined : `Add task dependency: ${result.title}`}
                  >
                    <span className={result.completed ? 'line-through' : ''}>
                      {result.title}
                    </span>
                    {!isTaskBlocking(result.id) && (
                      <span className="text-blue-500 hover:text-blue-700">
                        {addBlockingMutation.isPending ? 'Adding...' : 'Add'}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-2">No tasks found</p>
              )}
            </div>
          )}
        </div>

        {/* Unified Dependencies List */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Current Dependencies</h3>
          <div className="space-y-2">
            {allDependencies.map(dependency => (
              <div key={dependency.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="flex items-center">
                  {dependency.type === 'date' ? (
                    <CalendarIcon className="h-4 w-4 text-blue-600 mr-2" />
                  ) : (
                    <ClockIcon className="h-4 w-4 text-red-600 mr-2" />
                  )}
                  {dependency.type === 'date' ? (
                    <span>
                      Unblocks at {formatDateForDisplay(new Date(dependency.unblockAt!))}
                    </span>
                  ) : (
                    <span className={dependency.completed ? 'line-through text-gray-500' : ''}>
                      {dependency.title}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleRemoveDependency(dependency)}
                  disabled={removeBlockingMutation.isPending || removeDateDependencyMutation.isPending}
                  className={`text-red-500 hover:text-red-700 ${
                    (removeBlockingMutation.isPending || removeDateDependencyMutation.isPending) 
                      ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {(removeBlockingMutation.isPending || removeDateDependencyMutation.isPending) ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
            {allDependencies.length === 0 && (
              <p className="text-gray-500">No dependencies</p>
            )}
          </div>
        </div>

        {/* Blocked Tasks */}
        <div>
          <h3 className="text-lg font-medium mb-2">Blocked By This Task</h3>
          <div className="space-y-2">
            {task.blocking.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className={task.completed ? 'line-through text-gray-500' : ''}>
                  {task.title}
                </span>
                <button
                  onClick={() => removeBlockingMutation.mutate(task.id)}
                  disabled={removeBlockingMutation.isPending}
                  className={`text-red-500 hover:text-red-700 ${
                    removeBlockingMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {removeBlockingMutation.isPending ? 'Removing...' : 'Remove'}
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