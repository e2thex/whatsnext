'use client'

import { useState } from 'react'
import { Task } from '../services/tasks'
import { UnifiedDependencyModal } from './UnifiedDependencyModal'

interface UnifiedDependencyButtonProps {
  task: Task
  className?: string
}

export const UnifiedDependencyButton = ({ task, className = '' }: UnifiedDependencyButtonProps) => {
  const [showDependencyModal, setShowDependencyModal] = useState(false)

  const totalBlockers = task.blockedBy.length + (task.dateDependency ? 1 : 0)

  return (
    <>
      <button
        onClick={() => setShowDependencyModal(true)}
        className={`${className} flex items-center justify-center w-6 h-6 rounded-full ${
          task.isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}
        title={task.isBlocked ? `${totalBlockers} items blocking this task` : `${task.blocking.length} tasks blocked by this task`}
      >
        {task.isBlocked ? totalBlockers : task.blocking.length}
      </button>

      {showDependencyModal && (
        <UnifiedDependencyModal
          task={task}
          onClose={() => setShowDependencyModal(false)}
        />
      )}
    </>
  )
} 