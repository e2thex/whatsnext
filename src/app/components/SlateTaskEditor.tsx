import { useState, useCallback, useMemo, useEffect } from 'react'
import { createEditor, Descendant, Editor, Transforms, Range, BaseEditor } from 'slate'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { withHistory, HistoryEditor } from 'slate-history'
import { Database } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask, createTask, addBlockingRelationship, removeBlockingRelationship } from '../services/tasks'
import type { Task } from '../services/tasks'
import { MentionPill } from './MentionPill'
import { MentionDropdown } from './MentionDropdown'
import toast from 'react-hot-toast'

type DatabaseTask = Database['public']['Tables']['items']['Row']
type TaskInput = Omit<DatabaseTask, 'id' | 'created_at' | 'completed_at' | 'user_id'>

interface TaskEditorProps {
  task: Partial<Task> & {
    blockedBy?: {
      id: string
      title: string
      completed: boolean
    }[]
  }
  onCancel: () => void
  tasks: Task[]
}

// Define our custom types
type CustomElement = { type: 'paragraph'; children: CustomText[] }
type CustomText = { text: string }
type MentionElement = { 
  type: 'mention'; 
  task: { id: string; title: string; completed: boolean }; 
  children: CustomText[] 
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement | MentionElement
    Text: CustomText
  }
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
]

