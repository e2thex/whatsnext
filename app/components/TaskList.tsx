import { Task } from './Task'
import { type Database } from '@/src/lib/supabase/client'

type Item = Database['public']['Tables']['items']['Row']

interface TaskListProps {
  items: Item[]
  onToggleComplete: (id: string) => void
}

export const TaskList = ({ items, onToggleComplete }: TaskListProps) => {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Task key={item.id} item={item} onToggleComplete={onToggleComplete} />
      ))}
    </div>
  )
} 