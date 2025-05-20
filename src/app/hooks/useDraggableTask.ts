import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Task } from '../services/tasks'

interface DragItem {
  type: 'task'
  id: string
  parentId: string | null
}

interface UseDraggableTaskProps {
  task: Task
  tasks: Task[]
  onMoveTask: (draggedId: string, targetId: string, position: 'before' | 'after' | 'child') => void
}

interface UseDraggableTaskResult {
  ref: React.RefObject<HTMLDivElement>
  dropBeforeRef: React.RefObject<HTMLDivElement>
  dropAfterRef: React.RefObject<HTMLDivElement>
  dropChildRef: React.RefObject<HTMLDivElement>
  isDragging: boolean
  isOverBefore: boolean
  isOverAfter: boolean
  isOverChild: boolean
}

export const useDraggableTask = ({ task, tasks, onMoveTask }: UseDraggableTaskProps): UseDraggableTaskResult => {
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

  const [{ isOverChild }, dropChild] = useDrop({
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

  return {
    ref,
    dropBeforeRef,
    dropAfterRef,
    dropChildRef,
    isDragging,
    isOverBefore,
    isOverAfter,
    isOverChild
  }
}