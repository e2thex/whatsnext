import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTask } from '../services/tasks';
import { useFilter } from '../contexts/FilterContext';

interface ParentTask {
  id: string;
  title: string;
}

interface BreadcrumbNavProps {
  taskId: string;
}

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ taskId }) => {
  const { updateFilter, filter } = useFilter();

  // Get parent hierarchy
  const { data: parentHierarchy = [] } = useQuery({
    queryKey: ['parentHierarchy', taskId],
    queryFn: async () => {
      const hierarchy: ParentTask[] = [];
      const visitedIds = new Set<string>();
      let currentId = taskId;

      while (currentId) {
        const task = await getTask(currentId);
        if (!task || !task.parent_id || visitedIds.has(task.parent_id)) break;
        
        visitedIds.add(task.parent_id);
        const parent = await getTask(task.parent_id);
        if (parent) {
          hierarchy.unshift({ id: parent.id, title: parent.title });
          currentId = parent.id;
        } else {
          break;
        }
      }

      return hierarchy;
    },
  });

  const handleParentClick = (parentId: string) => {
    updateFilter({ focusedItemId: parentId });
  };

  if (!parentHierarchy.length) return null;

  // In list view with a focused item, only show breadcrumbs after the focused item
  const displayHierarchy = filter.viewMode === 'list' && filter.focusedItemId
    ? (() => {
        // Find the index of the focused item in the hierarchy
        const focusedIndex = parentHierarchy.findIndex(parent => parent.id === filter.focusedItemId);
        // If found, return everything after it, otherwise return the full hierarchy
        return focusedIndex >= 0 ? parentHierarchy.slice(focusedIndex + 1) : parentHierarchy;
      })()
    : parentHierarchy;

  if (!displayHierarchy.length) return null;

  return (
    <div className="mb-2 flex items-center text-sm text-gray-500">
      {displayHierarchy.map((parent, index) => (
        <span key={parent.id} className="flex items-center">
          {index > 0 && <span className="mx-1">/</span>}
          <button
            onClick={() => handleParentClick(parent.id)}
            className="hover:text-indigo-600"
          >
            {parent.title}
          </button>
        </span>
      ))}
    </div>
  );
};

export default BreadcrumbNav; 