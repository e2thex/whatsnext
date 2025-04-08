import { useMemo, useCallback, type ReactNode, Fragment, useEffect, useState } from 'react'
import { Item } from './Item'
import { useDrop } from 'react-dnd'
import { type Database, type ItemType } from '../../src/lib/supabase/client'
import { Breadcrumb } from './Breadcrumb'
import { useDragDropManager } from 'react-dnd'

type ItemRow = Database['public']['Tables']['items']['Row']
type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']

interface DragItem {
  id: string
  type: 'ITEM'
  parentId: string | null
  position: number
}

interface DropZoneProps {
  parentId: string | null
  position: number
  onMoveItemToPosition: (itemId: string, newPosition: number, parentId: string | null) => void
}

// Custom hook to detect if any drag operation is in progress
function useAnyDragging() {
  const [isDragging, setIsDragging] = useState(false)
  const manager = useDragDropManager()
  
  useEffect(() => {
    const monitor = manager.getMonitor()
    const unsubscribe = monitor.subscribeToStateChange(() => {
      setIsDragging(monitor.isDragging())
    })
    
    return () => {
      unsubscribe()
    }
  }, [manager])
  
  return isDragging
}

function DropZone({ parentId, position, onMoveItemToPosition }: DropZoneProps) {
  const anyDragging = useAnyDragging()
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: 'ITEM',
    drop: (item) => {
      onMoveItemToPosition(item.id, position, parentId)
      return undefined
    },
    canDrop: () => true,
    collect: monitor => ({
      isOver: monitor.isOver()
    })
  })

  const setDropRef = useCallback((node: HTMLDivElement | null) => {
    drop(node)
  }, [drop])

  return (
    <div
      ref={setDropRef}
      className={`
        transition-all duration-200 ease-in-out
        ${isOver 
          ? 'h-4 my-2 border-2 border-dashed border-indigo-500 bg-indigo-100' 
          : anyDragging 
            ? 'h-2 my-1 border-2 border-dashed border-gray-300 rounded-sm' 
            : 'h-0 border-0 my-0'}
      `}
    />
  )
}

export interface ItemListProps {
  items: ItemRow[]
  dependencies: TaskDependencyRow[]
  dateDependencies: DateDependencyRow[]
  onAddChild: (parentId: string | null) => void
  onToggleComplete: (id: string) => void
  onTypeChange: (id: string, type: ItemType | null) => void
  onMoveItem: (id: string, direction: 'up' | 'down') => void
  onMoveItemToPosition: (itemId: string, newPosition: number, parentId: string | null) => void
  onUpdateItem: (id: string, updates: { title?: string; description?: string }) => void
  onDeleteItem: (id: string, deleteChildren: boolean) => void
  onFocus: (id: string | null) => void
  onAddDependency: (blockingTaskId: string, blockedTaskId: string) => void
  onRemoveDependency: (blockingTaskId: string, blockedTaskId: string) => void
  onAddDateDependency: (taskId: string, unblockAt: Date) => void
  onRemoveDateDependency: (taskId: string) => void
  focusedItemId: string | null
  viewMode: 'tree' | 'list'
  showOnlyActionable: boolean
  showOnlyBlocked: boolean
  completionFilter: 'all' | 'completed' | 'not-completed'
}

