'use client'

import { useState, useRef, useEffect } from 'react'
import { Database } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask, createTask, addBlockingRelationship, removeBlockingRelationship } from '../services/tasks'
import type { Task } from '../services/tasks'
import { renderMarkdown } from '@/utils/markdown'
import toast from 'react-hot-toast'
import { MentionDropdown } from './MentionDropdown'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type DatabaseTask = Database['public']['Tables']['items']['Row']
type TaskInput = Omit<DatabaseTask, 'id' | 'created_at' | 'completed_at' | 'user_id'>

interface TaskEditorProps {
  task: (Partial<DatabaseTask> & TaskInput) & {
    blockedBy?: {
      id: string
      title: string
      completed: boolean
    }[]
  }
  onCancel: () => void
  tasks: Task[]
}

export const TaskEditor = ({ task, onCancel, tasks }: TaskEditorProps) => {
  const queryClient = useQueryClient()
  const [editedContent, setEditedContent] = useState(() => {
    // Start with the task's title and description
    let content = task.title
    if (task.description) {
      content += '\n' + task.description
    }

    // Add existing blocked-by relationships as @ mentions
    const blockedBy = task.blockedBy
    if (Array.isArray(blockedBy) && blockedBy.length > 0) {
      const mentions = blockedBy.map(t => `@[${t.title}](#${t.id})`).join(' ')
      content += '\n\n' + mentions
    }

    return content
  })
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [mentionQuery, setMentionQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

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
    const [title, ...descriptionLines] = editedContent.split('\n')
    if (title.trim()) {
      // Extract mentions from the content
      const mentionRegex = /@\[([^\]]+)\]\(#([^)]+)\)/g
      const mentions: { id: string; title: string }[] = []
      let match
      let content = editedContent

      while ((match = mentionRegex.exec(editedContent)) !== null) {
        mentions.push({
          id: match[2],
          title: match[1]
        })
        // Remove the mention from the content
        content = content.replace(match[0], '')
      }

      // Split the cleaned content into title and description
      const [cleanedTitle, ...cleanedDescriptionLines] = content.split('\n')

      if (task.id) {
        updateTaskMutation.mutate({ 
          id: task.id, 
          updates: {
            title: cleanedTitle.trim(),
            description: cleanedDescriptionLines.join('\n').trim() || null
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
          title: cleanedTitle.trim(),
          description: cleanedDescriptionLines.join('\n').trim() || null,
          completed: false,
          parent_id: task.parent_id || null,
          position: 0,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (showMentionDropdown) {
        setShowMentionDropdown(false)
      } else {
        onCancel()
      }
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the blur was caused by clicking the cancel button or mention dropdown
    if (
      cancelButtonRef.current?.contains(e.relatedTarget as Node) ||
      e.relatedTarget?.closest('.mention-dropdown')
    ) {
      return
    }
    handleSave()
  }

  const handleMentionSelect = (selectedTask: Task) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const content = editedContent
      const before = content.substring(0, start - mentionQuery.length - 1)
      const after = content.substring(end)
      const mention = `@[${selectedTask.title}](#${selectedTask.id})`
      setEditedContent(before + mention + after)
      setShowMentionDropdown(false)
      // Set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = before.length + mention.length
          textareaRef.current.setSelectionRange(newPosition, newPosition)
          textareaRef.current.focus()
        }
      }, 0)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setEditedContent(value)

    if (textareaRef.current) {
      const textarea = textareaRef.current
      const cursorPosition = textarea.selectionStart
      const content = value.substring(0, cursorPosition)
      const lastAtSymbol = content.lastIndexOf('@')
      
      if (lastAtSymbol !== -1) {
        const query = content.substring(lastAtSymbol + 1)
        const rect = textarea.getBoundingClientRect()
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
        const lines = content.substring(0, lastAtSymbol).split('\n')
        const currentLine = lines[lines.length - 1]
        
        // Calculate the position relative to the textarea
        const left = currentLine.length * 8
        const top = lines.length * lineHeight
        setMentionPosition({ top, left })
        setMentionQuery(query)
        setShowMentionDropdown(true)
      } else {
        setShowMentionDropdown(false)
      }
    }
  }

  const filteredTasks = tasks.filter(t => 
    t.id !== task.id && 
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
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="flex-1 rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none w-full"
          rows={3}
          autoFocus
          placeholder="Title (first line)&#10;Description (subsequent lines)&#10;Markdown supported, type @ to mention tasks"
        />
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
          ref={cancelButtonRef}
          onClick={onCancel}
          className="rounded border px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
} 