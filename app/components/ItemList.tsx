import { useMemo, useCallback, type ReactNode, useEffect, useState } from 'react'
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
  createSubtask: (parentId: string, title: string) => void
  reorderSubtasks: (parentId: string, subtaskIds: string[]) => void
  focusedItemId: string | null
  viewMode: 'tree' | 'list'
  showOnlyActionable: boolean
  showOnlyBlocked: boolean
  completionFilter: 'all' | 'completed' | 'not-completed'
  searchQuery: string
  childCount?: Record<string, number>
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
  createSubtask,
  reorderSubtasks,
  focusedItemId,
  viewMode,
  showOnlyActionable,
  showOnlyBlocked,
  completionFilter,
  searchQuery,
  childCount = {}
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
  const getItemAncestry = useCallback((itemId: string): ItemRow[] => {
    const ancestry: ItemRow[] = [];
    let currentItem = items.find(item => item.id === itemId);
    
    while (currentItem) {
      ancestry.unshift(currentItem); // Add to the beginning of the array
      currentItem = items.find(item => item.id === currentItem?.parent_id);
    }
    
    return ancestry;
  }, [items]);

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

  // Find all items matching the search query
  const searchMatchingItemIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    
    const normalizedQuery = searchQuery.toLowerCase().trim()
    const directMatchIds = new Set<string>()
    const matchingIds = new Set<string>()
    
    // First, find directly matching items
    items.forEach(item => {
      if (
        (item.title && item.title.toLowerCase().includes(normalizedQuery)) ||
        (item.description && item.description.toLowerCase().includes(normalizedQuery))
      ) {
        directMatchIds.add(item.id)
        matchingIds.add(item.id)
        
        // Add all ancestors to ensure they're visible
        const ancestors = getItemAncestry(item.id)
        ancestors.forEach(ancestor => matchingIds.add(ancestor.id))
      }
    })
    
    // For each directly matching item, add all its descendants
    const processedItems = new Set<string>()
    
    // Function to recursively add all descendants of an item
    const addDescendants = (itemId: string) => {
      if (processedItems.has(itemId)) return
      processedItems.add(itemId)
      
      const children = itemsByParent.get(itemId) || []
      children.forEach(child => {
        matchingIds.add(child.id)
        addDescendants(child.id)
      })
    }
    
    // Process only directly matching items to add their descendants
    Array.from(directMatchIds).forEach(itemId => {
      addDescendants(itemId)
    })
    
    return matchingIds
  }, [items, searchQuery, itemsByParent, getItemAncestry])

  const renderTreeView = (parentId = focusedItemId || null) => {
    // Get items for this parent
    const baseItems = itemsByParent.get(parentId) || []
    
    // Filter items based on actionable/blocked status, completion status, and search results
    const filteredItems = baseItems.filter(item => {
      // If we have an active search, only show items in the search results
      if (searchQuery.trim() && !searchMatchingItemIds.has(item.id)) {
        return false
      }
      
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
            onCreateSubtask={createSubtask}
            onReorderSubtasks={reorderSubtasks}
            siblingCount={childItems.length}
            itemPosition={index}
            hasChildren={hasChildren}
            childCount={childItems.length}
            blockingTasks={dependenciesByTask.blocking.get(item.id) || []}
            blockedByTasks={dependenciesByTask.blockedBy.get(item.id) || []}
            dateDependency={dateDependencies.find(dep => dep.task_id === item.id)}
            availableTasks={items}
            childrenBlocked={hasChildren && areAllChildrenBlocked(item.id)}
            isSearchMatch={
              !!searchQuery.trim() && 
              searchMatchingItemIds.has(item.id) && 
              !!(
                (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase().trim()))
              )
            }
            searchQuery={searchQuery}
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

    // First, we always identify bottom-level tasks (tasks with no children)
    const bottomLevelTasks = items.filter(item => {
      return !items.some(child => child.parent_id === item.id)
    })

    // Then determine which of these tasks to display based on search and focus
    let displayedTasks = bottomLevelTasks
    
    // If there's a search query, restrict to items that are in searchMatchingItemIds
    if (searchQuery.trim()) {
      displayedTasks = bottomLevelTasks.filter(item => searchMatchingItemIds.has(item.id))
    } else if (focusedItemId) {
      // If focused and no search, get bottom level tasks under the focused item
      const getBottomLevelTasksUnderParent = (parentId: string): ItemRow[] => {
        const result: ItemRow[] = []
        const queue = [parentId]
        
        // First check if the focused item itself is a bottom-level task
        const focusedItem = items.find(item => item.id === parentId)
        const focusedItemHasChildren = items.some(item => item.parent_id === parentId)
        
        if (focusedItem && !focusedItemHasChildren) {
          // If the focused item has no children, include it in the results
          result.push(focusedItem)
        }
        
        while (queue.length > 0) {
          const current = queue.shift()!
          const children = itemsByParent.get(current) || []
          
          for (const child of children) {
            const grandchildren = itemsByParent.get(child.id) || []
            if (grandchildren.length === 0) {
              result.push(child)
            } else {
              queue.push(child.id)
            }
          }
        }
        
        return result
      }
      
      displayedTasks = getBottomLevelTasksUnderParent(focusedItemId)
    }
    // If neither search nor focus, we already have all bottom level tasks in displayedTasks

    // Apply filters for completion and blocked status
    const filteredTasks = displayedTasks.filter(item => {
      const blocked = isItemBlocked(item)
      const blockFilter = (!showOnlyActionable && !showOnlyBlocked) || // Show all
                          (showOnlyActionable && !blocked) || // Show only unblocked
                          (showOnlyBlocked && blocked); // Show only blocked
      
      const completionFilterResult = completionFilter === 'all' || 
                                    (completionFilter === 'completed' && item.completed) ||
                                    (completionFilter === 'not-completed' && !item.completed);
      
      return blockFilter && completionFilterResult;
    });

    // Sort tasks by ancestry and position
    filteredTasks.sort((a, b) => {
      const aAncestry = getItemAncestry(a.id);
      const bAncestry = getItemAncestry(b.id);
      
      // Compare each level of ancestry
      const minLength = Math.min(aAncestry.length, bAncestry.length);
      
      for (let i = 0; i < minLength; i++) {
        // If ancestors differ at this level, sort by position
        if (aAncestry[i].id !== bAncestry[i].id) {
          return aAncestry[i].position - bAncestry[i].position;
        }
      }
      
      // If one path is shorter, it comes first
      if (aAncestry.length !== bAncestry.length) {
        return aAncestry.length - bAncestry.length;
      }
      
      // If paths are same length and have same ancestors, sort by position
      return a.position - b.position;
    });

    // If no tasks match our criteria, show empty state
    if (filteredTasks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <p className="mb-4 text-lg">{searchQuery.trim() ? 'No matching tasks found' : 'No tasks here yet'}</p>
          {!searchQuery.trim() && (
            <button
              onClick={() => onAddChild(focusedItemId)}
              className="flex items-center justify-center w-10 h-10 text-white bg-blue-500 rounded-full hover:bg-blue-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-0.5">
        {/* Add a drop zone at the beginning for empty lists or at position 0 */}
        {filteredTasks.length === 0 ? (
          <DropZone
            parentId={focusedItemId || null}
            position={0}
            onMoveItemToPosition={onMoveItemToPosition}
          />
        ) : (
          <DropZone
            parentId={filteredTasks[0].parent_id}
            position={0}
            onMoveItemToPosition={onMoveItemToPosition}
          />
        )}
        
        {filteredTasks.map((task) => {
          // Show breadcrumbs if we're at root level or if we're focused and this task is deeper than the focused item
          const breadcrumbs = !focusedItemId || searchQuery.trim()
            ? getItemAncestry(task.id).slice(0, -1) // Show full ancestry except the task itself when at root or searching
            : task.id !== focusedItemId
              ? getPathBetweenItems(focusedItemId, task.id).slice(1, -1) // Show path between focused item and task
              : []

          return (
            <div key={task.id} className="py-0.5">
              <div className="bg-white rounded">
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
                  onCreateSubtask={createSubtask}
                  onReorderSubtasks={reorderSubtasks}
                  siblingCount={1}
                  itemPosition={0}
                  hasChildren={false}
                  childCount={0}
                  blockingTasks={dependenciesByTask.blocking.get(task.id) || []}
                  blockedByTasks={dependenciesByTask.blockedBy.get(task.id) || []}
                  dateDependency={dateDependencies.find(dep => dep.task_id === task.id)}
                  availableTasks={items}
                  childrenBlocked={false}
                  isSearchMatch={
                    !!searchQuery.trim() && 
                    searchMatchingItemIds.has(task.id) && 
                    !!(
                      (task.title && task.title.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase().trim()))
                    )
                  }
                  searchQuery={searchQuery}
                  breadcrumbs={breadcrumbs}
                  onNavigate={onFocus}
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
      {focusedItemId && !searchQuery.trim() && (
        <Breadcrumb
          items={getItemAncestry(focusedItemId)}
          onNavigate={onFocus}
        />
      )}
      {viewMode === 'tree' ? (
        <div className="space-y-0.5">
          {focusedItemId && !searchQuery.trim() ? (
            // When focused and not searching, render the focused item first, then its children
            <>
              {(() => {
                const focusedItem = items.find(item => item.id === focusedItemId);
                if (!focusedItem) return null;

                const childItems = itemsByParent.get(focusedItem.id) || [];
                const hasChildren = childItems.length > 0;

                // Recursively render children
                const itemChildren = hasChildren ? (
                  <div className="space-y-0.5 ml-6 mt-2">
                    {renderTreeView(focusedItem.id)}
                  </div>
                ) : null;

                return (
                  <div key={focusedItem.id} className="py-0.5">
                    <Item
                      item={focusedItem}
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
                      onCreateSubtask={createSubtask}
                      onReorderSubtasks={reorderSubtasks}
                      siblingCount={childItems.length}
                      itemPosition={0}
                      hasChildren={hasChildren}
                      childCount={childItems.length}
                      blockingTasks={dependenciesByTask.blocking.get(focusedItem.id) || []}
                      blockedByTasks={dependenciesByTask.blockedBy.get(focusedItem.id) || []}
                      dateDependency={dateDependencies.find(dep => dep.task_id === focusedItem.id)}
                      availableTasks={items}
                      childrenBlocked={hasChildren && areAllChildrenBlocked(focusedItem.id)}
                      isSearchMatch={false}
                      searchQuery={searchQuery}
                    >
                      {itemChildren}
                    </Item>
                  </div>
                );
              })()}
            </>
          ) : (
            // Normal tree view (not focused or searching)
            renderTreeView()
          )}
        </div>
      ) : renderListView()}
    </div>
  )
} 