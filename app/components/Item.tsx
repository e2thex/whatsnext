import { type ReactNode, useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from 'react-dnd'
import { type Database, type ItemType } from '../../src/lib/supabase/client'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DependencySelectionDialog } from './DependencySelectionDialog'

type ItemRow = Database['public']['Tables']['items']['Row']
type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']

interface ItemProps {
  item: ItemRow
  onAddChild: (parentId: string | null) => void
  onToggleComplete: (id: string) => void
  onTypeChange: (id: string, type: ItemType | null) => void
  onMoveItem: (id: string, direction: 'up' | 'down') => void
  onUpdateItem: (id: string, updates: { title?: string; description?: string }) => void
  onDeleteItem: (id: string, deleteChildren: boolean) => void
  onFocus: (id: string | null) => void
  onAddDependency: (blockingTaskId: string, blockedTaskId: string) => void
  onRemoveDependency: (blockingTaskId: string, blockedTaskId: string) => void
  onAddDateDependency: (taskId: string, unblockAt: Date) => void
  onRemoveDateDependency: (taskId: string) => void
  siblingCount: number
  itemPosition: number
  children?: ReactNode
  hasChildren?: boolean
  childCount?: number
  blockingTasks?: TaskDependencyRow[]
  blockedByTasks?: TaskDependencyRow[]
  dateDependency?: DateDependencyRow
  availableTasks?: ItemRow[]
  childrenBlocked?: boolean
}

interface DragItem {
  id: string
  type: 'ITEM'
  parentId: string | null
  position: number
}

// Helper function to determine if an item is blocked
const isItemBlocked = (
  item: ItemRow,
  blockedByTasks: TaskDependencyRow[],
  availableTasks: ItemRow[],
  hasChildren: boolean,
  childrenBlocked: boolean,
  dateDependency?: DateDependencyRow
): boolean => {
  // Check date dependency
  if (dateDependency && new Date(dateDependency.unblock_at) > new Date()) {
    return true
  }

  // Check direct task dependencies
  const isDirectlyBlocked = blockedByTasks.length > 0 && blockedByTasks.some(dep => {
    const blockingTask = availableTasks?.find(t => t.id === dep.blocking_task_id)
    return blockingTask && !blockingTask.completed
  })

  // If it has no children, just check direct blockage
  if (!hasChildren) {
    return isDirectlyBlocked
  }

  // If it has children, it's blocked if either:
  // 1. It's directly blocked by dependencies, OR
  // 2. All its children are blocked
  return isDirectlyBlocked || childrenBlocked
}

