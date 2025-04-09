'use client'

import { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ItemList } from './components/ItemList'
import { Toolbar } from './components/Toolbar'
import { supabase, type Database, type ItemType } from '../src/lib/supabase/client'
import { toast } from 'react-hot-toast'

type Item = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type DateDependency = Database['public']['Tables']['date_dependencies']['Row']

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [dependencies, setDependencies] = useState<TaskDependency[]>([])
  const [dateDependencies, setDateDependencies] = useState<DateDependency[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'not-completed'>('not-completed')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showOnlyActionable, setShowOnlyActionable] = useState(false)
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false)
  const [childCount] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        setIsLoading(true)
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        
        if (!session) {
          // Redirect to login if no session
          window.location.href = '/login'
          return
        }

        setUserId(session.user.id)

        // Fetch items for the user
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', session.user.id)
          .order('position')

        if (itemsError) throw itemsError
        if (itemsData) setItems(itemsData)

        // Fetch dependencies for the user
        const { data: dependenciesData, error: dependenciesError } = await supabase
          .from('task_dependencies')
          .select('*')
          .eq('user_id', session.user.id)

        if (dependenciesError) throw dependenciesError
        if (dependenciesData) setDependencies(dependenciesData)

        // Fetch date dependencies
        const { data: dateDependenciesData, error: dateDependenciesError } = await supabase
          .from('date_dependencies')
          .select('*')
          .eq('user_id', session.user.id)

        if (dateDependenciesError) throw dateDependenciesError
        if (dateDependenciesData) setDateDependencies(dateDependenciesData)

        setError(null)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndData()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
        return
      }
      
      if (session) {
        setUserId(session.user.id)
      }
    })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Check for expired date dependencies every minute
  useEffect(() => {
    const checkDateDependencies = async () => {
      try {
        if (!userId) return

        const now = new Date()
        const expiredDependencies = dateDependencies.filter(
          dep => new Date(dep.unblock_at) <= now
        )

        // Remove expired dependencies
        for (const dep of expiredDependencies) {
          const { error } = await supabase
            .from('date_dependencies')
            .delete()
            .match({
              id: dep.id,
              user_id: userId
            })

          if (error) throw error
        }

        // Update local state
        if (expiredDependencies.length > 0) {
          setDateDependencies(prev => 
            prev.filter(dep => !expiredDependencies.some(expired => expired.id === dep.id))
          )
        }
      } catch (error) {
        console.error('Error checking date dependencies:', error)
      }
    }

    // Run immediately and then every minute
    checkDateDependencies()
    const interval = setInterval(checkDateDependencies, 60000)

    return () => clearInterval(interval)
  }, [userId, dateDependencies])

  const handleAddChild = async (parentId: string | null) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      // Get the maximum position for the parent
      const siblings = items.filter(item => item.parent_id === parentId)
      const maxPosition = siblings.reduce((max, item) => Math.max(max, item.position), -1)
      
      const { data: newItem, error } = await supabase
        .from('items')
        .insert([
          {
            title: '', // Empty title so it will automatically open in edit mode
            parent_id: parentId,
            position: maxPosition + 1,
            manual_type: false,
            user_id: userId
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      if (newItem) {
        // If there's a parent, trigger type reassessment for all ancestors
        if (parentId) {
          const updatedItems: Item[] = [];
          let currentAncestor = items.find(item => item.id === parentId);

          // Loop through all ancestors
          while (currentAncestor) {
            if (!currentAncestor.manual_type) {
              // Update the ancestor to trigger the type reassessment
              const { error: updateError } = await supabase
                .from('items')
                .update({ 
                  parent_id: currentAncestor.parent_id,
                  user_id: userId
                })
                .eq('id', currentAncestor.id)

              if (updateError) throw updateError

              // Fetch the updated ancestor to get its new type
              const { data: updatedAncestor, error: fetchError } = await supabase
                .from('items')
                .select('*')
                .eq('id', currentAncestor.id)
                .single()

              if (fetchError) throw fetchError

              if (updatedAncestor) {
                updatedItems.push(updatedAncestor)
              }
            }

            // Move up to the next ancestor if it exists
            const nextAncestorId = currentAncestor.parent_id
            if (nextAncestorId) {
              const nextAncestor = items.find(item => item.id === nextAncestorId)
              currentAncestor = nextAncestor || undefined
            } else {
              currentAncestor = undefined
            }
          }

          // Update all modified items in the state at once
          if (updatedItems.length > 0) {
            setItems(prev =>
              prev.map(item => {
                const updatedItem = updatedItems.find(ui => ui.id === item.id)
                return updatedItem || item
              })
            )
          }
        }

        setItems(prev => [...prev, newItem])
        setError(null)
      }
    } catch (error) {
      console.error('Error adding item:', error)
      setError(error instanceof Error ? error.message : 'Failed to add item')
    }
  }

  const handleToggleComplete = async (id: string) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const item = items.find(i => i.id === id)
      if (!item) return

      const completed = !item.completed

      const { error } = await supabase
        .from('items')
        .update({ 
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          user_id: userId
        })
        .eq('id', id)

      if (error) throw error

      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, completed, completed_at: completed ? new Date().toISOString() : null }
            : item
        )
      )
      setError(null)
    } catch (error) {
      console.error('Error updating item:', error)
      setError(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleTypeChange = async (id: string, type: ItemType | null) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const { error } = await supabase
        .from('items')
        .update({ 
          type,
          manual_type: type !== null,
          user_id: userId
        })
        .eq('id', id)

      if (error) throw error

      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, type, manual_type: type !== null }
            : item
        )
      )
      setError(null)
    } catch (error) {
      console.error('Error updating item type:', error)
      setError(error instanceof Error ? error.message : 'Failed to update item type')
    }
  }

  const handleMoveItem = async (id: string, direction: 'up' | 'down') => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      // Find the item and its siblings
      const item = items.find(i => i.id === id)
      if (!item) return

      const siblings = items.filter(i => i.parent_id === item.parent_id)
      siblings.sort((a, b) => a.position - b.position)
      
      const currentIndex = siblings.findIndex(i => i.id === id)
      if (currentIndex === -1) return

      // Calculate new positions
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= siblings.length) return

      const targetItem = siblings[targetIndex]
      const currentPosition = item.position
      const targetPosition = targetItem.position

      // Update positions in database
      const { error: updateError } = await supabase
        .from('items')
        .update({ 
          position: targetPosition,
          user_id: userId
        })
        .eq('id', id)

      if (updateError) throw updateError

      const { error: updateError2 } = await supabase
        .from('items')
        .update({ 
          position: currentPosition,
          user_id: userId
        })
        .eq('id', targetItem.id)

      if (updateError2) throw updateError2

      // Update local state
      setItems(prev =>
        prev.map(i => {
          if (i.id === id) return { ...i, position: targetPosition }
          if (i.id === targetItem.id) return { ...i, position: currentPosition }
          return i
        })
      )

      setError(null)
    } catch (error) {
      console.error('Error moving item:', error)
      setError(error instanceof Error ? error.message : 'Failed to move item')
    }
  }

  const handleMoveItemToPosition = async (itemId: string, newPosition: number, parentId: string | null) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const item = items.find(i => i.id === itemId)
      if (!item) return

      // If parent is changing, we need to update parent_id and position
      if (item.parent_id !== parentId) {
        const { error: updateError } = await supabase
          .from('items')
          .update({ 
            parent_id: parentId,
            position: newPosition
          })
          .eq('id', itemId)
          .eq('user_id', userId)

        if (updateError) throw updateError

        // Update positions of other items in both old and new parent groups
        const oldSiblings = items.filter(i => i.parent_id === item.parent_id && i.id !== itemId)
        const newSiblings = items.filter(i => i.parent_id === parentId)

        // Reorder old siblings
        const oldUpdates = oldSiblings.map((sibling, index) => ({
          ...sibling,
          position: index
        }))

        // Reorder new siblings
        const newUpdates = newSiblings.map((sibling, index) => ({
          ...sibling,
          position: index < newPosition ? index : index + 1
        }))

        // Batch update all positions
        if (oldUpdates.length > 0) {
          const { error: batchError } = await supabase
            .from('items')
            .upsert(oldUpdates)
            .eq('user_id', userId)

          if (batchError) throw batchError
        }

        if (newUpdates.length > 0) {
          const { error: batchError } = await supabase
            .from('items')
            .upsert(newUpdates)
            .eq('user_id', userId)

          if (batchError) throw batchError
        }

        // Fetch all updated items to ensure we have the latest state
        const { data: updatedItems, error: fetchError } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', userId)
          .order('position')

        if (fetchError) throw fetchError
        if (updatedItems) setItems(updatedItems)

      } else {
        // Just updating position within the same parent
        const siblings = items.filter(i => i.parent_id === parentId)
        const updates = siblings.map((sibling) => ({
          ...sibling,
          position: sibling.id === itemId ? newPosition : 
            (sibling.position < newPosition ? sibling.position : sibling.position + 1)
        }))

        const { error: batchError } = await supabase
          .from('items')
          .upsert(updates)
          .eq('user_id', userId)

        if (batchError) throw batchError

        // Update local state
        setItems(prev => {
          const updated = [...prev]
          updates.forEach(update => {
            const index = updated.findIndex(i => i.id === update.id)
            if (index !== -1) {
              updated[index] = { ...updated[index], position: update.position }
            }
          })
          return updated
        })
      }

      setError(null)
    } catch (error) {
      console.error('Error moving item:', error)
      setError(error instanceof Error ? error.message : 'Failed to move item')
    }
  }

  const handleUpdateItem = async (id: string, updates: { title?: string; description?: string }) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const { error } = await supabase
        .from('items')
        .update({ 
          ...updates,
          user_id: userId
        })
        .eq('id', id)

      if (error) throw error

      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, ...updates }
            : item
        )
      )
      setError(null)
    } catch (error) {
      console.error('Error updating item:', error)
      setError(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleDeleteItem = async (id: string, deleteChildren: boolean) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const item = items.find(i => i.id === id)
      if (!item) return

      if (deleteChildren) {
        // Delete the item and all its descendants
        const descendantIds = new Set<string>()
        const queue = [id]

        // Build a set of all descendant IDs using BFS
        while (queue.length > 0) {
          const currentId = queue.shift()!
          descendantIds.add(currentId)
          
          const children = items.filter(i => i.parent_id === currentId)
          queue.push(...children.map(c => c.id))
        }

        // Delete all descendants
        const { error } = await supabase
          .from('items')
          .delete()
          .in('id', Array.from(descendantIds))
          .eq('user_id', userId)

        if (error) throw error

        // Update local state
        setItems(prev => prev.filter(i => !descendantIds.has(i.id)))
      } else {
        // Delete the item and promote its children
        const children = items.filter(i => i.parent_id === id)
        
        // Update children's parent_id to the deleted item's parent_id
        if (children.length > 0) {
          const { error: updateError } = await supabase
            .from('items')
            .update({ parent_id: item.parent_id })
            .in('id', children.map(c => c.id))
            .eq('user_id', userId)

          if (updateError) throw updateError
        }

        // Delete the item
        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)

        if (deleteError) throw deleteError

        // Update local state
        setItems(prev => prev.map(i => 
          i.parent_id === id 
            ? { ...i, parent_id: item.parent_id }
            : i
        ).filter(i => i.id !== id))
      }

      setError(null)
    } catch (error) {
      console.error('Error deleting item:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  const handleAddDependency = async (blockingTaskId: string, blockedTaskId: string) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      // Check if dependency already exists
      const existingDependency = dependencies.find(
        dep => dep.blocking_task_id === blockingTaskId && dep.blocked_task_id === blockedTaskId
      )
      if (existingDependency) {
        throw new Error('Dependency already exists')
      }

      // Add the dependency
      const { data: newDependency, error } = await supabase
        .from('task_dependencies')
        .insert([{
          blocking_task_id: blockingTaskId,
          blocked_task_id: blockedTaskId,
          user_id: userId
        }])
        .select()
        .single()

      if (error) throw error

      if (newDependency) {
        setDependencies(prev => [...prev, newDependency])
      }

      setError(null)
    } catch (error) {
      console.error('Error adding dependency:', error)
      setError(error instanceof Error ? error.message : 'Failed to add dependency')
    }
  }

  const handleRemoveDependency = async (blockingTaskId: string, blockedTaskId: string) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .match({
          blocking_task_id: blockingTaskId,
          blocked_task_id: blockedTaskId,
          user_id: userId
        })

      if (error) throw error

      setDependencies(prev => prev.filter(
        dep => !(dep.blocking_task_id === blockingTaskId && dep.blocked_task_id === blockedTaskId)
      ))

      setError(null)
    } catch (error) {
      console.error('Error removing dependency:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove dependency')
    }
  }

  const handleAddDateDependency = async (taskId: string, unblockAt: Date) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      // Remove any existing date dependency for this task
      const existingDependency = dateDependencies.find(dep => dep.task_id === taskId)
      if (existingDependency) {
        const { error: deleteError } = await supabase
          .from('date_dependencies')
          .delete()
          .eq('id', existingDependency.id)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
      }

      // Add the new date dependency
      const { data: newDependency, error } = await supabase
        .from('date_dependencies')
        .insert([{
          task_id: taskId,
          unblock_at: unblockAt.toISOString(),
          user_id: userId
        }])
        .select()
        .single()

      if (error) throw error

      if (newDependency) {
        setDateDependencies(prev => {
          const filtered = prev.filter(dep => dep.task_id !== taskId)
          return [...filtered, newDependency]
        })
      }

      setError(null)
    } catch (error) {
      console.error('Error adding date dependency:', error)
      setError(error instanceof Error ? error.message : 'Failed to add date dependency')
    }
  }

  const handleRemoveDateDependency = async (taskId: string) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const { error } = await supabase
        .from('date_dependencies')
        .delete()
        .match({
          task_id: taskId,
          user_id: userId
        })

      if (error) throw error

      setDateDependencies(prev => prev.filter(dep => dep.task_id !== taskId))
      setError(null)
    } catch (error) {
      console.error('Error removing date dependency:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove date dependency')
    }
  }

  const createSubtask = async (parentId: string, title: string, position: number) => {
    try {
      if (!userId) {
        throw new Error('No user logged in');
      }
      
      // Get existing tasks for the parent
      const { data: existingSubtasks } = await supabase
        .from('items')
        .select('*')
        .eq('parent_id', parentId)
        .order('position', { ascending: true });
      
      // Prepare new subtask data
      const newTaskData = {
        title,
        parent_id: parentId,
        user_id: userId,
        position: position // Use the exact position provided
      };
      
      // First insert the new task
      const { data: newTask, error } = await supabase
        .from('items')
        .insert(newTaskData)
        .select()
        .single();
      
      if (error) {
        toast.error('Failed to create subtask');
        return;
      }
      
      // Add the new task to our local state
      setItems(prev => [...prev, newTask]);
      
      // If needed, update the positions of other tasks to make room
      if (existingSubtasks && existingSubtasks.length > 0) {
        // Update positions of tasks that should come after the new task
        const tasksToUpdate = existingSubtasks
          .filter(task => task.position >= position)
          .map(task => ({
            id: task.id,
            position: task.position + 1 // Increment position for affected tasks
          }));
        
        if (tasksToUpdate.length > 0) {
          // Update each task's position one by one to avoid conflicts
          for (const task of tasksToUpdate) {
            const { error: updateError } = await supabase
              .from('items')
              .update({ position: task.position })
              .eq('id', task.id);
              
            if (updateError) {
              toast.error('Error updating task positions');
            } else {
              // Update position in our local state
              setItems(prev => prev.map(item => 
                item.id === task.id ? { ...item, position: task.position } : item
              ));
            }
          }
        }
      }
      
      toast.success('Subtask created');
    } catch {
      toast.error('Failed to create subtask');
    }
  };

  const reorderSubtasks = async (parentId: string, subtaskIds: string[]) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }
      
      // First, get all the items that need to be updated to preserve their data
      const itemsToUpdate = items.filter(item => subtaskIds.includes(item.id));
      
      // Create an array of updates with all required fields preserved
      const updates = subtaskIds.map((id, index) => {
        const item = itemsToUpdate.find(i => i.id === id);
        
        if (!item) {
          throw new Error(`Item with ID ${id} not found`);
        }
        
        // Return the full item with only the position updated
        return {
          ...item,
          position: index
        };
      });
      
      // Update all positions at once
      const { error } = await supabase
        .from('items')
        .upsert(updates);
      
      if (error) throw error;
      
      // Update local state to reflect the new order
      setItems(prev => prev.map(item => {
        const newIndex = subtaskIds.indexOf(item.id);
        if (newIndex !== -1) {
          return { ...item, position: newIndex };
        }
        return item;
      }));
      
      toast.success('Subtasks reordered successfully');
    } catch {
      toast.error('Failed to reorder subtasks');
    }
  };

  // Update a subtask with new title and position
  const updateSubtask = async (subtaskId: string, updates: { title: string; position: number }) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({
          title: updates.title,
          position: updates.position
        })
        .eq('id', subtaskId);

      if (error) {
        toast.error('Failed to update subtask');
        return;
      }
      
      // Update the local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === subtaskId 
            ? { ...item, title: updates.title, position: updates.position }
            : item
        )
      );
      
      toast.success('Subtask updated');
    } catch {
      toast.error('Failed to update subtask');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="min-h-screen p-8 bg-gray-50">
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        <div className="max-w-6xl mx-auto">
          <Toolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showOnlyActionable={showOnlyActionable}
            onActionableChange={setShowOnlyActionable}
            showOnlyBlocked={showOnlyBlocked}
            onBlockedChange={setShowOnlyBlocked}
            completionFilter={completionFilter}
            onCompletionFilterChange={setCompletionFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddNewTask={() => handleAddChild(focusedItemId)}
          />
          <ItemList
            items={items}
            dependencies={dependencies}
            dateDependencies={dateDependencies}
            onAddChild={handleAddChild}
            onToggleComplete={handleToggleComplete}
            onTypeChange={handleTypeChange}
            onMoveItem={handleMoveItem}
            onMoveItemToPosition={handleMoveItemToPosition}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onFocus={setFocusedItemId}
            onAddDependency={handleAddDependency}
            onRemoveDependency={handleRemoveDependency}
            onAddDateDependency={handleAddDateDependency}
            onRemoveDateDependency={handleRemoveDateDependency}
            createSubtask={createSubtask}
            reorderSubtasks={reorderSubtasks}
            focusedItemId={focusedItemId}
            viewMode={viewMode}
            showOnlyActionable={showOnlyActionable}
            showOnlyBlocked={showOnlyBlocked}
            completionFilter={completionFilter}
            searchQuery={searchQuery}
            childCount={childCount}
            onUpdateSubtask={updateSubtask}
          />
        </div>
      </main>
    </DndProvider>
  )
} 