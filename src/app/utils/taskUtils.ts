import { Task } from '../services/tasks'
import { FilterState } from '../contexts/FilterContext'

export const taskOrDescendantsMatchFilter = (task: Task, tasks: Task[], filter: FilterState): boolean => {
  // Get the effective type (manual or automatic)
  const effectiveType = task.manual_type && task.type ? task.type : determineTaskType(task, tasks)

  // Check if the current task matches the filter
  const currentTaskMatches = !(
    (filter.completion === 'todo' && task.completed) ||
    (filter.completion === 'done' && !task.completed) ||
    (filter.blocking === 'blocked' && !task.isBlocked) ||
    (filter.blocking === 'actionable' && task.isBlocked) ||
    (filter.blocking === 'blocking' && task.blocking.length === 0) ||
    // (filter.type !== 'all' && effectiveType !== filter.type) ||
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
    const descendantEffectiveType = descendant.manual_type && descendant.type ? descendant.type : determineTaskType(descendant, tasks)
    return !(
      (filter.completion === 'todo' && descendant.completed) ||
      (filter.completion === 'done' && !descendant.completed) ||
      (filter.blocking === 'blocked' && !descendant.isBlocked) ||
      (filter.blocking === 'actionable' && descendant.isBlocked) ||
      (filter.blocking === 'blocking' && descendant.blocking.length === 0) ||
    //   (filter.type !== 'all' && descendantEffectiveType !== filter.type) ||
      (filter.search && !descendant.title.toLowerCase().includes(filter.search.toLowerCase()))
    )
  })
}

export const determineTaskType = (task: Task, tasks: Task[]): 'Task' | 'Mission' | 'Objective' | 'Ambition' => {
  // If task has manual type set, return its current type
  if (task.manual_type && task.type) {
    return task.type
  }

  // Get all children of this task
  const children = tasks.filter(t => t.parent_id === task.id)
  
  // If no parent, it's an ambition
  if (!task.parent_id) {
    return 'Ambition'
  }
  
  // If no children, it's a task
  if (children.length === 0) {
    return 'Task'
  }
  
  // Check if all children are tasks (no grandchildren)
  const allChildrenAreTasks = children.every(child => {
    const childChildren = tasks.filter(t => t.parent_id === child.id)
    return childChildren.length === 0
  })
  
  if (allChildrenAreTasks) {
    return 'Mission'
  }
  
  // Check if any child has children (grandchildren)
  const hasGrandchildren = children.some(child => {
    const childChildren = tasks.filter(t => t.parent_id === child.id)
    return childChildren.length > 0
  })
  
  if (hasGrandchildren) {
    return 'Objective'
  }
  
  // Default to task if none of the above conditions are met
  return 'Task'
} 
export const getDefaultIsExpanded = (filter: FilterState, task: Task): boolean => {
  if (filter.type === 'all') return true;
  
  const typeHierarchy: Record<string, number> = {
    'Ambition': 4,
    'Objective': 3,
    'Mission': 2,
    'Task': 1
  };
  
  const filterLevel = typeHierarchy[filter.type];
  const taskLevel = typeHierarchy[task.effectiveType];
  
  return taskLevel > filterLevel;
}