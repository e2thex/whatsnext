import { Fragment, useState, useMemo, useCallback } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { type Database } from '@/src/lib/supabase/client'

type ItemRow = Database['public']['Tables']['items']['Row']

interface DependencySelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (taskId: string) => void
  currentTaskId: string
  availableTasks: ItemRow[]
}

export function DependencySelectionDialog({
  isOpen,
  onClose,
  onSelect,
  currentTaskId,
  availableTasks
}: DependencySelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const getTaskPath = useCallback((taskId: string): string => {
    const path: string[] = []
    let currentTask = availableTasks.find(t => t.id === taskId)
    
    while (currentTask?.parent_id) {
      const parent = availableTasks.find(t => t.id === currentTask?.parent_id)
      if (parent) {
        // Take first 3 words of parent title, or full title if it's 3 words or less
        const abbreviatedTitle = parent.title.split(' ').slice(0, 3).join(' ')
        path.unshift(abbreviatedTitle)
        currentTask = parent
      } else {
        break
      }
    }
    
    return path.join(' > ')
  }, [availableTasks])

  const filteredTasks = useMemo(() => {
    return availableTasks
      .filter(task => task.id !== currentTaskId)
      .filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getTaskPath(task.id).toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [availableTasks, currentTaskId, searchQuery, getTaskPath])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Select a task to add as a dependency
                </Dialog.Title>

                <div className="mt-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="mt-4 max-h-60 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No tasks found
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredTasks.map((task) => {
                        const parentPath = getTaskPath(task.id)
                        return (
                          <button
                            key={task.id}
                            onClick={() => {
                              onSelect(task.id)
                              onClose()
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                          >
                            <div className="font-medium">{task.title}</div>
                            {parentPath && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {parentPath}
                              </div>
                            )}
                            {task.description && (
                              <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                                {task.description}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 