export function Item({ 
  item, 
  onAddChild, 
  onToggleComplete, 
  onTypeChange, 
  onMoveItem,
  onUpdateItem,
  onDeleteItem,
  onFocus,
  onAddDependency,
  onRemoveDependency,
  onAddDateDependency,
  onRemoveDateDependency,
  siblingCount,
  itemPosition,
  children,
  hasChildren = false,
  childCount = 0,
  blockingTasks = [],
  blockedByTasks = [],
  dateDependency,
  availableTasks = [],
  childrenBlocked = false
}: ItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(item.title === '')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedTitle, setEditedTitle] = useState(item.title)
  const [editedDescription, setEditedDescription] = useState(item.description || '')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDependencyMenuOpen, setIsDependencyMenuOpen] = useState(false)
  const [isDependencySelectionOpen, setIsDependencySelectionOpen] = useState(false)
  const [isDateDependencyOpen, setIsDateDependencyOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    dateDependency ? new Date(dateDependency.unblock_at) : null
  )
  
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const dependencyMenuRef = useRef<HTMLDivElement>(null)
  const dependencyButtonRef = useRef<HTMLButtonElement>(null)

  // Automatically focus title input for new/empty items
  useEffect(() => {
    if (item.title === '') {
      setIsEditingTitle(true);
    }
  }, [item.id, item.title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
    }
  }, [isEditingTitle, isEditingDescription])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDependencyMenuOpen &&
        dependencyMenuRef.current &&
        !dependencyMenuRef.current.contains(event.target as Node)
      ) {
        setIsDependencyMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDependencyMenuOpen])

  useEffect(() => {
    if (isDependencyMenuOpen && dependencyButtonRef.current) {
      const buttonRect = dependencyButtonRef.current.getBoundingClientRect()
      const menuTop = `${buttonRect.top + (buttonRect.height / 2) + window.scrollY}px`
      const menuLeft = `${buttonRect.left + window.scrollX}px`
      
      document.documentElement.style.setProperty('--menu-top', menuTop)
      document.documentElement.style.setProperty('--menu-left', menuLeft)
    }
  }, [isDependencyMenuOpen])

  const handleTitleSubmit = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle !== '') {
      onUpdateItem(item.id, { title: trimmedTitle })
      setIsEditingTitle(false)
    } else {
      // If the title is empty after trimming, use a default title
      const defaultTitle = 'New Item'
      setEditedTitle(defaultTitle)
      onUpdateItem(item.id, { title: defaultTitle })
      setIsEditingTitle(false)
    }
  }

  const handleDescriptionSubmit = () => {
    onUpdateItem(item.id, { description: editedDescription.trim() })
    setIsEditingDescription(false)
  }

  const handleKeyDown = (
    e: React.KeyboardEvent,
    submitFn: () => void,
    cancelFn: () => void
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitFn()
    } else if (e.key === 'Escape') {
      cancelFn()
    }
  }

  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: 'ITEM',
    item: (): DragItem => ({
      id: item.id,
      type: 'ITEM',
      parentId: item.parent_id,
      position: item.position
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const setDragRef = useCallback((node: HTMLDivElement | null) => {
    drag(node)
  }, [drag])

  const typeColors = {
    Task: 'bg-blue-100 text-blue-800',
    Mission: 'bg-green-100 text-green-800',
    Objective: 'bg-purple-100 text-purple-800',
    Ambition: 'bg-red-100 text-red-800'
  } as const

  const typeRingColors = {
    Task: 'ring-blue-500',
    Mission: 'ring-green-500',
    Objective: 'ring-purple-500',
    Ambition: 'ring-red-500'
  } as const

  const isBlocked = isItemBlocked(item, blockedByTasks, availableTasks, hasChildren, childrenBlocked, dateDependency)

  return (
    <div className={`
      relative group
    `}>
      <div
        ref={setDragRef}
        style={{
          opacity: isDragging ? 0.4 : 1,
        }}
        className={`
          p-2 rounded bg-white 
          transition-all duration-200 ease-in-out
          cursor-move
          ${isBlocked ? 'bg-red-50' : 'hover:bg-gray-50'}
        `}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => onToggleComplete(item.id)}
            disabled={isBlocked}
            className={`
              w-5 h-5 rounded border
              ${item.completed ? 'bg-green-500 border-green-600' : 'border-gray-300'}
              ${isBlocked ? 'cursor-not-allowed' : ''}
            `}
            title={isBlocked ? hasChildren ? 'All subitems are blocked' : 'Complete blocked tasks first' : undefined}
          >
            {item.completed && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <div className="flex-grow">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1 -ml-2 text-gray-500 hover:text-gray-700"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>
              )}
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => handleKeyDown(
                    e,
                    handleTitleSubmit,
                    () => {
                      setEditedTitle(item.title)
                      setIsEditingTitle(false)
                    }
                  )}
                  className="flex-grow px-1 py-0.5 text-base font-medium border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    ref={dependencyButtonRef}
                    onClick={() => setIsDependencyMenuOpen(!isDependencyMenuOpen)}
                    className="flex items-center justify-center hover:opacity-80 transition-opacity"
                    title={isBlocked ? hasChildren ? 'All subitems are blocked' : 'Task is blocked - Click to manage dependencies' : 'Task is unblocked - Click to manage dependencies'}
                  >
                    <div 
                      className={`
                        w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium
                        ${isBlocked ? 'bg-red-500' : 'bg-green-500'}
                      `}
                    >
                      {isBlocked ? blockedByTasks.length + (dateDependency ? 1 : 0) : blockingTasks.length}
                    </div>
                  </button>
                  <span 
                    onClick={() => setIsEditingTitle(true)}
                    className="font-medium cursor-text hover:text-gray-600"
                  >
                    {item.title}
                  </span>
                  {item.type && (
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${typeColors[item.type as keyof typeof typeColors]}
                      ${item.manual_type ? `ring-2 ${typeRingColors[item.type as keyof typeof typeRingColors]}` : ''}
                    `}>
                      {item.type}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isEditingDescription ? (
              <textarea
                ref={descriptionInputRef}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={handleDescriptionSubmit}
                onKeyDown={(e) => handleKeyDown(
                  e,
                  handleDescriptionSubmit,
                  () => {
                    setEditedDescription(item.description || '')
                    setIsEditingDescription(false)
                  }
                )}
                className="w-full mt-1 text-sm text-gray-600 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            ) : (
              item.description ? (
                <p 
                  onClick={() => setIsEditingDescription(true)}
                  className="mt-1 text-sm text-gray-600 cursor-text hover:text-gray-700"
                >
                  {item.description}
                </p>
              ) : (
                <p 
                  onClick={() => setIsEditingDescription(true)}
                  className="mt-1 text-sm text-gray-400 cursor-text hover:text-gray-500"
                >
                  Add description...
                </p>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={item.type || 'auto'}
              onChange={(e) => onTypeChange(item.id, e.target.value === 'auto' ? null : e.target.value as ItemType)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="auto">Auto</option>
              <option value="Task">Task</option>
              <option value="Mission">Mission</option>
              <option value="Objective">Objective</option>
              <option value="Ambition">Ambition</option>
            </select>

            <div className="flex gap-1">
              <button
                onClick={() => onMoveItem(item.id, 'up')}
                disabled={itemPosition === 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => onMoveItem(item.id, 'down')}
                disabled={itemPosition === siblingCount - 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => onAddChild(item.id)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={() => onFocus(item.id)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Focus on this task"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z" />
                <path fillRule="evenodd" d="M2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-1 text-gray-500 hover:text-red-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {children && (
          <div 
            className={`
              mt-2 ml-6 space-y-2 overflow-hidden transition-all duration-200 ease-in-out
              ${isCollapsed ? 'h-0 mt-0 opacity-0' : 'opacity-100'}
            `}
          >
            {children}
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={(deleteChildren) => {
          onDeleteItem(item.id, deleteChildren)
          setIsDeleteDialogOpen(false)
        }}
        hasChildren={hasChildren}
        itemTitle={item.title}
        childCount={childCount}
      />

      {isDependencyMenuOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dependencyMenuRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            transform: 'translate(var(--menu-left), var(--menu-top))',
          }}
          className="w-64 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200"
        >
          <div className="p-2">
            {/* Task dependencies section */}
            {blockedByTasks.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Blocked by tasks:</h3>
                {blockedByTasks.map(dep => {
                  const blockingTask = availableTasks?.find(t => t.id === dep.blocking_task_id)
                  const isCompleted = blockingTask?.completed
                  return (
                    <div key={dep.id} className="flex items-center justify-between text-sm text-gray-700 py-1">
                      <span className={`truncate flex-1 mr-2 flex items-center gap-1 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {isCompleted && (
                          <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {blockingTask?.title || 'Unknown task'}
                      </span>
                      <button
                        onClick={() => onRemoveDependency(dep.blocking_task_id, item.id)}
                        className="text-red-600 hover:text-red-700 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            
            {blockingTasks.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Blocking tasks:</h3>
                {blockingTasks.map(dep => {
                  const blockedTask = availableTasks?.find(t => t.id === dep.blocked_task_id)
                  const isCompleted = blockedTask?.completed
                  return (
                    <div key={dep.id} className="flex items-center justify-between text-sm text-gray-700 py-1">
                      <span className={`truncate flex-1 mr-2 flex items-center gap-1 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {isCompleted && (
                          <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {blockedTask?.title || 'Unknown task'}
                      </span>
                      <button
                        onClick={() => onRemoveDependency(item.id, dep.blocked_task_id)}
                        className="text-red-600 hover:text-red-700 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {blockingTasks.length === 0 && blockedByTasks.length === 0 && !dateDependency && (
              <p className="text-sm text-gray-500 py-1">No dependencies</p>
            )}

            <div className="mt-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsDependencySelectionOpen(true)
                  setIsDependencyMenuOpen(false)
                }}
                className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 py-1"
              >
                Add task dependency...
              </button>
            </div>

            {/* Date dependency section */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Date dependency:</h3>
              {dateDependency ? (
                <div className="flex items-center justify-between text-sm text-gray-700 py-1">
                  <span className="truncate flex-1 mr-2">
                    Blocked until {new Date(dateDependency.unblock_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onRemoveDateDependency(item.id)}
                    className="text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsDateDependencyOpen(true)}
                  className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 py-1"
                >
                  Add date dependency...
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Date dependency dialog */}
      {isDateDependencyOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96">
            <h2 className="text-lg font-medium mb-4">Add Date Dependency</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unblock Date
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={selectedDate?.toISOString().slice(0, 16) || ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsDateDependencyOpen(false)
                  setSelectedDate(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDate) {
                    onAddDateDependency(item.id, selectedDate)
                    setIsDateDependencyOpen(false)
                    setSelectedDate(null)
                  }
                }}
                disabled={!selectedDate}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <DependencySelectionDialog
        isOpen={isDependencySelectionOpen}
        onClose={() => setIsDependencySelectionOpen(false)}
        onSelect={(taskId) => onAddDependency(taskId, item.id)}
        currentTaskId={item.id}
        availableTasks={availableTasks}
      />
    </div>
  )
} 