import { useCallback, type ReactNode, useEffect, useState } from 'react'
import { Item } from './Item'
import { useDrop } from 'react-dnd'
import { useDragDropManager } from 'react-dnd'
import { Item as DbItem } from './types'
import { DB } from './types'


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
  searchQuery
}: ItemListProps) {
  console.log('ItemList render - entries length:', entries.length);
  const [isAnyItemEditing, setIsAnyItemEditing] = useState(false);

  // Calculate childCount from entriesTreeMap
  const childCount = new Map<string, number>();
  db.entriesTreeMap.forEach((children, parentId) => {
    childCount.set(parentId, children.length);
  });

  // Convert itemsByParent from useMemo to regular computation
  const itemsByParent = (() => {
    console.log('Computing itemsByParent');
    const map = new Map<string | null, DbItem[]>()
    entries.forEach(item => {
      const parentItems = map.get(item.core.parent_id) || []
      map.set(item.core.parent_id, [...parentItems, item])
    })
    
    // Sort items by position within each parent group
    map.forEach((children, parentId) => {
      map.set(parentId, children.sort((a, b) => a.core.position - b.core.position))
    })
    
    return map
  })()

  // Get the ancestry chain for any item
  const getItemAncestry = (itemId: string): DbItem[] => {
    const ancestry: DbItem[] = [];
    let currentItem = entries.find(item => item.core.id === itemId);
    
    while (currentItem) {
      ancestry.unshift(currentItem); // Add to the beginning of the array
      currentItem = entries.find(item => item.core.id === currentItem?.core.parent_id);
    }
    
    return ancestry;
  }

  // Find all items matching the search query
  const searchMatchingItemIds = (() => {
    if (!searchQuery.trim()) return new Set<string>()
    
    const normalizedQuery = searchQuery.toLowerCase().trim()
    const directMatchIds = new Set<string>()
    const matchingIds = new Set<string>()
    
    // First, find directly matching items
    entries.forEach(item => {
      if (
        (item.core.title && item.core.title.toLowerCase().includes(normalizedQuery)) ||
        (item.core.description && item.core.description.toLowerCase().includes(normalizedQuery))
      ) {
        directMatchIds.add(item.core.id)
        matchingIds.add(item.core.id)
        
        // Add all ancestors to ensure they're visible
        const ancestors = getItemAncestry(item.core.id)
        ancestors.forEach(ancestor => matchingIds.add(ancestor.core.id))
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
        matchingIds.add(child.core.id)
        addDescendants(child.core.id)
      })
    }
    
    // Process only directly matching items to add their descendants
    Array.from(directMatchIds).forEach(itemId => {
      addDescendants(itemId)
    })
    
    return matchingIds
  })()

  const onMoveItemToPosition = useCallback(async (itemId: string, newPosition: number, parentId: string | null) => {
    const item = entries.find(i => i.core.id === itemId)
    if (!item) return

    await item.update({ core: { position: newPosition, parent_id: parentId } })
  }, [entries])

  const onAddChild = useCallback(async (item: DbItem) => {
    const newItem = await db.create({
      title: '',
      description: '',
      type: 'task',
      parent_id: item.core.id,
      position: itemsByParent.get(item.core.id)?.length || 0,
      completed: false,
      user_id: db.userId
    })
    
    if (newItem) {
      onFocus(newItem.core.id)
    }
  }, [itemsByParent, db, onFocus])

  const onToggleComplete = useCallback(async (item: DbItem) => {
    await item.update({ core: { completed: !item.core.completed } })
  }, [])

  const onFocusItem = useCallback((item: DbItem) => {
    onFocus(item.core.id)
  }, [onFocus])

  const renderItem = (item: DbItem, index: number, parentId: string | null) => {
    return (
      <div key={item.core.id}>
        <DropZone
          parentId={parentId}
          position={index}
          onMoveItemToPosition={onMoveItemToPosition}
          isAnyItemEditing={isAnyItemEditing}
        />
        <Item
          item={item}
          onAddChild={onAddChild}
          onToggleComplete={onToggleComplete}
          searchQuery={searchQuery}
          viewMode={viewMode}
          onEditingChange={setIsAnyItemEditing}
          breadcrumbs={getItemAncestry(item.core.id).map(i => ({ id: i.core.id, title: i.core.title }))}
          onNavigate={onFocus}
          onFocus={onFocusItem}
          siblingCount={itemsByParent.get(parentId)?.length || 0}
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
      if (searchQuery.trim() && !searchMatchingItemIds.has(item.core.id)) {
        return false
      }
      
      const blocked = item.isBlocked
      const blockFilter = (!showOnlyActionable && !showOnlyBlocked) || // Show all
                          (showOnlyActionable && !blocked) || // Show only unblocked
                          (showOnlyBlocked && blocked); // Show only blocked
      
      const completionFilterResult = completionFilter === 'all' || 
                                    (completionFilter === 'completed' && item.core.completed) ||
                                    (completionFilter === 'not-completed' && !item.core.completed);
      
      return blockFilter && completionFilterResult;
    })
    
    console.log('Filtered items count:', filteredItems.length);
    
    // Custom sort function that puts items in position order
    const sortedItems = [...filteredItems].sort((a, b) => a.core.position - b.core.position)
    
    const content: ReactNode[] = []
    console.log(sortedItems, 'sortedItems');
    sortedItems.forEach((item, index) => {
      const childItems = itemsByParent.get(item.core.id) || []
      const hasChildren = childItems.length > 0
      
      // Continue with rendering as before
      const itemChildren = hasChildren ? (
        <div className="space-y-0.5">
          {renderTreeView(item.core.id)}
        </div>
      ) : null;

      content.push(
        <div key={item.core.id} className="py-0.5">
          {renderItem(item, index, item.core.parent_id)}
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
      if (searchQuery.trim() && !searchMatchingItemIds.has(item.core.id)) {
        return false
      }
      
      const blocked = item.isBlocked
      const blockFilter = (!showOnlyActionable && !showOnlyBlocked) || // Show all
                          (showOnlyActionable && !blocked) || // Show only unblocked
                          (showOnlyBlocked && blocked); // Show only blocked
      
      const completionFilterResult = completionFilter === 'all' || 
                                    (completionFilter === 'completed' && item.core.completed) ||
                                    (completionFilter === 'not-completed' && !item.core.completed);
      
      return blockFilter && completionFilterResult;
    })
    
    console.log('Filtered items count:', filteredItems.length);
    
    // Custom sort function that puts items in position order
    const sortedItems = [...filteredItems].sort((a, b) => a.core.position - b.core.position)
    return (
      <div className="space-y-0.5">
        {sortedItems.map((item, index) => (
          <div key={item.core.id} className="py-0.5">
            {renderItem(item, index, item.core.parent_id)}
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