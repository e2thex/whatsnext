import { Task } from '../services/tasks'

interface MentionPillProps {
  task: Task
  onDelete?: () => void
}

export const MentionPill = ({ task, onDelete }: MentionPillProps) => {
  return (
    <span
      contentEditable={false}
      className="inline-flex items-center bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-sm font-medium mr-1"
    >
      @{task.title}
      {onDelete && (
        <button
          onClick={onDelete}
          className="ml-1 text-red-600 hover:text-red-800"
          type="button"
        >
          ×
        </button>
      )}
    </span>
  )
} 