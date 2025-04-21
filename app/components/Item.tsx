import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from 'react-dnd'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DependencySelectionDialog } from './DependencySelectionDialog'
import { toast } from 'react-hot-toast'
import { renderMarkdown } from '@/src/utils/markdown'
import typeIcons, { typeColors, typeRingColors } from './typeIcons'
import { ItemTypes } from './ItemTypes'
import type { Dependency, Item, ItemType, ItemRow } from './types'
import { ItemEditor } from './ItemEditor'

function ItemTypeMenu({ item, isOpen, onClose, onUpdate }: { 
  item: Item
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: Partial<Item>) => void
}) {
  if (!isOpen) return null

  return (
    <div 
      className="w-32 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200"
    >
      <div className="p-1">
        <button 
          onClick={() => {
            onUpdate({ core: { ...item.core, type: null, manual_type: false } })
            onClose()
          }}
          className={`w-full text-left px-2 py-1 rounded text-sm ${!item.core.type ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
        >
          Auto
        </button>
        <button 
          onClick={() => {
            onUpdate({ core: { ...item.core, type: 'task', manual_type: true } })
            onClose()
          }}
          className={`w-full text-left px-2 py-1 rounded text-sm ${item.core.type === 'task' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
        >
          Task
        </button>
        <button 
          onClick={() => {
            onUpdate({ core: { ...item.core, type: 'mission', manual_type: true } })
            onClose()
          }}
          className={`w-full text-left px-2 py-1 rounded text-sm ${item.core.type === 'mission' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
        >
          Mission
        </button>
      </div>
    </div>
  )
}

function ItemDependencies({ 
  item, 
  isOpen, 
  onClose, 
  onUpdate,
  onAddDependency,
  onRemoveDependency,
  onAddDateDependency,
  onRemoveDateDependency
}: { 
  item: Item
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: Partial<Item>) => void
  onAddDependency: (taskId: string) => void
  onRemoveDependency: (depId: string) => void
  onAddDateDependency: (date: Date) => void
  onRemoveDateDependency: () => void
}) {
  if (!isOpen) return null

  const dateDependency = item.blockedBy.find(dep => dep.type === 'Date')

  return (
    <div 
      className="w-64 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200"
    >
      <div className="p-2">
        {item.blockedBy.length > 0 && (
          <div className="mb-2">
            <h3 className="text-xs font-medium text-gray-500 mb-1">Blocked by tasks:</h3>
            {item.blockedBy.map(dep => {
              const blockingTask = item.entries({ id: dep.data.id })[0];
              return (
                <div key={dep.data.id} className="flex items-center justify-between text-sm text-gray-700 py-1">
                  <span className="truncate flex-1 mr-2 flex items-center gap-1">
                    {blockingTask?.core.title || 'Unknown task'}
                  </span>
                  <button
                    onClick={() => onRemoveDependency(dep.data.id)}
                    className="text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {dateDependency && (
          <div className="mb-2">
            <h3 className="text-xs font-medium text-gray-500 mb-1">Date dependency:</h3>
            <div className="flex items-center justify-between text-sm text-gray-700 py-1">
              <span className="truncate flex-1 mr-2">
                Blocked until {new Date(dateDependency.data.unblock_at).toLocaleDateString()}
              </span>
              <button
                onClick={onRemoveDateDependency}
                className="text-red-600 hover:text-red-700 whitespace-nowrap"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              onAddDependency(item.core.id)
              onClose()
            }}
            className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 py-1"
          >
            Add task dependency...
          </button>
        </div>

        {!dateDependency && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                onAddDateDependency(new Date())
                onClose()
              }}
              className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 py-1"
            >
              Add date dependency...
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemActions({ 
  item,
  onAddChild,
  onDelete,
  onMoveUp,
  onMoveDown,
  onFocus,
  hasChildren,
  isFirst,
  isLast
}: { 
  item: Item
  onAddChild: (item: Item) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onFocus?: (item: Item) => void
  hasChildren: boolean
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex items-center sm:items-start gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 w-full sm:w-auto justify-between sm:justify-end sm:flex-shrink-0">
      <div className="flex gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAddChild(item)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>

        {onFocus && (
          <button
            onClick={() => onFocus(item)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Focus on this task"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z" />
              <path fillRule="evenodd" d="M2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        <button
          onClick={onDelete}
          className="p-1 text-gray-500 hover:text-red-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ItemContent({ 
  item,
  onEditingChange,
  searchQuery,
  onUpdate
}: { 
  item: Item
  onEditingChange?: (isEditing: boolean) => void
  searchQuery?: string
  onUpdate: (updates: Partial<Item>) => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  const handleContentSubmit = (processedContent: ProcessedContent) => {
    onUpdate({
      core: {
        ...item.core,
        title: processedContent.title,
        description: processedContent.description || null
      }
    });
    setIsEditing(false);
    if (onEditingChange) {
      onEditingChange(false);
    }
    toast.success(`${processedContent.title} updated`);
  };

  const highlightMatchingText = (text: string, searchQuery: string) => {
    if (!searchQuery?.trim()) return text;
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    
    if (!normalizedText.includes(normalizedQuery)) return text;
    
    const startIndex = normalizedText.indexOf(normalizedQuery);
    const endIndex = startIndex + normalizedQuery.length;
    
    return (
      <>
        {text.substring(0, startIndex)}
        <span className="bg-yellow-200">{text.substring(startIndex, endIndex)}</span>
        {text.substring(endIndex)}
      </>
    );
  };

  return (
    <div className="flex-grow">
      {isEditing ? (
        <div className="flex-grow relative" onClick={(e) => e.stopPropagation()}>
          <ItemEditor
            item={item}
            onCancel={() => {
              setIsEditing(false);
              if (onEditingChange) {
                onEditingChange(false);
              }
              toast.success('Edit cancelled');
            }}
            onSave={() => {
              setIsEditing(false);
              if (onEditingChange) {
                onEditingChange(false);
              }
            }}
          />
        </div>
      ) : (
        <div 
          className="flex-grow"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <div className="font-medium cursor-text hover:text-gray-600">
            {highlightMatchingText(item.core.title, searchQuery || '')}
          </div>
          {item.core.description && (
            <div className="mt-1 text-sm text-gray-600 cursor-text hover:text-gray-700 whitespace-pre-wrap break-words markdown-content">
              {renderMarkdown(highlightMatchingText(item.core.description, searchQuery || '') as string)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ProcessedContent {
  title: string;
  description?: string;
  dependencies: { id: string; title: string }[];
  subtasks: { id?: string; title: string; position: number }[];
}

interface ItemProps {
  item: Item
  onAddChild: (item: Item) => void
  onToggleComplete: (item: Item) => void
  searchQuery?: string
  viewMode?: 'tree' | 'list'
  onEditingChange?: (isEditing: boolean) => void
  breadcrumbs?: { id: string; title: string }[]
  onNavigate?: (id: string) => void
  onFocus?: (item: Item) => void
  siblingCount?: number
}

interface DragItem {
  id: string
  type: typeof ItemTypes.ITEM
  parentId: string | null
  position: number
}

const useClickOutside = (ref: React.RefObject<HTMLDivElement | null>, callback: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

function ItemBreadcrumbs({ breadcrumbs, onNavigate }: { 
  breadcrumbs: { id: string; title: string }[]
  onNavigate?: (id: string) => void
}) {
  if (breadcrumbs.length === 0 || !onNavigate) return null;

  return (
    <div className="mb-2 pb-1">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        {breadcrumbs.map((ancestor, i) => (
          <span key={ancestor.id} className="flex items-center">
            <button
              onClick={() => onNavigate(ancestor.id)}
              className="hover:text-gray-900"
            >
              {ancestor.title}
            </button>
            {i < breadcrumbs.length - 1 && (
              <svg className="w-3 h-3 ml-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ItemCollapse({ isCollapsed, onToggle }: { 
  isCollapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="p-1 -ml-2 text-gray-500 hover:text-gray-700"
    >
      <svg 
        className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fillRule="evenodd" 
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
          clipRule="evenodd" 
        />
      </svg>
    </button>
  );
}

function ItemComplete({ 
  isCompleted, 
  isBlocked, 
  hasChildren, 
  onToggle 
}: { 
  isCompleted: boolean
  isBlocked: boolean
  hasChildren: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={isBlocked}
      className={`
        w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
        ${isCompleted ? 'bg-green-500 border-green-600' : 'border-gray-300'}
        ${isBlocked ? 'cursor-not-allowed' : ''}
      `}
      title={isBlocked ? hasChildren ? 'All subitems are blocked' : 'Complete blocked tasks first' : undefined}
    >
      {isCompleted && (
        <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

function ItemDragHandle({ 
  isDragging, 
  setDragRef 
}: { 
  isDragging: boolean
  setDragRef: (node: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={setDragRef}
      style={{
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`
        p-2 rounded 
        transition-all duration-200 ease-in-out
        cursor-move
        'bg-white
        hover:bg-gray-50
      `}
    />
  );
}

function parseContentAndDependencies(content: string) {
  const lines = content.split('\n');
  const title = lines[0].trim();
  const description = lines.slice(1).join('\n').trim() || null;
  
  const dependencies: { id: string; title: string }[] = [];
  const subtasks: { id?: string; title: string; position: number }[] = [];
  
  lines.forEach(line => {
    // Parse dependencies
    const depMatch = line.match(/@\[(.*?)\]\(#(.*?)\)/);
    if (depMatch) {
      dependencies.push({
        id: depMatch[2],
        title: depMatch[1]
      });
    }
    
    // Parse subtasks
    const subtaskMatch = line.match(/^- \[(.*?)\]\(#(.*?)\)$/);
    if (subtaskMatch) {
      subtasks.push({
        id: subtaskMatch[2],
        title: subtaskMatch[1],
        position: subtasks.length
      });
    }
  });
  
  return {
    title,
    description,
    dependencies,
    subtasks
  };
}

export function Item({ 
  item, 
  onAddChild, 
  onToggleComplete, 
  searchQuery = '',
  viewMode = 'tree',
  onEditingChange,
  breadcrumbs = [],
  onNavigate,
  onFocus,
  siblingCount = 0
}: ItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(item.isCollapsed)
  const [isEditing, setIsEditing] = useState(item.core.title === '')
  const [editedContent, setEditedContent] = useState(item.core.description 
    ? `${item.core.title}\n${item.core.description}` 
    : item.core.title)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDependencyMenuOpen, setIsDependencyMenuOpen] = useState(false)
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false)
  const [isDependencySelectionOpen, setIsDependencySelectionOpen] = useState(false)
  const [isDateDependencyOpen, setIsDateDependencyOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>()
  
  const [showDepSuggestions, setShowDepSuggestions] = useState(false)
  const [showParentSuggestions, setShowParentSuggestions] = useState(false)
  const [filters, setFilters] = useState({
    dependency: '',
    parent: ''
  })
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [selectedParentIndex, setSelectedParentIndex] = useState(0)
  
  const contentInputRef = useRef<HTMLTextAreaElement>(null)
  const dependencyMenuRef = useRef<HTMLDivElement>(null)
  const dependencyButtonRef = useRef<HTMLButtonElement>(null)
  const typeMenuRef = useRef<HTMLDivElement>(null)
  const typeButtonRef = useRef<HTMLDivElement>(null)
  const depSuggestionsRef = useRef<HTMLDivElement>(null)
  const parentSuggestionsRef = useRef<HTMLDivElement>(null)

  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [deletedSubtasksQueue, setDeletedSubtasksQueue] = useState<{ id: string, title: string }[]>([]);
  const [isProcessingDeletion, setIsProcessingDeletion] = useState(false);
  
  const [pendingOperations, setPendingOperations] = useState<{
    title: string;
    description: string | undefined;
    newSubtasks: { title: string, position: number }[];
    existingSubtaskIds: string[];
    dependencies: { id: string, title: string }[];
    subtasksToProcess?: { id?: string, title: string, position: number }[];
  } | null>(null);

  const isSearchMatch = useMemo(() => {
    if (!searchQuery) return false;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedTitle = item.core.title.toLowerCase();
    const normalizedDescription = item.core.description?.toLowerCase() || '';
    return normalizedTitle.includes(normalizedQuery) || 
           normalizedDescription.includes(normalizedQuery);
  }, [searchQuery, item.core.title, item.core.description]);

  // Use the custom click outside hook for all menus
  useClickOutside(dependencyMenuRef, () => setIsDependencyMenuOpen(false));
  useClickOutside(typeMenuRef, () => setIsTypeMenuOpen(false));
  useClickOutside(depSuggestionsRef, () => setShowDepSuggestions(false));
  useClickOutside(parentSuggestionsRef, () => setShowParentSuggestions(false));

  // Remove redundant isCollapsed state and use item.isCollapsed directly
  const updateItem = (updates: Partial<Item>) => {
    item.update(updates);
  };

  useEffect(() => {
    setIsCollapsed(item.isCollapsed);
  }, [item.isCollapsed]);

  const handleTextareaResize = () => {
    if (contentInputRef.current) {
      contentInputRef.current.style.height = 'auto';
      contentInputRef.current.style.height = `${contentInputRef.current.scrollHeight + 2}px`;
    }
  };

  const formatDependenciesForEditing = () => {
    if (item.blockedBy.length === 0) return '';
    
    const depLines = item.blockedBy.map(dep => {
      const blockingTask = item.entries({ id: dep.data.id })[0];
      if (!blockingTask) return '';
      return `@[${blockingTask.core.title}](#${blockingTask.core.id})`;
    }).filter(Boolean);
    
    return depLines.join(' ');
  };

  const formatChildItemsForEditing = () => {
    if (item.subItems.length === 0) {
      return '';
    }
    
    const childItems = item.entries({ parent_id: item.core.id })
      .sort((a, b) => a.core.position - b.core.position);
    
    if (childItems.length === 0) {
      return '';
    }
    
    const listItems = childItems.map(childItem => 
      `- [${childItem.core.title}](#${childItem.core.id})`
    );
    
    return listItems.join('\n');
  };
  
  useEffect(() => {
    if (item.core.title === '') {
      setIsEditing(true);
    }
  }, [item.core.id, item.core.title]);

  useEffect(() => {
    if (isEditing) {
      const depsFormatted = formatDependenciesForEditing();
      const parentFormatted = formatParentForEditing();
      const childrenFormatted = formatChildItemsForEditing();
      
      const formattedContent = item.core.title +
        (parentFormatted ? `\n${parentFormatted}` : '') +
        (depsFormatted ? `\n${depsFormatted}` : '') +
        (item.core.description ? `\n${item.core.description}` : '') +
        (childrenFormatted ? `\n\n${childrenFormatted}` : '');
      
      setEditedContent(formattedContent);
      
      setTimeout(() => {
        if (contentInputRef.current) {
          contentInputRef.current.focus();
          const length = contentInputRef.current.value.length;
          contentInputRef.current.setSelectionRange(length, length);
          
          handleTextareaResize();
        }
      }, 10);
    }
  }, [isEditing, item.core.title, item.core.description]);

  const getCursorCoordinates = (textarea: HTMLTextAreaElement) => {
    const rect = textarea.getBoundingClientRect();
    
    return { 
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX + 10
    };
  };

  const debugDependency = (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[@Dependency] ${message}`);
    }
  };

  const debugParent = (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[^Parent] ${message}`);
    }
  };

  const formatParentForEditing = () => {
    if (!item.core.parent_id) return '';
    
    const parentItem = item.entries({ id: item.core.parent_id })[0];
    if (!parentItem) return '';
    
    return `^[${parentItem.core.title}](#${parentItem.core.id})`;
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '^') {
      debugParent('^ key pressed - showing suggestions');
      e.preventDefault();
      
      const cursorPos = e.currentTarget.selectionStart || 0;
      
      const newContent = 
        editedContent.substring(0, cursorPos) + 
        '^' + 
        editedContent.substring(cursorPos);
      
      setEditedContent(newContent);
      
      setTimeout(() => {
        const newCursorPos = cursorPos + 1;
        if (contentInputRef.current) {
          contentInputRef.current.selectionStart = newCursorPos;
          contentInputRef.current.selectionEnd = newCursorPos;
          
          const coords = getCursorCoordinates(contentInputRef.current);
          debugParent(`Showing dropdown at ${coords.top}, ${coords.left}`);
          setSelectedParentIndex(0);
          setFilters(prev => ({ ...prev, parent: '' }));
          setShowParentSuggestions(true);
        }
      }, 10);
      
      return;
    }
    
    if (showParentSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedParentIndex(prev => 
          Math.min(prev + 1, filteredParentTasks.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedParentIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredParentTasks.length > 0) {
        e.preventDefault();
        const selectedTask = filteredParentTasks[selectedParentIndex];
        if (selectedTask) {
          insertParent(selectedTask);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowParentSuggestions(false);
      }
      
      return;
    }
    
    if (e.key === '@') {
      debugDependency('@ key pressed - showing suggestions');
      e.preventDefault();
      
      const cursorPos = e.currentTarget.selectionStart || 0;
      
      const newContent = 
        editedContent.substring(0, cursorPos) + 
        '@' + 
        editedContent.substring(cursorPos);
      
      setEditedContent(newContent);
      
      setTimeout(() => {
        const newCursorPos = cursorPos + 1;
        if (contentInputRef.current) {
          contentInputRef.current.selectionStart = newCursorPos;
          contentInputRef.current.selectionEnd = newCursorPos;
          
          const coords = getCursorCoordinates(contentInputRef.current);
          debugDependency(`Showing dropdown at ${coords.top}, ${coords.left}`);
          setSelectedSuggestionIndex(0);
          setFilters(prev => ({ ...prev, dependency: '' }));
          setShowDepSuggestions(true);
        }
      }, 10);
      
      return;
    }
    
    if (showDepSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          Math.min(prev + 1, filteredTasks.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredTasks.length > 0) {
        e.preventDefault();
        const selectedTask = filteredTasks[selectedSuggestionIndex];
        if (selectedTask) {
          insertDependency(selectedTask);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDepSuggestions(false);
      }
      
      return;
    }
    
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleContentSubmit({ 
        title: editedContent.split('\n')[0],
        description: editedContent.split('\n').slice(1).join('\n'),
        dependencies: [],
        subtasks: []
      });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedContent(item.core.description 
        ? `${item.core.title}\n${item.core.description}` 
        : item.core.title);
      setIsEditing(false);
      toast.success('Edit cancelled');
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setEditedContent(newValue);
    
    if (showParentSuggestions) {
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastCaretPos = textBeforeCursor.lastIndexOf('^');
      
      if (lastCaretPos >= 0) {
        const filterText = textBeforeCursor.substring(lastCaretPos + 1);
        setFilters(prev => ({ ...prev, parent: filterText }));
        setSelectedParentIndex(0);
        
        if (filterText.includes(' ') && !filterText.includes('[')) {
          setShowParentSuggestions(false);
        }
      } else {
        setShowParentSuggestions(false);
      }
    }
    
    if (showDepSuggestions) {
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtPos = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtPos >= 0) {
        const filterText = textBeforeCursor.substring(lastAtPos + 1);
        setFilters(prev => ({ ...prev, dependency: filterText }));
        setSelectedSuggestionIndex(0);
        
        if (filterText.includes(' ') && !filterText.includes('[')) {
          setShowDepSuggestions(false);
        }
      } else {
        setShowDepSuggestions(false);
      }
    }
    
    handleTextareaResize();
  };
  
  const filteredTasks = useMemo(() => {
    return item.entries({ completed: false })
      .filter(task => 
        task.core.id !== item.core.id && 
        task.core.title.toLowerCase().includes(filters.dependency.toLowerCase())
      )
      .sort((a, b) => a.core.title.localeCompare(b.core.title))
      .slice(0, 10);
  }, [item.core.id, filters.dependency]);

  const filteredParentTasks = useMemo(() => {
    return item.entries({ completed: false })
      .filter(task => 
        task.core.id !== item.core.id && 
        (!task.core.parent_id || (task.core.parent_id && task.core.parent_id !== item.core.id)) &&
        task.core.title.toLowerCase().includes(filters.parent.toLowerCase())
      )
      .sort((a, b) => a.core.title.localeCompare(b.core.title))
      .slice(0, 10);
  }, [item.core.id, filters.parent]);

  const insertDependency = (task: Item) => {
    if (!contentInputRef.current) return;
    
    const textarea = contentInputRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = editedContent.substring(0, cursorPos);
    
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos >= 0) {
      const depText = `@[${task.core.title}](#${task.core.id})`;
      
      const newContent = 
        editedContent.substring(0, lastAtPos) + 
        depText + 
        editedContent.substring(cursorPos);
      
      setEditedContent(newContent);
      
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = lastAtPos + depText.length;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          
          handleTextareaResize();
        }
      }, 10);
    }
    
    setShowDepSuggestions(false);
  };

  const insertParent = (task: Item) => {
    if (!contentInputRef.current) return;
    
    const textarea = contentInputRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = editedContent.substring(0, cursorPos);
    
    const lastCaretPos = textBeforeCursor.lastIndexOf('^');
    
    if (lastCaretPos >= 0) {
      const parentText = `^[${task.core.title}](#${task.core.id})`;
      
      const newContent = 
        editedContent.substring(0, lastCaretPos) + 
        parentText + 
        editedContent.substring(cursorPos);
      
      setEditedContent(newContent);
      
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = lastCaretPos + parentText.length;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          
          handleTextareaResize();
        }
      }, 10);
    }
    
    setShowParentSuggestions(false);
  };

  const handleContentSubmit = (processedContent: ProcessedContent) => {
    performContentUpdate(
      processedContent.title,
      processedContent.description,
      processedContent.dependencies
    );
    processSubtasks(processedContent.subtasks);
  };
  
  const processSubtasks = (subtasks: { id?: string, title: string, position: number }[]) => {
    subtasks.forEach(subtask => {
      if (!subtask.id) {
        item.create({
          title: subtask.title,
          parent_id: item.core.id,
          position: subtask.position
        });
      } else {
        const existingSubtask = item.entry({id: subtask.id});
        if (existingSubtask) {
          existingSubtask.update({
            core: {
              ...existingSubtask.core,
              title: subtask.title,
              position: subtask.position
            }
          });
        }
      }
    });
  };
  
  const performContentUpdate = (
    title: string, 
    description?: string, 
    dependencies?: {id: string, title: string}[]
  ) => {
    const updatedItem = {
      ...item,
      core: {
        ...item.core,
        title,
        description: description || null
      },
      blockedBy: dependencies ? dependencies.map(dep => ({
        type: "Task" as const,
        data: {
          id: dep.id,
          blocking_task_id: dep.id,
          blocked_task_id: item.core.id,
          created_at: new Date().toISOString(),
          user_id: item.core.user_id || ''
        }
      })) : item.blockedBy
    };

    item.update(updatedItem);
  };

  const handleDeleteSubtaskConfirmed = (deleteChildren: boolean) => {
    if (deletingSubtaskId) {
      const subtask = item.entry({id: deletingSubtaskId});
      if (subtask) {
        subtask.delete(deleteChildren);
      }
      
      const updatedQueue = deletedSubtasksQueue.filter(s => s.id !== deletingSubtaskId);
      setDeletedSubtasksQueue(updatedQueue);
      
      if (updatedQueue.length > 0) {
        setTimeout(() => {
          setDeletingSubtaskId(updatedQueue[0].id);
        }, 100);
      } else {
        setDeletingSubtaskId(null);
        
        setTimeout(() => {
          if (pendingOperations) {
            const { title, description, dependencies, subtasksToProcess = [] } = pendingOperations;
            
            performContentUpdate(title, description, dependencies);
            
            if (subtasksToProcess.length > 0) {
              setTimeout(() => {
                processSubtasks(subtasksToProcess);
              }, 50);
            }
            
            setPendingOperations(null);
          }
          
          setIsProcessingDeletion(false);
        }, 150);
      }
    }
  };

  const dragItem: DragItem = {
    type: ItemTypes.ITEM,
    id: item.core.id,
    parentId: item.core.parent_id,
    position: item.core.position
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ITEM,
    item: dragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [dragItem])

  const setDragRef = useCallback((node: HTMLDivElement | null) => {
    drag(node);
  }, [drag]);

  const displayTitle = item.core.title
  const displayDescription = item.core.description
  
  const effectiveType = item.core.type || (() => {
    if (item.subItems.length === 0) return 'task' as ItemType
    return 'task' as ItemType
  })()

  const highlightMatchingText = (text: string, searchQuery: string) => {
    if (!isSearchMatch || !searchQuery.trim()) return text;
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    
    if (!normalizedText.includes(normalizedQuery)) return text;
    
    const startIndex = normalizedText.indexOf(normalizedQuery);
    const endIndex = startIndex + normalizedQuery.length;
    
    return (
      <>
        {text.substring(0, startIndex)}
        <span className="bg-yellow-200">{text.substring(startIndex, endIndex)}</span>
        {text.substring(endIndex)}
      </>
    );
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (contentInputRef.current && !contentInputRef.current.contains(event.target as Node)) {
      if (isEditing) {
        // Save changes when losing focus
        const content = contentInputRef.current.value;
        const processedContent = parseContentAndDependencies(content);
        handleContentSubmit({
          title: processedContent.title,
          description: processedContent.description,
          dependencies: processedContent.dependencies,
          subtasks: processedContent.subtasks
        });
        setIsEditing(false);
        if (onEditingChange) {
          onEditingChange(false);
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, onEditingChange]);

  // Add blur handler for textarea
  const handleBlur = () => {
    if (isEditing) {
      const content = contentInputRef.current?.value;
      if (content) {
        const processedContent = parseContentAndDependencies(content);
        handleContentSubmit({
          title: processedContent.title,
          description: processedContent.description,
          dependencies: processedContent.dependencies,
          subtasks: processedContent.subtasks
        });
      }
      setIsEditing(false);
      if (onEditingChange) {
        onEditingChange(false);
      }
    }
  };

  const hasChildren = item.subItems.length > 0;
  const childCount = item.subItems.length;

  const formattedBreadcrumbs = breadcrumbs.map(crumb => ({
    id: crumb.id,
    title: crumb.title
  }));

  const handlePositionUpdate = (newPosition: number) => {
    item.update({
      core: {
        ...item.core,
        position: newPosition
      }
    });
  };

  const handleTypeChange = (updates: Partial<Item>) => {
    updateItem(updates)
  };

  const handleToggleComplete = () => {
    const now = new Date().toISOString();
    const updates: Partial<Item> = {
      core: {
        ...item.core,
        completed: !item.core.completed,
        completed_at: !item.core.completed ? now : null
      }
    };
    item.update(updates);
  };

  const handleMoveItem = (direction: 'up' | 'down') => {
    const newPosition = direction === 'up' ? item.core.position - 1 : item.core.position + 1;
    const siblingItems = item.entries({ position: newPosition, parent_id: item.core.parent_id });
    const siblingItem = siblingItems[0];
    
    if (siblingItem) {
      const updates: Partial<Item> = {
        core: {
          ...item.core,
          position: newPosition
        }
      };
      item.update(updates);

      const siblingUpdates: Partial<Item> = {
        core: {
          ...siblingItem.core,
          position: item.core.position
        }
      };
      siblingItem.update(siblingUpdates);
    }
  };

  const handleParentChange = (parentId: string | null) => {
    const updates: Partial<Item> = {
      core: {
        ...item.core,
        parent_id: parentId
      }
    };
    item.update(updates);
  };

  return (
    <div className={`relative flex flex-col gap-2 ${isEditing ? 'bg-white shadow-lg rounded-lg p-4' : ''}`}>
      {/* <div className="flex items-center gap-2">
        <button
          onClick={() => handleMoveItem('up')}
          disabled={item.core.position === 0}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          ↑
        </button>
        <button
          onClick={() => handleMoveItem('down')}
          disabled={item.core.position === siblingCount - 1}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          ↓
        </button>
      </div> */}

      <ItemDragHandle isDragging={isDragging} setDragRef={setDragRef} />

      <ItemBreadcrumbs 
        breadcrumbs={formattedBreadcrumbs} 
        onNavigate={onNavigate} 
      />

      <div className="flex flex-col sm:flex-row sm:items-start gap-y-2 sm:gap-y-0 gap-x-4">
        <div className="flex items-start gap-4 flex-grow">
          <ItemComplete
            isCompleted={item.core.completed}
            isBlocked={item.isBlocked}
            hasChildren={hasChildren}
            onToggle={handleToggleComplete}
          />

          <div className="flex-grow">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <ItemCollapse
                  isCollapsed={isCollapsed}
                  onToggle={() => {
                    const newCollapsedState = !isCollapsed;
                    updateItem({ isCollapsed: newCollapsedState });
                  }}
                />
              )}

              <ItemContent
                item={item}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onEditingChange={onEditingChange}
                searchQuery={searchQuery}
                onUpdate={updateItem}
              />

              <div className="relative group/tooltip">
                <div
                  ref={typeButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTypeMenuOpen(!isTypeMenuOpen)
                  }} 
                  className={`
                    p-1 rounded-full inline-flex items-center justify-center cursor-pointer
                    ${typeColors[effectiveType as keyof typeof typeColors]}
                    ${item.core.manual_type ? `ring-1 ${typeRingColors[effectiveType as keyof typeof typeRingColors]}` : ''}
                  `}>
                  {typeIcons[effectiveType as keyof typeof typeIcons]}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 translate-y-full 
                                opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 
                                pointer-events-none z-10">
                  <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    {effectiveType} {item.core.manual_type ? '(Manual)' : '(Auto)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* <ItemActions
          item={item}
          onAddChild={onAddChild}
          onDelete={() => setIsDeleteDialogOpen(true)}
          onMoveUp={() => handleMoveItem('up')}
          onMoveDown={() => handleMoveItem('down')}
          onFocus={onFocus}
          hasChildren={hasChildren}
          isFirst={item.core.position === 0}
          isLast={item.core.position === siblingCount - 1}
        /> */}
      </div>
{/* 
      {hasChildren && (
        <div 
          className={`
            mt-2 ml-6 space-y-2 overflow-hidden transition-all duration-200 ease-in-out
            ${isCollapsed ? 'h-0 mt-0 opacity-0' : 'opacity-100'}
          `}
        >
          {item.subItems.map((child) => {
            const childItem = item.entry({id: child.id});
            if (!childItem) return null;
            return <Item
              key={child.id}
              item={childItem}
              onAddChild={onAddChild}
              onToggleComplete={onToggleComplete}
              breadcrumbs={[...formattedBreadcrumbs, { id: item.core.id, title: item.core.title }]}
              searchQuery={searchQuery}
              viewMode={viewMode}
            />
          })}
        </div>
      )} */}

      {isTypeMenuOpen && (
        <div className="absolute left-0 top-full mt-1">
          <ItemTypeMenu
            item={item}
            isOpen={isTypeMenuOpen}
            onClose={() => setIsTypeMenuOpen(false)}
            onUpdate={handleTypeChange}
          />
        </div>
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={(deleteChildren) => {
          item.delete(deleteChildren);
          setIsDeleteDialogOpen(false);
        }}
        hasChildren={hasChildren}
        itemTitle={item.core.title}
        childCount={childCount}
      />

      {isDependencyMenuOpen && typeof document !== 'undefined' && createPortal(
        <ItemDependencies
          item={item}
          isOpen={isDependencyMenuOpen}
          onClose={() => setIsDependencyMenuOpen(false)}
          onUpdate={updateItem}
          onAddDependency={(taskId) => {
            const newDependency: Dependency = {
              type: 'Task',
              data: {
                id: taskId,
                blocking_task_id: taskId,
                blocked_task_id: item.core.id,
                created_at: new Date().toISOString(),
                user_id: item.core.user_id || ''
              }
            };
            item.update({ blockedBy: [...item.blockedBy, newDependency] });
          }}
          onRemoveDependency={(depId) => {
            const updatedDependencies = item.blockedBy.filter((d: Dependency) => d.data.id !== depId);
            item.update({ blockedBy: updatedDependencies });
          }}
          onAddDateDependency={(date) => {
            item.update({ 
              blockedBy: [...item.blockedBy, { 
                type: 'Date', 
                data: { 
                  unblock_at: date.toISOString(), 
                  task_id: item.core.id, 
                  user_id: item.core.user_id || '', 
                  created_at: new Date().toISOString(), 
                  id: crypto.randomUUID() 
                } 
              }] 
            });
          }}
          onRemoveDateDependency={() => {
            item.update({ blockedBy: item.blockedBy.filter(dep => dep.type !== 'Date') });
          }}
        />,
        document.body
      )}

      <DependencySelectionDialog
        isOpen={isDependencySelectionOpen}
        onClose={() => setIsDependencySelectionOpen(false)}
        onSelect={(taskId) => {
          const newDependency: Dependency = {
            type: 'Task',
            data: {
              id: taskId,
              blocking_task_id: taskId,
              blocked_task_id: item.core.id,
              created_at: new Date().toISOString(),
              user_id: item.core.user_id || ''
            }
          };
          item.update({ blockedBy: [...item.blockedBy, newDependency] });
        }}
        currentTaskId={item.core.id}
        availableTasks={filteredTasks.map(task => ({
          id: task.core.id,
          created_at: task.core.created_at,
          title: task.core.title,
          description: task.core.description,
          parent_id: task.core.parent_id,
          position: task.core.position,
          completed: task.core.completed,
          completed_at: task.core.completed_at,
          user_id: task.core.user_id,
          type: task.core.type,
          manual_type: task.core.manual_type
        }))}
      />
      
      {deletingSubtaskId && (
        <DeleteConfirmationDialog
          isOpen={!!deletingSubtaskId}
          onClose={() => {
            setDeletedSubtasksQueue([]);
            setDeletingSubtaskId(null);
            setIsProcessingDeletion(false);
            handleContentSubmit({ 
              title: editedContent.split('\n')[0],
              description: editedContent.split('\n').slice(1).join('\n'),
              dependencies: [],
              subtasks: []
            });
          }}
          onConfirm={(deleteChildren) => {
            handleDeleteSubtaskConfirmed(deleteChildren);
          }}
          hasChildren={item.entries({ parent_id: deletingSubtaskId }).length > 0}
          itemTitle={deletedSubtasksQueue.find(s => s.id === deletingSubtaskId)?.title || 'Unknown Subtask'}
          childCount={item.entries({ parent_id: deletingSubtaskId }).length}
        />
      )}

      {showParentSuggestions && typeof document !== 'undefined' && createPortal(
        <div 
          ref={parentSuggestionsRef}
          style={{
            position: 'fixed',
            top: `${parentSuggestionsRef.current?.getBoundingClientRect().top || 0}px`,
            left: `${parentSuggestionsRef.current?.getBoundingClientRect().left || 0}px`,
            zIndex: 9999
          }}
          className="bg-white rounded-md shadow-xl border border-gray-300 max-h-64 overflow-y-auto w-72"
        >
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-600 px-2 py-1 mb-1 border-b border-gray-200">
              Set as parent {filters.parent ? `matching "${filters.parent}"` : ''}
            </div>
            
            {filteredParentTasks.length > 0 ? (
              <div className="max-h-52 overflow-y-auto">
                {filteredParentTasks.map((task, index) => (
                  <div
                    key={task.core.id}
                    onClick={() => insertParent(task)}
                    className={`
                      px-3 py-2 text-sm cursor-pointer flex items-center
                      ${index === selectedParentIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}
                    `}
                  >
                    <span className="mr-1.5 font-bold text-indigo-500">^</span>
                    <span className="truncate">{task.core.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                {filters.parent ? 'No matching tasks found' : 'Type to search for tasks'}
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-1 px-2 pt-1 border-t border-gray-100">
              Use ↑↓ to navigate, Enter to select
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
} 