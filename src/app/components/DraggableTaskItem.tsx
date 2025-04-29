import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Task } from '../services/tasks'
import { TaskItem } from './TaskItem'

interface DraggableTaskItemProps {
  task: Task
  tasks: Task[]
  onMoveTask: (draggedId: string, targetId: string, position: 'before' | 'after' | 'child') => void
  showParentHierarchy?: boolean
  className?: string
}

interface DragItem {
  type: 'task'
  id: string
  parentId: string | null
}

export const DraggableTaskItem = ({ 
  task, 
  tasks, 
  onMoveTask, 
  showParentHierarchy = false, 
  className = '' 
}: DraggableTaskItemProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const dropBeforeRef = useRef<HTMLDivElement>(null)
  const dropAfterRef = useRef<HTMLDivElement>(null)
  const dropChildRef = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { type: 'task', id: task.id, parentId: task.parent_id } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isOverBefore }, dropBefore] = useDrop({
    accept: 'task',
    drop: (item: DragItem) => {
      if (item.id === task.id) return
      onMoveTask(item.id, task.id, 'before')
    },
    canDrop: (item: DragItem) => {
      // Prevent dropping a task into itself or its descendants
      const isDescendant = (taskId: string, parentId: string): boolean => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return false
        if (task.parent_id === parentId) return true
        if (!task.parent_id) return false
        return isDescendant(task.parent_id, parentId)
      }
      return !isDescendant(task.id, item.id)
    },
    collect: (monitor) => ({
      isOverBefore: monitor.isOver(),
    }),
  })

  const [{ isOverAfter }, dropAfter] = useDrop({
    accept: 'task',
    drop: (item: DragItem) => {
      if (item.id === task.id) return
      onMoveTask(item.id, task.id, 'after')
    },
    canDrop: (item: DragItem) => {
      const isDescendant = (taskId: string, parentId: string): boolean => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return false
        if (task.parent_id === parentId) return true
        if (!task.parent_id) return false
        return isDescendant(task.parent_id, parentId)
      }
      return !isDescendant(task.id, item.id)
    },
    collect: (monitor) => ({
      isOverAfter: monitor.isOver(),
    }),
  })

  const [, dropChild] = useDrop({
    accept: 'task',
    drop: (item: DragItem) => {
      if (item.id === task.id) return
      onMoveTask(item.id, task.id, 'child')
    },
    canDrop: (item: DragItem) => {
      const isDescendant = (taskId: string, parentId: string): boolean => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return false
        if (task.parent_id === parentId) return true
        if (!task.parent_id) return false
        return isDescendant(task.parent_id, parentId)
      }
      return !isDescendant(task.id, item.id)
    },
    collect: (monitor) => ({
      isOverChild: monitor.isOver(),
    }),
  })

  drag(ref)
  dropBefore(dropBeforeRef)
  dropAfter(dropAfterRef)
  dropChild(dropChildRef)

  return (
    <div className="relative">
      <div 
        ref={dropBeforeRef}
        className={`absolute -top-2 left-0 right-0 h-4 bg-blue-200 opacity-0 hover:opacity-100 transition-opacity ${isOverBefore ? 'opacity-100' : ''}`}
      />
      <div 
        ref={ref}
        className={`relative ${isDragging ? 'opacity-50' : ''}`}
      >
        <div 
          ref={dropChildRef}
          className="absolute -left-4 top-0 bottom-0 w-4 bg-blue-200 opacity-0 hover:opacity-100 transition-opacity"
        />
        <TaskItem 
          task={task}
          showParentHierarchy={showParentHierarchy}
          className={className}
          tasks={tasks}
        />
      </div>
      <div 
        ref={dropAfterRef}
        className={`absolute -bottom-2 left-0 right-0 h-4 bg-blue-200 opacity-0 hover:opacity-100 transition-opacity ${isOverAfter ? 'opacity-100' : ''}`}
      />
    </div>
  )
} 