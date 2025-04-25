import { useState, useCallback, useMemo, useEffect } from 'react'
import { createEditor, Descendant, Editor, Transforms, Range, BaseEditor } from 'slate'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { withHistory, HistoryEditor } from 'slate-history'
import { Database } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTask, createTask, addBlockingRelationship, removeBlockingRelationship, deleteTask } from '../services/tasks'
import type { Task } from '../services/tasks'
import { MentionPill } from './MentionPill'
import { MentionDropdown } from './MentionDropdown'
import { SubtaskPill } from './SubtaskPill'
import { TaskDeleteModal } from './TaskDeleteModal'
import toast from 'react-hot-toast'

type DatabaseTask = Database['public']['Tables']['items']['Row']
type TaskInput = Omit<DatabaseTask, 'id' | 'created_at' | 'completed_at' | 'user_id'>

interface TaskEditorProps {
  task: Partial<Task> & {
    id?: string
    blockedBy?: {
      id: string
      title: string
      completed: boolean
    }[]
    subtasks?: Task[]
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
type SubtaskElement = {
  type: 'subtask';
  task: Task;
  children: CustomText[];
}
type ListItemElement = {
  type: 'list-item';
  nodeId: string | null;
  children: CustomText[];
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement | MentionElement | SubtaskElement | ListItemElement
    Text: CustomText
  }
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
]

// Add the withLists plugin
const withLists = (editor: BaseEditor & ReactEditor & HistoryEditor) => {
  const { insertText, deleteBackward } = editor

  editor.insertText = (text) => {
    if (text === ' ' && editor.selection) {
      const { selection } = editor
      const [start] = Range.edges(selection)
      const before = Editor.before(editor, start, { unit: 'line' })
      const beforeRange = before && Editor.range(editor, before, start)
      const beforeText = beforeRange && Editor.string(editor, beforeRange)

      if (beforeText === '-') {
        Transforms.delete(editor, { at: beforeRange })
        Transforms.setNodes(editor, { type: 'list-item' }, { at: start })
        return
      }
    }
    insertText(text)
  }

  editor.deleteBackward = (unit) => {
    if (unit === 'character') {
      const { selection } = editor
      if (selection) {
        const [start] = Range.edges(selection)
        const node = Editor.above(editor, {
          at: start,
          match: n => {
            const element = n as CustomElement | MentionElement | SubtaskElement | ListItemElement
            return 'type' in element && element.type === 'list-item'
          }
        })

        if (node) {
          const [listItem, path] = node
          if (Editor.string(editor, path) === '') {
            Transforms.setNodes(editor, { type: 'paragraph' }, { at: path })
            return
          }
        }
      }
    }
    deleteBackward(unit)
  }

  return editor
}

export const SlateTaskEditor = ({ task, onCancel, tasks }: TaskEditorProps) => {
  const queryClient = useQueryClient()
  const [mentions, setMentions] = useState<{ id: string; title: string; completed: boolean }[]>(() => task.blockedBy || [])
  const [subtasks, setSubtasks] = useState<Task[]>(() => task.subtasks || [])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [mentionQuery, setMentionQuery] = useState('')
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [subtasksToDelete, setSubtasksToDelete] = useState<Task[]>([])

  // Create a Slate editor object that won't change across renders
  const editor = useMemo(() => withLists(withHistory(withReact(createEditor()))), [])

  // Initialize the editor with the task's content
  useEffect(() => {
    console.log('Initializing editor with task:', task)
    console.log('Task subtasks:', task.subtasks)
    
    const initialContent: (CustomElement | MentionElement | SubtaskElement | ListItemElement)[] = []
    
    // Add title
    initialContent.push({
      type: 'paragraph',
      children: [{ text: task.title || '' }],
    })

    // Add description if exists
    if (task.description) {
      initialContent.push({
        type: 'paragraph',
        children: [{ text: task.description }],
      })
    }

    // Add subtasks
    tasks.filter(t => t.parent_id === task.id).forEach((subtask) => {
      console.log('Adding subtask to editor:', subtask)
      initialContent.push({
        type: 'list-item',
        nodeId: subtask.id,
        children: [{ text: subtask.title }],
      })
    })

    // Add mentions
    task.blockedBy?.forEach((mention) => {
      initialContent.push({
        type: 'mention',
        task: mention,
        children: [{ text: '' }],
      })
    })
    console.log('Final editor content:', initialContent)
    editor.children = initialContent
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
  console.log(task)
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

  const createSubtaskMutation = useMutation({
    mutationFn: async ({ title, parentId, position }: { title: string; parentId: string; position: number }) => {
      return createTask({
        title,
        parent_id: parentId,
        position,
        type: 'Task',
        manual_type: false,
        completed: false
      })
    },
    onSuccess: (newSubtask) => {
      setSubtasks(prev => [...prev, newSubtask])
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      toast.error('Failed to create subtask')
      console.error('Error creating subtask:', error)
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      toast.error('Failed to delete subtask')
      console.error('Error deleting subtask:', error)
    }
  })

  const handleDeleteSubtask = (taskToDelete: Task) => {
    // Find the index of the subtask node to delete
    const subtaskIndex = editor.children.findIndex(
      node => 'type' in node && node.type === 'subtask' && 'task' in node && node.task.id === taskToDelete.id
    )
    
    if (subtaskIndex !== -1) {
      Transforms.removeNodes(editor, { at: [subtaskIndex] })
      setTaskToDelete(taskToDelete)
    }
  }

  const handleSave = () => {
    // First, map the editor content into a structured format
    const processedNodes = editor.children.map((node, index) => {
      if ('type' in node) {
        switch (node.type) {
          case 'paragraph':
            const text = node.children.map((textNode: CustomText) => textNode.text).join('')
            if (index === 0) {
              return { type: 'title' as const, content: text }
            } else if (text.startsWith('- ')) {
              return { 
                type: 'subtask' as const, 
                content: {
                  title: text.substring(2),
                  nodeId: null 
                }
              }
            } else {
              return { type: 'description' as const, content: text }
            }
          case 'list-item':
            console.log('List item:', node)
            return { 
              type: 'subtask' as const, 
              content: {
                title: node.children[0].text,
                nodeId: node.nodeId
              }
            }
          case 'mention':
            return { type: 'mention' as const, content: node.task }
          default:
            return { type: 'unknown' as const, content: node }
        }
      }
      return { type: 'unknown' as const, content: node }
    })
    console.log('Editor children:', editor.children)
    console.log('Processed nodes:', processedNodes)
    // Then reduce into separate arrays for each type
    const content = processedNodes.reduce((acc, node) => {
      switch (node.type) {
        case 'title':
          acc.title = node.content as string
          break
        case 'description':
          acc.description.push(node.content as string)
          break
        case 'subtask':
          acc.subtasks.push(node.content as { title: string; nodeId: string })
          break
        case 'mention':
          acc.mentions.push(node.content as { id: string; title: string; completed: boolean })
          break
      }
      return acc
    }, {
      title: '',
      description: [] as string[],
      subtasks: [] as { title: string; nodeId: string }[],
      mentions: [] as { id: string; title: string; completed: boolean }[]
    })

    if (content.title.trim()) {
      if (task.id) {
        // Update the main task
        updateTaskMutation.mutate({ 
          id: task.id, 
          updates: {
            title: content.title.trim(),
            description: content.description.join('\n').trim() || null
          }
        })

        // Handle mentions
        const existingBlockedBy = task.blockedBy || []
        const relationshipsToRemove = existingBlockedBy.filter(
          existing => !content.mentions.some(mention => mention.id === existing.id)
        )
        const relationshipsToAdd = content.mentions.filter(
          mention => !existingBlockedBy.some(existing => existing.id === mention.id)
        )

        relationshipsToRemove.forEach(({ id }) => {
          if (task.id) {
            removeBlockingRelationshipMutation.mutate({
              blockingTaskId: id,
              blockedTaskId: task.id
            })
          }
        })

        relationshipsToAdd.forEach(({ id }) => {
          if (task.id) {
            createTaskDependencyMutation.mutate({
              blockingTaskId: id,
              blockedTaskId: task.id
            })
          }
        })

        // Handle subtasks
        const parentId = task.id
        
        // Create new subtasks (those with null nodeId)
        content.subtasks
          .filter(subtask => subtask.nodeId === null)
          .forEach((subtask, index) => {
            createSubtaskMutation.mutate({
              title: subtask.title,
              parentId,
              position: index
            })
          })

        // Update existing subtasks' positions
        content.subtasks
          .filter(subtask => subtask.nodeId !== null)
          .forEach((subtask, index) => {
            if (subtask.nodeId) {
              updateTaskMutation.mutate({
                id: subtask.nodeId,
                updates: { position: index }
              })
            }
          })

        onCancel()
      } else {
        createTaskMutation.mutate({
          title: content.title.trim(),
          description: content.description.join('\n').trim() || null,
          completed: false,
          parent_id: task.parent_id || null,
          position: tasks.filter(t => t.parent_id === task.parent_id).length,
          type: 'Task',
          manual_type: false
        }, {
          onSuccess: (newTask) => {
            content.mentions.forEach(({ id }) => {
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
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const { selection } = editor
      if (selection) {
        const [start] = Range.edges(selection)
        const node = Editor.above(editor, {
          at: start,
          match: n => {
            const element = n as CustomElement | MentionElement | SubtaskElement | ListItemElement
            return 'type' in element && element.type === 'list-item'
          }
        })
        if (node) {
          const [listItem, path] = node
          const newPath = [...path.slice(0, -1), path[path.length - 1] + 1]
          Transforms.insertNodes(editor, {
            type: 'list-item',
            nodeId: null,
            children: [{ text: '' }]
          }, { at: newPath })
          // Move cursor to the new list item
          Transforms.select(editor, {
            anchor: { path: newPath, offset: 0 },
            focus: { path: newPath, offset: 0 }
          })
          return
        }
      }
      // Default behavior for Enter
      Transforms.insertText(editor, '\n')
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
    // setMentions(prev => prev.filter(t => t.id !== taskToDelete.id))
    
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
      case 'subtask':
        return (
          <div {...attributes} contentEditable={false}>
            <SubtaskPill task={element.task} onDelete={handleDeleteSubtask} />
            {children}
          </div>
        )
      case 'list-item':
        return (
          <li 
            {...attributes} 
            className="list-disc ml-4"
            data-id={element.id}
          >
            {children}
          </li>
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
      {taskToDelete && (
        <TaskDeleteModal
          task={taskToDelete}
          onClose={() => setTaskToDelete(null)}
          tasks={tasks}
        />
      )}
    </div>
  )
} 