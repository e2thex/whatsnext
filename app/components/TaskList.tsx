import { Task } from './Task'
import { type Database } from '@/src/lib/supabase/client'

type Task = Database['public']['Tables']['tasks']['Row']

interface TaskListProps {
  tasks: Task[]
  onStatusChange: (id: string, status: Task['status']) => void
}

export const TaskList = ({ tasks, onStatusChange }: TaskListProps) => {
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Task key={task.id} task={task} onStatusChange={onStatusChange} />
      ))}
    </div>
  )
} 