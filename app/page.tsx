'use client'

import { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ItemList } from './components/ItemList'
import { Toolbar } from './components/Toolbar'
import { supabase, type Database } from '../src/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Item as Entry } from './components/types'
import { db, populateEntries } from '@/src/app/Entry'

type Item = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type DateDependency = Database['public']['Tables']['date_dependencies']['Row']

type CompletionFilter = 'all' | 'completed' | 'not-completed'

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('not-completed')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showOnlyActionable, setShowOnlyActionable] = useState(false)
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false)
  const [childCount] = useState<Map<string, number>>(new Map())
  
  useEffect(() => {
    let isMounted = true;
    let isProcessing = false;

    const fetchUserAndData = async () => {
      if (!isMounted || isProcessing) return;
      
      try {
        isProcessing = true;
        setIsLoading(true)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw new Error(`Failed to get session: ${sessionError.message}`)
        }
        
        if (!session) {
          window.location.href = '/login'
          return
        }

        setUserId(session.user.id)
        const dbInstance = db({ entries, setEntries, userId: session.user.id })
        
        try {
          await populateEntries(dbInstance)
          setError(null)
        } catch (populateError) {
          throw new Error(`Failed to populate entries: ${populateError instanceof Error ? populateError.message : 'Unknown error'}`)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch data')
      } finally {
        if (isMounted) {
          setIsLoading(false)
          isProcessing = false;
        }
      }
    }

    fetchUserAndData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
        return
      }
      
      if (session && !isProcessing) {
        setUserId(session.user.id)
        const dbInstance = db({ entries, setEntries, userId: session.user.id })
        try {
          await populateEntries(dbInstance)
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to populate entries')
        }
      }
    })

    return () => {
      isMounted = false;
      subscription.unsubscribe()
    }
  }, [])

  const handleAddChild = async (parentId: string | null) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const dbInstance = db({ entries, setEntries, userId })
      const newItem = await dbInstance.create({
        title: '', // Empty title so it will automatically open in edit mode
        parent_id: parentId,
        position: entries.filter(e => e.parent_id === parentId).length,
        manual_type: false,
        user_id: userId
      })

      if (newItem) {
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

      const item = entries.find(i => i.id === id)
      if (!item) return

      const completed = !item.completed
      const dbInstance = db({ entries, setEntries, userId })
      await dbInstance.update(item, {
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })

      setError(null)
    } catch (error) {
      console.error('Error updating item:', error)
      setError(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleMoveItemToPosition = async (itemId: string, newPosition: number, parentId: string | null) => {
    try {
      if (!userId) {
        throw new Error('No user logged in')
      }

      const item = entries.find(i => i.id === itemId)
      if (!item) return

      const dbInstance = db({ entries, setEntries, userId })
      await dbInstance.update(item, {
        parent_id: parentId,
        position: newPosition
      })

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

      const item = entries.find(i => i.id === id)
      if (!item) return

      const dbInstance = db({ entries, setEntries, userId })
      await dbInstance.update(item, updates)

      setError(null)
    } catch (error) {
      console.error('Error updating item:', error)
      setError(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  if (isLoading || !userId) {
    return <div>Loading...</div>
  }

  const dbInstance = db({ entries, setEntries, userId })

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
            onCompletionFilterChange={(filter: CompletionFilter) => setCompletionFilter(filter)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddNewTask={() => handleAddChild(focusedItemId)}
          />
          <ItemList
            db={dbInstance}
            entries={entries}
            onFocus={setFocusedItemId}
            focusedItemId={focusedItemId}
            viewMode={viewMode}
            showOnlyActionable={showOnlyActionable}
            showOnlyBlocked={showOnlyBlocked}
            completionFilter={completionFilter}
            searchQuery={searchQuery}
            childCount={childCount}
          />
        </div>
      </main>
    </DndProvider>
  )
} 