import { Task } from '../services/tasks'
import { FilterState } from '../contexts/FilterContext'

export const taskOrDescendantsMatchFilter = (task: Task, tasks: Task[], filter: FilterState): boolean => {
  // Check if the current task matches the filter
  const currentTaskMatches = !(
    (filter.completion === 'todo' && task.completed) ||
    (filter.completion === 'done' && !task.completed) ||
    (filter.blocking === 'blocked' && !task.isBlocked) ||
    (filter.blocking === 'actionable' && task.isBlocked) ||
    (filter.blocking === 'blocking' && task.blocking.length === 0) ||
    (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase()))
  )

  if (currentTaskMatches) return true

  // Check if any descendants match the filter
  const getDescendants = (itemId: string): Task[] => {
    const descendants: Task[] = []
    const queue = [itemId]
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = tasks.filter(t => t.parent_id === currentId)
      descendants.push(...children)
      queue.push(...children.map(c => c.id))
    }
    return descendants
  }

  const descendants = getDescendants(task.id)
  return descendants.some(descendant => {
    return !(
      (filter.completion === 'todo' && descendant.completed) ||
      (filter.completion === 'done' && !descendant.completed) ||
      (filter.blocking === 'blocked' && !descendant.isBlocked) ||
      (filter.blocking === 'actionable' && descendant.isBlocked) ||
      (filter.blocking === 'blocking' && descendant.blocking.length === 0) ||
      (filter.search && !descendant.title.toLowerCase().includes(filter.search.toLowerCase()))
    )
  })
} 