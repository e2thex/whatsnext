import { type Database } from '../../src/lib/supabase/client'
import clsx from 'clsx'

// Use the correct type from your database schema
type Item = Database['public']['Tables']['items']['Row']

interface TaskProps {
  item: Item
  onToggleComplete: (id: string) => void
}

// Simple status-based colors
const statusColors = {
  completed: 'bg-green-100 text-green-800',
  incomplete: 'bg-yellow-100 text-yellow-800',
}

export const Task = ({ item, onToggleComplete }: TaskProps) => {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <button
          onClick={() => onToggleComplete(item.id)}
          className={clsx(
            'rounded px-2 py-1 text-sm font-medium',
            item.completed ? statusColors.completed : statusColors.incomplete
          )}
        >
          {item.completed ? 'Completed' : 'Incomplete'}
        </button>
      </div>
      {item.description && (
        <p className="mt-2 text-gray-600">{item.description}</p>
      )}
      {item.completed_at && (
        <p className="mt-2 text-sm text-gray-500">
          Completed: {new Date(item.completed_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
} 