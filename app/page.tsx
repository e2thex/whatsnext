'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { Item } from '@/app/components/types'
import { ItemList } from '@/app/components/ItemList'
import { Toolbar } from '@/app/components/Toolbar'
import useDb from '@/src/app/Entry'
import { Session } from '@supabase/supabase-js'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

type CompletionFilter = 'all' | 'completed' | 'not-completed'

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  const [showOnlyActionable, setShowOnlyActionable] = useState(false)
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false)
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('not-completed')
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)
  
  const dbInstance = useDb(userId)

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleAddChild = async (parentId: string | null) => {
    if (!dbInstance) return

    const position = dbInstance.entries({ parent_id: parentId }).length
    const newItem = await dbInstance.create({
      title: 'New Task',
      parent_id: parentId,
      position,
      user_id: userId
    })

    if (!newItem) {
      console.error('Failed to create new item')
    }
  }

  if (isLoading || !userId || !dbInstance) {
    return <div>Loading...</div>
  }
  console.log(dbInstance.entries({}));
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen">
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
        <div className="flex-1 overflow-auto">
          <ItemList 
            db={dbInstance}
            entries={dbInstance.entries({})}
            onFocus={setFocusedItemId}
            focusedItemId={focusedItemId}
            viewMode={viewMode}
            showOnlyActionable={showOnlyActionable}
            showOnlyBlocked={showOnlyBlocked}
            completionFilter={completionFilter}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </DndProvider>
  )
} 