export function ItemList({ 
  items, 
  dependencies,
  dateDependencies,
  onAddChild, 
  onToggleComplete, 
  onTypeChange, 
  onMoveItem, 
  onMoveItemToPosition,
  onUpdateItem,
  onDeleteItem,
  onFocus,
  onAddDependency,
  onRemoveDependency,
  onAddDateDependency,
  onRemoveDateDependency,
  focusedItemId,
  viewMode,
  showOnlyActionable,
  showOnlyBlocked,
  completionFilter
}: ItemListProps) {
  const itemsByParent = useMemo(() => {
    const map = new Map<string | null, ItemRow[]>()
    items.forEach(item => {
      const parentItems = map.get(item.parent_id) || []
      map.set(item.parent_id, [...parentItems, item])
    })
    
    // Sort items by position within each parent group
    map.forEach((children, parentId) => {
      map.set(parentId, children.sort((a, b) => a.position - b.position))
    })
    
    return map
  }, [items])

  const dependenciesByTask = useMemo(() => {
    const blocking = new Map<string, TaskDependencyRow[]>()
    const blockedBy = new Map<string, TaskDependencyRow[]>()

    dependencies.forEach(dep => {
      const blockingTasks = blocking.get(dep.blocking_task_id) || []
      blocking.set(dep.blocking_task_id, [...blockingTasks, dep])

      const blockedByTasks = blockedBy.get(dep.blocked_task_id) || []
      blockedBy.set(dep.blocked_task_id, [...blockedByTasks, dep])
    })

    return { blocking, blockedBy }
  }, [dependencies])

  // Get the ancestry chain for any item
  const getItemAncestry = (itemId: string): ItemRow[] => {
    const ancestry: ItemRow[] = []
    let currentItem = items.find(item => item.id === itemId)
    
    while (currentItem) {
      ancestry.unshift(currentItem)
      currentItem = items.find(item => item.id === currentItem?.parent_id)
    }
    
    return ancestry
  }

  // Get the path from ancestor to descendant (inclusive)
  const getPathBetweenItems = (ancestorId: string, descendantId: string): ItemRow[] => {
    const ancestry = getItemAncestry(descendantId)
    const ancestorIndex = ancestry.findIndex(item => item.id === ancestorId)
    
    if (ancestorIndex === -1) return []
    return ancestry.slice(ancestorIndex)
  }

  // Check if all children of an item are blocked
  const areAllChildrenBlocked = useCallback((itemId: string): boolean => {
    const children = itemsByParent.get(itemId) || []
    if (children.length === 0) return false

    return children.every(child => {
      // Get direct blockage status
      const childBlockedBy = dependenciesByTask.blockedBy.get(child.id) || []
      const isDirectlyBlocked = childBlockedBy.some(dep => {
        const blockingTask = items.find(t => t.id === dep.blocking_task_id)
        return blockingTask && !blockingTask.completed
      })

      // If it has children, check if they're all blocked
      const hasChildren = itemsByParent.has(child.id)
      return isDirectlyBlocked || (hasChildren && areAllChildrenBlocked(child.id))
    })
  }, [itemsByParent, dependenciesByTask.blockedBy, items])

  // Check if an item is blocked (either directly, through children, or by date)
  const isItemBlocked = useCallback((item: ItemRow): boolean => {
    // Check date dependency
    const dateDependency = dateDependencies.find(dep => dep.task_id === item.id)
    if (dateDependency && new Date(dateDependency.unblock_at) > new Date()) {
      return true
    }

    // Check direct task dependency blockage
    const blockedByDeps = dependenciesByTask.blockedBy.get(item.id) || []
    const isDirectlyBlocked = blockedByDeps.some(dep => {
      const blockingTask = items.find(t => t.id === dep.blocking_task_id)
      return blockingTask && !blockingTask.completed
    })

    // If directly blocked, no need to check children
    if (isDirectlyBlocked) return true

    // If has children, check if all children are blocked
    const hasChildren = itemsByParent.has(item.id)
    return hasChildren && areAllChildrenBlocked(item.id)
  }, [dependenciesByTask.blockedBy, items, itemsByParent, areAllChildrenBlocked, dateDependencies])

  const renderTreeView = (parentId = focusedItemId || null) => {
    // Get items for this parent
    const baseItems = itemsByParent.get(parentId) || []
    
    // Filter items based on actionable/blocked status and completion status
    const filteredItems = baseItems.filter(item => {
      const blocked = isItemBlocked(item)
      const blockFilter = (!showOnlyActionable && !showOnlyBlocked) || // Show all
                          (showOnlyActionable && !blocked) || // Show only unblocked
                          (showOnlyBlocked && blocked); // Show only blocked
      
      const completionFilterResult = completionFilter === 'all' || 
                                    (completionFilter === 'completed' && item.completed) ||
                                    (completionFilter === 'not-completed' && !item.completed);
      
      return blockFilter && completionFilterResult;
    })
    
    // Custom sort function that puts items in position order
    const sortedItems = [...filteredItems].sort((a, b) => a.position - b.position)
    
    const content: ReactNode[] = []

    sortedItems.forEach((item, index) => {
      const childItems = itemsByParent.get(item.id) || []
      const hasChildren = childItems.length > 0

      // Recursively render children
      const itemChildren = hasChildren ? (
        <div className="space-y-0.5">
          {renderTreeView(item.id)}
        </div>
      ) : null

      content.push(
        <div key={item.id} className="py-0.5">
          <DropZone
            parentId={item.parent_id}
            position={item.position}
            onMoveItemToPosition={onMoveItemToPosition}
          />
          <Item
            item={item}
            onAddChild={onAddChild}
            onToggleComplete={onToggleComplete}
            onTypeChange={onTypeChange}
            onMoveItem={onMoveItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onFocus={onFocus}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
            onAddDateDependency={onAddDateDependency}
            onRemoveDateDependency={onRemoveDateDependency}
            siblingCount={childItems.length}
            itemPosition={index}
            hasChildren={hasChildren}
            childCount={childItems.length}
            blockingTasks={dependenciesByTask.blocking.get(item.id) || []}
            blockedByTasks={dependenciesByTask.blockedBy.get(item.id) || []}
            dateDependency={dateDependencies.find(dep => dep.task_id === item.id)}
            availableTasks={items}
            childrenBlocked={hasChildren && areAllChildrenBlocked(item.id)}
          >
            {itemChildren}
          </Item>
          {index === sortedItems.length - 1 && (
            <DropZone
              parentId={item.parent_id}
              position={item.position + 1}
              onMoveItemToPosition={onMoveItemToPosition}
            />
          )}
        </div>
      )
    })

    return content
  }

  const renderListView = () => {
    // If there are no items at all, show empty state
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <p className="mb-4 text-lg">No tasks yet</p>
          <button
            onClick={() => onAddChild(null)}
            className="flex items-center justify-center w-10 h-10 text-white bg-blue-500 rounded-full hover:bg-blue-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )
    }

    // Find tasks to show based on the focused item
    let sortedTasks = []
    
    // If we have a focused item, show its immediate children
    if (focusedItemId) {
      sortedTasks = [...(itemsByParent.get(focusedItemId) || [])]
    } else {
      // If we're at the root level, show all bottom-level tasks (items without children)
      // Bottom level tasks are those that don't have any children
      sortedTasks = items.filter(item => !itemsByParent.has(item.id))
    }

    // Apply filters for completion and blocked status
    sortedTasks = sortedTasks.filter(item => {
      const blocked = isItemBlocked(item)
      const blockFilter = (!showOnlyActionable && !showOnlyBlocked) || // Show all
                          (showOnlyActionable && !blocked) || // Show only unblocked
                          (showOnlyBlocked && blocked); // Show only blocked
      
      const completionFilterResult = completionFilter === 'all' || 
                                    (completionFilter === 'completed' && item.completed) ||
                                    (completionFilter === 'not-completed' && !item.completed);
      
      return blockFilter && completionFilterResult;
    });

    // Sort by position
    sortedTasks.sort((a, b) => a.position - b.position)

    // If no tasks match our criteria, show empty state
    if (sortedTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <p className="mb-4 text-lg">No tasks here yet</p>
          <button
            onClick={() => onAddChild(focusedItemId)}
            className="flex items-center justify-center w-10 h-10 text-white bg-blue-500 rounded-full hover:bg-blue-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-0.5">
        {/* Add a drop zone at the beginning for empty lists or at position 0 */}
        {sortedTasks.length === 0 ? (
          <DropZone
            parentId={focusedItemId || null}
            position={0}
            onMoveItemToPosition={onMoveItemToPosition}
          />
        ) : (
          <DropZone
            parentId={sortedTasks[0].parent_id}
            position={0}
            onMoveItemToPosition={onMoveItemToPosition}
          />
        )}
        
        {sortedTasks.map((task) => {
          // Show breadcrumbs if we're at root level or if we're focused and this task is deeper than the focused item
          const breadcrumbs = !focusedItemId
            ? getItemAncestry(task.id).slice(0, -1) // Show full ancestry except the task itself when at root
            : task.id !== focusedItemId
              ? getPathBetweenItems(focusedItemId, task.id).slice(1, -1) // Show path between focused item and task
              : []

          const hasChildren = itemsByParent.has(task.id)

          return (
            <div key={task.id} className="py-0.5">
              <div className="bg-white rounded">
                {breadcrumbs.length > 0 && (
                  <div className="p-2 bg-gray-50 rounded-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {breadcrumbs.map((ancestor, i) => (
                        <Fragment key={ancestor.id}>
                          <button
                            onClick={() => onFocus(ancestor.id)}
                            className="hover:text-gray-900"
                          >
                            {ancestor.title}
                          </button>
                          {i < breadcrumbs.length - 1 && (
                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
                <Item
                  item={task}
                  onAddChild={onAddChild}
                  onToggleComplete={onToggleComplete}
                  onTypeChange={onTypeChange}
                  onMoveItem={onMoveItem}
                  onUpdateItem={onUpdateItem}
                  onDeleteItem={onDeleteItem}
                  onFocus={onFocus}
                  onAddDependency={onAddDependency}
                  onRemoveDependency={onRemoveDependency}
                  onAddDateDependency={onAddDateDependency}
                  onRemoveDateDependency={onRemoveDateDependency}
                  siblingCount={1}
                  itemPosition={0}
                  hasChildren={hasChildren}
                  childCount={itemsByParent.get(task.id)?.length || 0}
                  blockingTasks={dependenciesByTask.blocking.get(task.id) || []}
                  blockedByTasks={dependenciesByTask.blockedBy.get(task.id) || []}
                  dateDependency={dateDependencies.find(dep => dep.task_id === task.id)}
                  availableTasks={items}
                  childrenBlocked={hasChildren && areAllChildrenBlocked(task.id)}
                />
              </div>
              {/* Add a drop zone after each item */}
              <DropZone
                parentId={task.parent_id}
                position={task.position + 1}
                onMoveItemToPosition={onMoveItemToPosition}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative space-y-2">
      {focusedItemId && (
        <Breadcrumb
          items={getItemAncestry(focusedItemId)}
          onNavigate={onFocus}
        />
      )}
      {viewMode === 'tree' ? (
        <div className="space-y-0.5">
          {renderTreeView()}
        </div>
      ) : renderListView()}
    </div>
  )
} 