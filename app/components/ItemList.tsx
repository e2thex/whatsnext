import { useMemo, useCallback, type ReactNode, useEffect, useState } from 'react'
import { Item } from './Item'
import { useDrop } from 'react-dnd'
import { type Database } from '../../src/lib/supabase/client'
import { Breadcrumb } from './Breadcrumb'
import { useDragDropManager } from 'react-dnd'
import { Item as DbItem, Dependencies } from '@/app/components/types'
import { Item as UiItem } from '@/app/types'
import { db, type DB } from '@/src/app/Entry'
import { supabase } from '@/src/lib/supabase/client'

type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']

const isTaskDependency = (dep: Dependencies[number]): dep is { type: 'Task', data: TaskDependencyRow } => {
  return dep.type === 'Task';
}

const isDateDependency = (dep: Dependencies[number]): dep is { type: 'Date', data: DateDependencyRow } => {
  return dep.type === 'Date';
}

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
  isAnyItemEditing?: boolean
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

function DropZone({ parentId, position, onMoveItemToPosition, isAnyItemEditing = false }: DropZoneProps) {
  const anyDragging = useAnyDragging()
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: 'ITEM',
    drop: (item) => {
      onMoveItemToPosition(item.id, position, parentId)
      return undefined
    },
    canDrop: () => !isAnyItemEditing,
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
  db: DB
  entries: DbItem[]
  onFocus: (id: string | null) => void
  focusedItemId: string | null
  viewMode: 'list' | 'tree'
  showOnlyActionable: boolean
  showOnlyBlocked: boolean
  completionFilter: 'all' | 'completed' | 'not-completed'
  searchQuery: string
  childCount: Map<string, number>
}

