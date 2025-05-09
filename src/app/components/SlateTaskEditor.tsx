import { useState, useCallback, useMemo, useEffect } from 'react'
import { createEditor, Descendant, Editor, Transforms, Range, Path } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'
import type { Task } from '../services/tasks'
import type { PartialTask } from '../types/slate-processor'
import type { CustomElement, MentionElement, SubtaskElement, ListItemElement, CustomEditor, ParentMentionElement, BlockedBySelectorElement, ParentSelectorElement } from '../types/slate-elements'
import { useCoreProcesses } from '../hooks/useCoreProcesses'
import { useBlockedByProcesses } from '../hooks/useBlockedByProcesses'
import { useSubtaskProcesses } from '../hooks/useSubtaskProcesses'
import { useParentProcesses } from '../hooks/useParentProcesses'
import { SubtaskPill } from './SubtaskPill'
import { TaskDeleteModal } from './TaskDeleteModal'
import toast from 'react-hot-toast'
import { BlockedBySelector } from './BlockedBySelector'
import { ParentSelector } from './ParentSelector'
import { pipe } from '../utils/functional'
import { useQueryClient, useMutation } from '@tanstack/react-query'

interface TaskEditorProps {
  task: PartialTask
  onCancel: () => void
  tasks: Task[]
}

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
]

// Add the withLists plugin
const withLists = (editor: CustomEditor) => {
  const { insertText, deleteBackward, insertBreak } = editor


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

  editor.insertBreak = () => {
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
        const [, path] = node
        // If the list item is empty, convert it to a paragraph
        if (Editor.string(editor, path) === '') {
          Transforms.setNodes(editor, { type: 'paragraph' }, { at: path })
          return
        }
        // Otherwise, create a new list item
        const newPath = Path.next(path)
        Transforms.insertNodes(
          editor,
          {
            type: 'list-item',
            nodeId: null,
            children: [{ text: '' }],
          },
          { at: newPath }
        )
        Transforms.select(editor, Editor.start(editor, newPath))
        return
      }
    }
    insertBreak()
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
          const [, path] = node
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
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const queryClient = useQueryClient();

  // Create a Slate editor object that won't change across renders
  const editor = useMemo(() => withLists(withHistory(withReact(createEditor()))), [])

  // Initialize processors
  const coreProcess = useCoreProcesses()
  const blockedByProcess = useBlockedByProcesses()
  const subtaskProcess = useSubtaskProcesses()
  const parentProcess = useParentProcesses()

  const handleSave = async () => {
    // TODO at some point we should probably move this to a mutation but it's not clear how to do that with the Slate editor
    try {
      // Get the parent task ID from core process
      const parentTaskId = await coreProcess.processAndSave(editor, task, tasks)();
      
      // Update the task object with the new ID
      const updatedTask = { ...task, id: parentTaskId };
      
      // Process other relationships with the updated task
      await blockedByProcess.processAndSave(editor, updatedTask, tasks)();
      await subtaskProcess.processAndSave(editor, updatedTask, tasks)();
      await parentProcess.processAndSave(editor, updatedTask, tasks)();

      // Invalidate queries and show success message
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task saved successfully');
      onCancel();
    } catch (error) {
      toast.error('Failed to save task');
      console.error('Error saving task:', error);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.id !== task.id && 
    !task.blockedBy?.some(m => m.id === t.id)
  )

  // Initialize editor
  useEffect(() => {
    const initialContent = pipe(
      coreProcess.initialize(task, tasks),
      subtaskProcess.initialize(task, tasks),
      blockedByProcess.initialize(task, tasks),
      parentProcess.initialize(task, tasks)
    )([]);
    editor.children = initialContent
    editor.onChange()
  }, [editor, task, tasks, coreProcess, blockedByProcess, subtaskProcess, parentProcess])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      handleSave()
      return
    }

    // Call each process's handleKeyDown
    blockedByProcess.handleKeyDown(editor, tasks)(event)
    parentProcess.handleKeyDown(editor, tasks)(event)
    subtaskProcess.handleKeyDown(editor, tasks)(event)
    coreProcess.handleKeyDown(editor, tasks)(event)
  }

  const renderElement = useCallback((props: {
    attributes: React.HTMLAttributes<HTMLElement>;
    children: React.ReactNode;
    element: CustomElement | MentionElement | SubtaskElement | ListItemElement | ParentMentionElement | BlockedBySelectorElement | ParentSelectorElement;
  }) => {
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
              onClick={() => {
                const handleDelete = blockedByProcess.handleDelete?.(editor)
                if (handleDelete) {
                  handleDelete(element.task)
                }
              }}
              className="ml-1 text-red-600 hover:text-red-800"
              type="button"
            >
              ×
            </button>
            {children}
          </span>
        )
      case 'parent-mention':
        return (
          <span
            {...attributes}
            contentEditable={false}
            className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-sm font-medium mr-1"
          >
            ^{element.task.title}
            <button
              onClick={() => {
                const handleDelete = parentProcess.handleDelete?.(editor)
                if (handleDelete) {
                  handleDelete(element.task)
                }
              }}
              className="ml-1 text-blue-600 hover:text-blue-800"
              type="button"
            >
              ×
            </button>
            {children}
          </span>
        )
      case 'blocked-by-selector':
        return (
          <BlockedBySelector
            element={element}
            attributes={attributes}
            tasks={filteredTasks}
            onSelect={(task) => {
              const handleSelect = blockedByProcess.handleSelect?.(editor)
              if (handleSelect) {
                handleSelect(task)
              }
            }}
          >
            {children}
          </BlockedBySelector>
        )
      case 'parent-selector':
        return (
          <ParentSelector
            element={element}
            attributes={attributes}
            tasks={filteredTasks}
            onSelect={(task: Task) => {
              const handleSelect = parentProcess.handleSelect?.(editor)
              if (handleSelect) {
                handleSelect(task)
              }
            }}
          >
            {children}
          </ParentSelector>
        )
      case 'subtask':
        return (
          <div {...attributes} contentEditable={false}>
            <SubtaskPill 
              task={element.task} 
              onDelete={(task) => {
                const handleDelete = subtaskProcess.handleDelete?.(editor)
                if (handleDelete) {
                  handleDelete(task)
                }
              }} 
            />
            {children}
          </div>
        )
      case 'list-item':
        return (
          <li 
            {...attributes} 
            className="list-disc ml-4"
            data-id={element.nodeId}
          >
            {children}
          </li>
        )
      default:
        return <p {...attributes}>{children}</p>
    }
  }, [editor, blockedByProcess, subtaskProcess, parentProcess, filteredTasks])

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          Markdown supported. Type @ to mention tasks, ^ to set parent
        </div>
      </div>
      <div className="relative">
        <Slate editor={editor} initialValue={initialValue}>
          <Editable
            onKeyDown={handleKeyDown}
            renderElement={renderElement}
            className="flex-1 rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none w-full min-h-[100px]"
            placeholder="Title (first line)&#10;Description (subsequent lines)&#10;Type @ to mention tasks, ^ to set parent"
          />
        </Slate>
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