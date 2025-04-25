import { Task } from '../services/tasks'

interface SubtaskPillProps {
  task: Task
  onDelete: (task: Task) => void
}

export const SubtaskPill = ({ task, onDelete }: SubtaskPillProps) => {
  return (
    <div>- 
        <span className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-sm font-medium mr-1">
          <span className="title">
            {task.title}
          </span>
          <button
            onClick={() => onDelete(task)}
            className="ml-1 text-blue-600 hover:text-blue-800"
            type="button"
          >
            ×
          </button>
        </span>

    </div>
     )
} 