export function ItemList({ 
  db,
  entries,
  onFocus,
  focusedItemId,
  viewMode,
  showOnlyActionable,
  showOnlyBlocked,
  completionFilter,
  searchQuery,
  childCount
}: ItemListProps) {
  console.log('ItemList render - entries length:', entries.length);
  const [isAnyItemEditing, setIsAnyItemEditing] = useState(false);

  const itemsByParent = useMemo(() => {
    console.log('Computing itemsByParent');
    const map = new Map<string | null, DbItem[]>()
    entries.forEach(item => {
      const parentItems = map.get(item.parent_id) || []
      map.set(item.parent_id, [...parentItems, item])
    })
    
    // Sort items by position within each parent group
    map.forEach((children, parentId) => {
      map.set(parentId, children.sort((a, b) => a.position - b.position))
    })
    
    return map
  }, [entries])

  const dependenciesByTask = useMemo(() => {
    console.log('Computing dependenciesByTask');
    const blocking = new Map<string, TaskDependencyRow[]>()
    const blockedBy = new Map<string, Dependencies>()

    entries.forEach(item => {
      // Handle blocking tasks (tasks that this item blocks)
      item.blocking.forEach(dep => {
        const blockingTasks = blocking.get(dep.blocked_task_id) || []
        blocking.set(dep.blocked_task_id, [...blockingTasks, dep])
      })

      // Handle blocked by tasks (tasks that block this item)
      item.blockedBy.forEach(dep => {
        if (dep.type === 'Task') {
          const blockedByTasks = blockedBy.get(item.id) || []
          blockedBy.set(item.id, [...blockedByTasks, dep])
        }
      })
    })

    return { blocking, blockedBy }
  }, [entries])

  // Get the ancestry chain for any item
  const getItemAncestry = useCallback((itemId: string): DbItem[] => {
    const ancestry: DbItem[] = [];
    let currentItem = entries.find(item => item.id === itemId);
    
    while (currentItem) {
      ancestry.unshift(currentItem); // Add to the beginning of the array
      currentItem = entries.find(item => item.id === currentItem?.parent_id);
    }
    
    return ancestry;
  }, [entries]);

  // Get the path from ancestor to descendant (inclusive)
  const getPathBetweenItems = (ancestorId: string, descendantId: string): DbItem[] => {
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
      const isDirectlyBlocked = child.isBlocked

      // If it has children, check if they're all blocked
      const hasChildren = itemsByParent.has(child.id)
      return isDirectlyBlocked || (hasChildren && areAllChildrenBlocked(child.id))
    })
  }, [itemsByParent])

  // Check if an item is blocked (either directly, through children, or by date)
  const isItemBlocked = useCallback((item: DbItem): boolean => {
    // If directly blocked, no need to check children
    if (item.isBlocked) return true

    // If has children, check if all children are blocked
    const hasChildren = itemsByParent.has(item.id)
    return hasChildren && areAllChildrenBlocked(item.id)
  }, [itemsByParent, areAllChildrenBlocked])

  // Find all items matching the search query
  const searchMatchingItemIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    
    const normalizedQuery = searchQuery.toLowerCase().trim()
    const directMatchIds = new Set<string>()
    const matchingIds = new Set<string>()
    
    // First, find directly matching items
    entries.forEach(item => {
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
  }, [entries, searchQuery, itemsByParent, getItemAncestry])

  const onMoveItemToPosition = useCallback(async (itemId: string, newPosition: number, parentId: string | null) => {
    const item = entries.find(i => i.id === itemId)
    if (!item) return

    await item.update({ position: newPosition, parent_id: parentId })
  }, [entries])

  const onAddChild = useCallback(async (parentId: string | null) => {
    const newItem = await db.create({
      title: '',
      description: '',
      type: 'task',
      parent_id: parentId,
      position: itemsByParent.get(parentId)?.length || 0,
      completed: false,
      user_id: db.userId
    })
    
    if (newItem) {
      onFocus(newItem.id)
    }
  }, [itemsByParent, db, onFocus])

  const onToggleComplete = useCallback(async (id: string) => {
    const item = entries.find(i => i.id === id)
    if (!item) return

    await item.update({ completed: !item.completed })
  }, [entries])

  const onAddDependency = useCallback(async (blockingTaskId: string, blockedTaskId: string) => {
    const blockingTask = entries.find(i => i.id === blockingTaskId)
    const blockedTask = entries.find(i => i.id === blockedTaskId)
    
    if (!blockingTask || !blockedTask) return

    // Create a new task dependency through the blockedTask's update method
    await blockedTask.update({
      blockedBy: [...blockedTask.blockedBy, { 
        type: 'Task', 
        data: {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          blocking_task_id: blockingTaskId,
          blocked_task_id: blockedTaskId,
          user_id: db.userId
        }
      }]
    })
  }, [entries, db])

  const onRemoveDependency = useCallback(async (blockingTaskId: string, blockedTaskId: string) => {
    const blockedTask = entries.find(i => i.id === blockedTaskId)
    if (!blockedTask) return

    await blockedTask.update({
      blockedBy: blockedTask.blockedBy.filter(dep => {
        if (isTaskDependency(dep)) {
          return dep.data.blocking_task_id !== blockingTaskId
        }
        return true
      })
    })
  }, [entries])

  const onAddDateDependency = useCallback(async (taskId: string, unblockAt: Date) => {
    const task = entries.find(i => i.id === taskId)
    if (!task) return

    // Create a new date dependency through the task's update method
    await task.update({
      blockedBy: [...task.blockedBy, { 
        type: 'Date', 
        data: {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          task_id: taskId,
          unblock_at: unblockAt.toISOString(),
          user_id: db.userId
        }
      }]
    })
  }, [entries, db])

  const onRemoveDateDependency = useCallback(async (taskId: string) => {
    const task = entries.find(i => i.id === taskId)
    if (!task) return

    await task.update({
      blockedBy: task.blockedBy.filter(dep => {
        if (isDateDependency(dep)) {
          return dep.data.task_id !== taskId
        }
        return true
      })
    })
  }, [entries])

  const onDeleteItem = useCallback(async (itemId: string, deleteChildren: boolean) => {
    const item = entries.find(i => i.id === itemId)
    if (!item) return

    await item.delete(deleteChildren)
  }, [entries])

  const renderItem = (item: DbItem, index: number, parentId: string | null) => {
    const blockingTasks = item.blocking
    const blockedByTasks = item.blockedBy.filter(isTaskDependency).map(dep => dep.data)
    const dateDependency = item.blockedBy.find(isDateDependency)?.data

    const handleMoveItem = (dragIndex: number, hoverIndex: number) => {
      const draggedItem = entries[dragIndex]
      if (draggedItem) {
        onMoveItemToPosition(draggedItem.id, hoverIndex, parentId)
      }
    }

    return (
      <div key={item.id}>
        <DropZone
          parentId={parentId}
          position={index}
          onMoveItemToPosition={onMoveItemToPosition}
          isAnyItemEditing={isAnyItemEditing}
        />
        <Item
          item={{
            ...item,
            type: item.type === 'task' ? 'task' : 'mission',
            blockedBy: item.blockedBy.map(dep => {
              if (isTaskDependency(dep)) {
                return {
                  type: 'Task' as const,
                  data: {
                    id: dep.data.blocking_task_id,
                    created_at: dep.data.created_at,
                    blocking_task_id: dep.data.blocking_task_id,
                    blocked_task_id: dep.data.blocked_task_id,
                    user_id: dep.data.user_id
                  }
                }
              } else if (isDateDependency(dep)) {
                return {
                  type: 'Date' as const,
                  data: {
                    id: dep.data.task_id,
                    created_at: dep.data.created_at,
                    task_id: dep.data.task_id,
                    unblock_at: dep.data.unblock_at,
                    user_id: dep.data.user_id
                  }
                }
              }
              return {
                type: 'Task' as const,
                data: {
                  id: '',
                  created_at: new Date().toISOString(),
                  blocking_task_id: '',
                  blocked_task_id: '',
                  user_id: ''
                }
              }
            })
          }}
          itemPosition={index}
          siblingCount={itemsByParent.get(parentId)?.length || 0}
          onAddChild={onAddChild}
          onToggleComplete={onToggleComplete}
          onFocus={onFocus}
          onAddDependency={onAddDependency}
          onRemoveDependency={onRemoveDependency}
          onAddDateDependency={onAddDateDependency}
          onRemoveDateDependency={onRemoveDateDependency}
          hasChildren={itemsByParent.has(item.id)}
          childCount={childCount.get(item.id) || 0}
          blockingTasks={blockingTasks}
          blockedByTasks={blockedByTasks}
          dateDependency={dateDependency}
          availableTasks={entries}
          isSearchMatch={searchMatchingItemIds.has(item.id)}
          breadcrumbs={getItemAncestry(item.id)}
          onNavigate={onFocus}
          searchQuery={searchQuery}
        />
      </div>
    )
  }

  const renderTreeView = (parentId = focusedItemId || null) => {
    console.log('Rendering tree view for parentId:', parentId);
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
    
    console.log('Filtered items count:', filteredItems.length);
    
    // Custom sort function that puts items in position order
    const sortedItems = [...filteredItems].sort((a, b) => a.position - b.position)
    
    const content: ReactNode[] = []
    console.log(sortedItems, 'sortedItems');
    sortedItems.forEach((item, index) => {
      const childItems = itemsByParent.get(item.id) || []
      const hasChildren = childItems.length > 0
      
      // Continue with rendering as before
      const itemChildren = hasChildren ? (
        <div className="space-y-0.5">
          {renderTreeView(item.id)}
        </div>
      ) : null;

      content.push(
        <div key={item.id} className="py-0.5">
          {renderItem(item, index, item.parent_id)}
        </div>
      )
    })
    console.log(content, 'content');
    return content
  }

  const renderListView = () => {
    console.log('Rendering list view');
    // Get all items that are at the root level or under the focused item
    const baseItems = itemsByParent.get(focusedItemId || null) || []
    
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
    
    console.log('Filtered items count:', filteredItems.length);
    
    console.log('sortedItems', filteredItems);
    // Custom sort function that puts items in position order
    const sortedItems = [...filteredItems].sort((a, b) => a.position - b.position)
    console.log(sortedItems, 'sortedItems');
    return (
      <div className="space-y-0.5">
        {sortedItems.map((item, index) => (
          <div key={item.id} className="py-0.5">
            {renderItem(item, index, item.parent_id)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {(() => {
        console.log('Rendering view mode:', viewMode);
        return viewMode === 'tree' ? renderTreeView() : renderListView();
      })()}
    </div>
  )
} 