export const SlateTaskEditor = ({ task, onCancel, tasks }: TaskEditorProps) => {
  const queryClient = useQueryClient()
  const [mentions, setMentions] = useState<{ id: string; title: string; completed: boolean }[]>(() => task.blockedBy || [])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [mentionQuery, setMentionQuery] = useState('')

  // Create a Slate editor object that won't change across renders
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  // Initialize the editor with the task's content
  useEffect(() => {
    const content = task.title + (task.description ? '\n' + task.description : '') + (task.blockedBy ? '\n' + task.blockedBy.map(t => `@${t.id}`).join('\n') : '')
     
    // Create initial editor content with mentions
    const initialContent: (CustomElement | MentionElement)[] = []
    let currentText = ''
    
    // Split content by newlines to handle multi-line content
    initialContent.push({
      type: 'paragraph',
      children: [{ text: task.title || '' }],
    })
    if (task.description) {
      initialContent.push({
        type: 'paragraph',
        children: [{ text: task.description }],
      })
    }
    task.blockedBy?.forEach((mention) => {
      initialContent.push({
        type: 'mention',
        task: mention,
        children: [{ text: '' }],
      })
    })
    
    console.log(initialContent)
    editor.children = initialContent
    // Force a re-render of the editor
    editor.onChange()
  }, [editor, task])

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DatabaseTask> }) =>
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task updated successfully')
      onCancel()
    },
    onError: (error) => {
      toast.error('Failed to update task')
      console.error('Error updating task:', error)
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created successfully')
      onCancel()
    },
    onError: (error) => {
      toast.error('Failed to create task')
      console.error('Error creating task:', error)
    },
  })

  const createTaskDependencyMutation = useMutation({
    mutationFn: async ({ blockingTaskId, blockedTaskId }: { blockingTaskId: string; blockedTaskId: string }) => {
      await addBlockingRelationship(blockingTaskId, blockedTaskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      console.error('Error creating task dependency:', error)
      toast.error('Failed to create task dependency')
    }
  })

  const removeBlockingRelationshipMutation = useMutation({
    mutationFn: async ({ blockingTaskId, blockedTaskId }: { blockingTaskId: string; blockedTaskId: string }) => {
      await removeBlockingRelationship(blockingTaskId, blockedTaskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      console.error('Error removing task dependency:', error)
      toast.error('Failed to remove task dependency')
    }
  })

  const handleSave = () => {
    const [title, ...descriptionLines] = editor.children
      .map((node: Descendant) => {
        if ('type' in node && node.type === 'paragraph') {
          return node.children.map((textNode: CustomText) => textNode.text).join('')
        }
        return ''
      })
    
    if (title.trim()) {
      if (task.id) {
        updateTaskMutation.mutate({ 
          id: task.id, 
          updates: {
            title: title.trim(),
            description: descriptionLines.join('\n').trim() || null
          }
        })

        // Get existing blocked-by relationships
        const existingBlockedBy = task.blockedBy || []
        
        // Find relationships to remove (existing ones not in new mentions)
        const relationshipsToRemove = existingBlockedBy.filter(
          existing => !mentions.some(mention => mention.id === existing.id)
        )

        // Find relationships to add (new mentions not in existing ones)
        const relationshipsToAdd = mentions.filter(
          mention => !existingBlockedBy.some(existing => existing.id === mention.id)
        )

        // Remove old relationships
        relationshipsToRemove.forEach(({ id }) => {
          if (task.id) {
            removeBlockingRelationshipMutation.mutate({
              blockingTaskId: id,
              blockedTaskId: task.id
            })
          }
        })

        // Add new relationships
        relationshipsToAdd.forEach(({ id }) => {
          if (task.id) {
            createTaskDependencyMutation.mutate({
              blockingTaskId: id,
              blockedTaskId: task.id
            })
          }
        })
      } else {
        createTaskMutation.mutate({
          title: title.trim(),
          description: descriptionLines.join('\n').trim() || null,
          completed: false,
          parent_id: task.parent_id || null,
          position: tasks.filter(t => t.parent_id === task.parent_id).length,
          type: 'Task',
          manual_type: false
        }, {
          onSuccess: (newTask) => {
            // Create task dependencies for each mention
            mentions.forEach(({ id }) => {
              createTaskDependencyMutation.mutate({
                blockingTaskId: id,
                blockedTaskId: newTask.id
              })
            })
          }
        })
      }
    } else {
      toast.error('Title cannot be empty')
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      handleSave()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (showMentionDropdown) {
        setShowMentionDropdown(false)
      } else {
        onCancel()
      }
    } else if (event.key === '@') {
      event.preventDefault()
      const { selection } = editor
      if (selection) {
        const [start] = Range.edges(selection)
        const domRange = window.getSelection()?.getRangeAt(0)
        if (domRange) {
          const rect = domRange.getBoundingClientRect()
          setMentionPosition({
            top: window.scrollY,
            left: window.scrollX,
          })
          setShowMentionDropdown(true)
          setMentionQuery('')
        }
      }
    }
  }

  const handleMentionSelect = (selectedTask: { id: string; title: string; completed: boolean }) => {
    setMentions(prev => [...prev, selectedTask])
    setShowMentionDropdown(false)
    
    const { selection } = editor
    if (selection) {
      const [start] = Range.edges(selection)
      const wordBefore = Editor.before(editor, start, { unit: 'word' })
      const before = wordBefore && Editor.before(editor, wordBefore)
      const beforeRange = before && Editor.range(editor, before, start)
      
      if (beforeRange) {
        // Calculate how many characters we're deleting
        const deleteLength = beforeRange.anchor.offset - beforeRange.focus.offset
        // Delete the @ and any text after it
        Transforms.delete(editor, { at: beforeRange })
        // Move cursor back by the number of characters we deleted
        Transforms.move(editor, { distance: -deleteLength, unit: 'character' })
      }
      
      // Append the mention at the end
      Transforms.insertNodes(editor, {
        type: 'mention',
        task: selectedTask,
        children: [{ text: '' }],
      }, { at: [editor.children.length] })
    }
  }

  const handleDeleteMention = (taskToDelete: { id: string; title: string; completed: boolean }) => {
    setMentions(prev => prev.filter(t => t.id !== taskToDelete.id))
    
    // Find the index of the mention node to delete
    const mentionIndex = editor.children.findIndex(
      node => 'type' in node && node.type === 'mention' && 'task' in node && node.task.id === taskToDelete.id
    )
    
    if (mentionIndex !== -1) {
      Transforms.removeNodes(editor, { at: [mentionIndex] })
    }
  }

  const renderElement = useCallback((props: any) => {
    const { attributes, children, element } = props
    switch (element.type) {
      case 'mention':
        return (
          <span
            {...attributes}
            contentEditable={false}
            className="inline-flex items-center bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-sm font-medium mr-1"
          >
            @{element.task.title}
            <button
              onClick={() => handleDeleteMention(element.task)}
              className="ml-1 text-red-600 hover:text-red-800"
              type="button"
            >
              ×
            </button>
            {children}
          </span>
        )
      default:
        return <p {...attributes}>{children}</p>
    }
  }, [])

  const filteredTasks = tasks.filter(t => 
    t.id !== task.id && 
    !mentions.some(m => m.id === t.id) &&
    t.title.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Markdown supported
        </div>
      </div>
      <div className="relative">
        <Slate editor={editor} initialValue={initialValue}>
          <Editable
            onKeyDown={handleKeyDown}
            renderElement={renderElement}
            className="flex-1 rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none w-full min-h-[100px]"
            placeholder="Title (first line)&#10;Description (subsequent lines)&#10;Type @ to mention tasks"
          />
        </Slate>
        {showMentionDropdown && (
          <MentionDropdown
            tasks={filteredTasks}
            onSelect={handleMentionSelect}
            position={mentionPosition}
            onClose={() => setShowMentionDropdown(false)}
          />
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="rounded bg-blue-500 px-2 py-1 text-sm text-white hover:bg-blue-600"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded border px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
} 