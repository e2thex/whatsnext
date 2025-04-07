import { format } from 'date-fns'
import { type Database } from '../../src/lib/supabase/client'
import clsx from 'clsx'

type Task = Database['public']['Tables']['tasks']['Row']

interface TaskProps {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
}

const statusColors = {
  todo: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
}

export const Task = ({ task, onStatusChange }: TaskProps) => {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{task.title}</h3>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
          className={clsx(
            'rounded px-2 py-1 text-sm font-medium',
            statusColors[task.status]
          )}
        >
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      {task.description && (
        <p className="mt-2 text-gray-600">{task.description}</p>
      )}
      {task.due_date && (
        <p className="mt-2 text-sm text-gray-500">
          Due: {format(new Date(task.due_date), 'PPP')}
        </p>
      )}
    </div>
  )
} 