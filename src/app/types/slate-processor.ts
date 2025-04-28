import { Editor, Descendant } from 'slate'
import type { Task } from '../services/tasks'

export type PartialTask = Partial<Task> & {
  id?: string
  blockedBy?: {
    id: string
    title: string
    completed: boolean
  }[]
  subtasks?: Task[]
}

export type SlateProcessor = {
  initialize: (task: PartialTask, tasks: Task[]) => (initialContent: Descendant[]) => Descendant[];
  handleKeyDown: (editor: Editor, tasks: Task[]) => (event: React.KeyboardEvent) => { showSelector: boolean; position?: { top: number; left: number } };
  processAndSave: (editor: Editor, task: PartialTask, tasks: Task[]) => () => Promise<void>;
  handleDelete?: (editor: Editor) => (taskToDelete: Task) => void;
  handleSelect?: (editor: Editor) => (selectedTask: Task) => void;
} 