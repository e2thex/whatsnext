import { useMemo, useCallback, type ReactNode, Fragment } from 'react'
import { Item } from './Item'
import { useDrop } from 'react-dnd'
import { type Database, type ItemType } from '../../src/lib/supabase/client'
import { Breadcrumb } from './Breadcrumb'

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

function DropZone({ parentId, position, onMoveItemToPosition }: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: 'ITEM',
    drop: (item) => {
      onMoveItemToPosition(item.id, position, parentId)
      return undefined
    },
    canDrop: () => true,
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })

  const setDropRef = useCallback((node: HTMLDivElement | null) => {
    drop(node)
  }, [drop])

  return (
    <div
      ref={setDropRef}
      className={`
        h-2 -my-1 rounded-sm transition-all duration-200 ease-in-out
        ${canDrop ? 'h-6 -my-3 border border-dashed' : ''}
        ${isOver && canDrop ? 'border-indigo-500 bg-indigo-100' : 'border-gray-300'}
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
  showOnlyBlocked
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

  // Get all bottom-level tasks (tasks without children)
  const getBottomLevelTasks = useMemo(() => {
    return items.filter(item => !itemsByParent.has(item.id))
  }, [items, itemsByParent])

  // Get all bottom-level tasks (tasks without children) under a specific parent
  const getBottomLevelTasksUnderParent = useCallback((parentId: string | null) => {
    const result: ItemRow[] = []
    const queue = [...(itemsByParent.get(parentId) || [])]
    
    while (queue.length > 0) {
      const current = queue.shift()!
      const children = itemsByParent.get(current.id) || []
      
      if (children.length === 0) {
        result.push(current)
      } else {
        queue.push(...children)
      }
    }
    
    return result
  }, [itemsByParent])

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

  // Get the path from ancestor to descendant (inclusive)
  const getPathBetweenItems = (ancestorId: string, descendantId: string): ItemRow[] => {
    const ancestry = getItemAncestry(descendantId)
    const startIndex = ancestry.findIndex(item => item.id === ancestorId)
    return startIndex >= 0 ? ancestry.slice(startIndex) : []
  }

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

  const renderTreeView = (parentId: string | null): ReactNode[] => {
    const children = itemsByParent.get(parentId) || []
    const result: ReactNode[] = []

    // Add initial drop zone for this level
    if (!focusedItemId || focusedItemId === parentId) {
      result.push(
        <DropZone
          key={`dropzone-${parentId}-0`}
          parentId={parentId}
          position={0}
          onMoveItemToPosition={onMoveItemToPosition}
        />
      )
    }

    children.forEach((item, index) => {
      const itemChildren = itemsByParent.get(item.id) || []
      const hasChildren = itemChildren.length > 0
      const isBlocked = isItemBlocked(item)
      const shouldShowItem = (!focusedItemId || 
        // Show if this is the focused item
        focusedItemId === item.id || 
        // Show if this item is a descendant of the focused item
        getItemAncestry(item.id).some(ancestor => ancestor.id === focusedItemId)) &&
        // Apply filters
        ((!showOnlyActionable && !showOnlyBlocked) || // Show all
         (showOnlyActionable && !isBlocked) || // Show only unblocked
         (showOnlyBlocked && isBlocked)) // Show only blocked

      if (shouldShowItem) {
        result.push(
          <Item
            key={item.id}
            item={item}
            onAddChild={onAddChild}
            onToggleComplete={onToggleComplete}
            onTypeChange={onTypeChange}
            onMoveItem={onMoveItem}
            onMoveItemToPosition={onMoveItemToPosition}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onFocus={onFocus}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
            onAddDateDependency={onAddDateDependency}
            onRemoveDateDependency={onRemoveDateDependency}
            siblingCount={children.length}
            itemPosition={index}
            hasChildren={hasChildren}
            childCount={itemChildren.length}
            blockingTasks={dependenciesByTask.blocking.get(item.id) || []}
            blockedByTasks={dependenciesByTask.blockedBy.get(item.id) || []}
            dateDependency={dateDependencies.find(dep => dep.task_id === item.id)}
            availableTasks={items}
            childrenBlocked={hasChildren && areAllChildrenBlocked(item.id)}
          >
            {renderTreeView(item.id)}
          </Item>
        )

        result.push(
          <DropZone
            key={`dropzone-${parentId}-${index + 1}`}
            parentId={parentId}
            position={index + 1}
            onMoveItemToPosition={onMoveItemToPosition}
          />
        )
      } else if (hasChildren) {
        result.push(...renderTreeView(item.id))
      }
    })

    return result
  }

  const renderListView = () => {
    const tasksToShow = focusedItemId 
      ? getBottomLevelTasksUnderParent(focusedItemId)
      : getBottomLevelTasks

    // Apply filters
    const filteredTasks = tasksToShow.filter(task => {
      const isBlocked = isItemBlocked(task)
      return (!showOnlyActionable && !showOnlyBlocked) || // Show all
             (showOnlyActionable && !isBlocked) || // Show only unblocked
             (showOnlyBlocked && isBlocked) // Show only blocked
    })
    
    return (
      <div className="space-y-4">
        {filteredTasks.map(task => {
          // Show breadcrumbs if we're at root level or if we're focused and this task is deeper than the focused item
          const breadcrumbs = !focusedItemId
            ? getItemAncestry(task.id).slice(0, -1) // Show full ancestry except the task itself when at root
            : task.id !== focusedItemId
              ? getPathBetweenItems(focusedItemId, task.id).slice(1, -1) // Show path between focused item and task
              : []

          const hasChildren = itemsByParent.has(task.id)

          return (
            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              {breadcrumbs.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {breadcrumbs.map((ancestor, index) => (
                      <Fragment key={ancestor.id}>
                        <button
                          onClick={() => onFocus(ancestor.id)}
                          className="hover:text-gray-900"
                        >
                          {ancestor.title}
                        </button>
                        {index < breadcrumbs.length - 1 && (
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
                onMoveItemToPosition={onMoveItemToPosition}
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
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      {focusedItemId && (
        <Breadcrumb
          items={getItemAncestry(focusedItemId)}
          onNavigate={onFocus}
        />
      )}
      {viewMode === 'tree' ? renderTreeView(null) : renderListView()}
    </div>
  )
} 