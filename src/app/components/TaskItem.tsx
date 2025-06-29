'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask } from '../services/tasks'
import { useFilter } from '../contexts/FilterContext'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { SlateTaskEditor } from './SlateTaskEditor'
import { UnifiedDependencyButton } from './UnifiedDependencyButton'
import { Task } from '../services/tasks'
import typeIcons, { typeColors } from './typeIcons'
import BreadcrumbNav from './BreadcrumbNav'
import { TaskDeleteModal } from './TaskDeleteModal'

type TaskType = 'Task' | 'Mission' | 'Objective' | 'Ambition'

interface TaskItemProps {
  task: Task
  showParentHierarchy?: boolean
  className?: string
  tasks: Task[]
}

export const TaskItem = ({ 
  task, 
  showParentHierarchy = false, 
  className = '',
  tasks
}: TaskItemProps) => {
  const queryClient = useQueryClient()
  const { filter, updateFilter } = useFilter()
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleToggleComplete = () => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { completed: !task.completed },
    })
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleFocus = () => {
    updateFilter({ focusedItemId: task.id })
  }

  const isFocused = filter.focusedItemId === task.id

  const handleTypeChange = (newType: TaskType) => {
    console.log('handleTypeChange', newType)
    updateTaskMutation.mutate({
      id: task.id,
      updates: { 
        type: newType,
        manual_type: true
      },
    })
    setIsTypeDropdownOpen(false)
  }

  const handleRevertToAutoType = () => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { 
        type: null,
        manual_type: false
      },
    })
    setIsTypeDropdownOpen(false)
  }

  const taskType = task.effectiveType
  const taskTypeCapitalized = taskType.charAt(0).toUpperCase() + taskType.slice(1) as keyof typeof typeColors

  return (
    <div className={className}>
      {showParentHierarchy && <BreadcrumbNav taskId={task.id} />}
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggleComplete}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <UnifiedDependencyButton task={task} className="ml-2" />
        <div className="relative ml-2">
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className={`p-1 rounded-full ${typeColors[taskTypeCapitalized]}`}
            title={taskType}
          >
            {typeIcons[taskTypeCapitalized]}
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1">
                {Object.entries(typeIcons).map(([type, icon]) => {
                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeChange(type as TaskType)}
                      className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${typeColors[type as keyof typeof typeColors]}`}
                    >
                      {icon}
                      <span>{type}</span>
                    </button>
                  )
                })}
                <button
                  onClick={handleRevertToAutoType}
                  className="w-full px-4 py-2 text-left flex items-center space-x-2 text-gray-700 hover:bg-gray-100"
                >
                  <span>Auto-detect</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="ml-2 flex-1">
            <SlateTaskEditor
              task={task}
              onCancel={handleCancel}
              tasks={tasks}
            />
          </div>
        ) : (
          <>
            <div className="ml-2 flex-1">
              <span 
                className={`${task.completed ? 'line-through text-gray-500' : ''} cursor-pointer hover:text-indigo-600`}
                onClick={handleEdit}
              >
                {task.title}
              </span>
              {task.description && (
                <p 
                  className="text-sm text-gray-600 mt-1 cursor-pointer hover:text-indigo-600"
                  onClick={handleEdit}
                >
                  {task.description}
                </p>
              )}
            </div>
            <button
              onClick={handleEdit}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
              title="Edit task"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </>
        )}
        <button
          onClick={() => setIsAddingSubtask(true)}
          className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
          title="Add subtask"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        <button
          onClick={handleFocus}
          className={`ml-2 p-1 rounded-full hover:bg-gray-100 ${
            isFocused ? 'text-indigo-600' : 'text-gray-400'
          }`}
          title="Focus on this item"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500"
          title="Delete task"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      {isAddingSubtask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Subtask</h2>
              <button
                onClick={() => setIsAddingSubtask(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <SlateTaskEditor
              task={{
                title: '',
                description: null,
                completed: false,
                parent_id: task.id,
                position: tasks.filter(t => t.parent_id === task.id).length,
                type: 'Task',
                manual_type: false
              }}
              onCancel={() => setIsAddingSubtask(false)}
              tasks={tasks}
            />
          </div>
        </div>
      )}
      {isDeleteModalOpen && (
        <TaskDeleteModal
          task={task}
          onClose={() => setIsDeleteModalOpen(false)}
          tasks={tasks}
        />
      )}
    </div>
  )
} 