import { type ReactNode, useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from 'react-dnd'
import { type Database, type ItemType } from '../../src/lib/supabase/client'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DependencySelectionDialog } from './DependencySelectionDialog'
import { toast } from 'react-hot-toast'
import { renderMarkdown } from '@/src/utils/markdown'

type ItemRow = Database['public']['Tables']['items']['Row']
type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']

interface ItemProps {
  item: ItemRow
  onAddChild: (parentId: string | null) => void
  onToggleComplete: (id: string) => void
  onTypeChange: (id: string, type: ItemType | null) => void
  onMoveItem: (id: string, direction: 'up' | 'down') => void
  onUpdateItem: (id: string, updates: { title?: string; description?: string }) => void
  onDeleteItem: (id: string, deleteChildren: boolean) => void
  onFocus: (id: string | null) => void
  onAddDependency: (blockingTaskId: string, blockedTaskId: string) => void
  onRemoveDependency: (blockingTaskId: string, blockedTaskId: string) => void
  onAddDateDependency: (taskId: string, unblockAt: Date) => void
  onRemoveDateDependency: (taskId: string) => void
  onCreateSubtask?: (parentId: string, title: string, position: number) => void
  onUpdateSubtask?: (subtaskId: string, updates: { title: string; position: number }) => void
  onReorderSubtasks?: (parentId: string, subtaskIds: string[]) => void
  onEditingChange?: (isEditing: boolean) => void
  siblingCount: number
  itemPosition: number
  children?: ReactNode
  hasChildren?: boolean
  childCount?: number
  blockingTasks?: TaskDependencyRow[]
  blockedByTasks?: TaskDependencyRow[]
  dateDependency?: DateDependencyRow
  availableTasks?: ItemRow[]
  childrenBlocked?: boolean
  isSearchMatch?: boolean
  breadcrumbs?: ItemRow[]
  onNavigate?: (id: string | null) => void
  searchQuery?: string
}

interface DragItem {
  id: string
  type: 'ITEM'
  parentId: string | null
  position: number
}

// Helper function to determine if an item is blocked
const isItemBlocked = (
  item: ItemRow,
  blockedByTasks: TaskDependencyRow[],
  availableTasks: ItemRow[],
  hasChildren: boolean,
  childrenBlocked: boolean,
  dateDependency?: DateDependencyRow
): boolean => {
  // Check date dependency
  if (dateDependency && new Date(dateDependency.unblock_at) > new Date()) {
    return true
  }

  // Check direct task dependencies
  const isDirectlyBlocked = blockedByTasks.length > 0 && blockedByTasks.some(dep => {
    const blockingTask = availableTasks?.find(t => t.id === dep.blocking_task_id)
    return blockingTask && !blockingTask.completed
  })

  // If it has no children, just check direct blockage
  if (!hasChildren) {
    return isDirectlyBlocked
  }

  // If it has children, it's blocked if either:
  // 1. It's directly blocked by dependencies, OR
  // 2. All its children are blocked
  return isDirectlyBlocked || childrenBlocked
}

export function Item({ 
  item, 
  onAddChild, 
  onToggleComplete, 
  onTypeChange, 
  onMoveItem,
  onUpdateItem,
  onDeleteItem,
  onFocus,
  onAddDependency,
  onRemoveDependency,
  onAddDateDependency,
  onRemoveDateDependency,
  onCreateSubtask,
  onUpdateSubtask,
  onEditingChange,
  siblingCount,
  itemPosition,
  children,
  hasChildren = false,
  childCount = 0,
  blockingTasks = [],
  blockedByTasks = [],
  dateDependency,
  availableTasks = [],
  childrenBlocked = false,
  isSearchMatch = false,
  breadcrumbs = [],
  onNavigate,
  searchQuery = ''
}: ItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isEditing, setIsEditing] = useState(item.title === '')
  const [editedContent, setEditedContent] = useState(item.description 
    ? `${item.title}\n${item.description}` 
    : item.title)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDependencyMenuOpen, setIsDependencyMenuOpen] = useState(false)
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false)
  const [isDependencySelectionOpen, setIsDependencySelectionOpen] = useState(false)
  const [isDateDependencyOpen, setIsDateDependencyOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    dateDependency ? new Date(dateDependency.unblock_at) : null
  )
  
  // This works around the line ~92-93 where we use filterText
  const [showDepSuggestions, setShowDepSuggestions] = useState(false)
  const [depSuggestionPos, setDepSuggestionPos] = useState({ top: 0, left: 0 })
  const [filterText, setFilterText] = useState('')
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  
  const contentInputRef = useRef<HTMLTextAreaElement>(null)
  const dependencyMenuRef = useRef<HTMLDivElement>(null)
  const dependencyButtonRef = useRef<HTMLButtonElement>(null)
  const typeMenuRef = useRef<HTMLDivElement>(null)
  const typeButtonRef = useRef<HTMLDivElement>(null)
  const depSuggestionsRef = useRef<HTMLDivElement>(null)

  // First add a new state variable to track subtasks pending deletion
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  // Use only the setter if that's all we need
  const [, setCurrentChildItems] = useState<ItemRow[]>([]);
  // Add a state to track all deleted subtasks and their metadata for consistent display
  const [deletedSubtasksQueue, setDeletedSubtasksQueue] = useState<{ id: string, title: string }[]>([]);
  // Track if we're in the process of deleting subtasks to prevent new creation
  const [isProcessingDeletion, setIsProcessingDeletion] = useState(false);
  
  // Add new state to track pending operations after deletion
  const [pendingOperations, setPendingOperations] = useState<{
    title: string;
    description: string | undefined;
    newSubtasks: { title: string, position: number }[];
    existingSubtaskIds: string[];
    dependencies: { id: string, title: string }[];
    subtasksToProcess?: { id?: string, title: string, position: number }[];
  } | null>(null);

  // Add a useEffect to initialize currentChildItems when we start editing
  useEffect(() => {
    if (isEditing && hasChildren) {
      const childItems = availableTasks
        .filter(task => task.parent_id === item.id)
        .sort((a, b) => a.position - b.position);
      
      setCurrentChildItems(childItems);
    }
  }, [isEditing, hasChildren, item.id, availableTasks]);

  // Add function to handle resizing the textarea
  const handleTextareaResize = () => {
    if (contentInputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      contentInputRef.current.style.height = 'auto';
      // Set the height to match the content (plus a small buffer)
      contentInputRef.current.style.height = `${contentInputRef.current.scrollHeight + 2}px`;
    }
  };

  // Format dependencies for editing - moved up before useEffect
  const formatDependenciesForEditing = () => {
    // Only include this for items with dependencies
    if (blockedByTasks.length === 0) return '';
    
    // Format each dependency as @[TITLE](#ID)
    const depLines = blockedByTasks.map(dep => {
      const blockingTask = availableTasks?.find(t => t.id === dep.blocking_task_id);
      if (!blockingTask) return '';
      return `@[${blockingTask.title}](#${blockingTask.id})`;
    }).filter(Boolean);
    
    // Join with spaces and return
    return depLines.join(' ');
  };

  // Format child items for Markdown list format
  const formatChildItemsForEditing = () => {
    // Only include this for items with children
    if (!hasChildren || childCount === 0) {
      return '';
    }
    
    // Get child items directly from availableTasks using the current item's ID as parent
    const childItems = availableTasks
      .filter(task => task.parent_id === item.id)
      .sort((a, b) => a.position - b.position);
    
    if (childItems.length === 0) {
      return '';
    }
    
    // Format each child as a list item with a link
    const listItems = childItems.map(childItem => 
      `- [${childItem.title}](#${childItem.id})`
    );
    
    const formattedList = listItems.join('\n');
    
    // Join with newlines and return
    return formattedList;
  };
  
  // Automatically focus content input for new/empty items
  useEffect(() => {
    if (item.title === '') {
      setIsEditing(true);
    }
  }, [item.id, item.title]);

  // Update content when starting to edit
  useEffect(() => {
    if (isEditing) {
      // Format content with dependencies and child items
      const depsFormatted = formatDependenciesForEditing();
      const childrenFormatted = formatChildItemsForEditing();
      
      const formattedContent = item.title +
        (depsFormatted ? `\n${depsFormatted}` : '') +
        (item.description ? `\n${item.description}` : '') +
        (childrenFormatted ? `\n\n${childrenFormatted}` : '');
      
      setEditedContent(formattedContent);
      
      // Focus the textarea
      setTimeout(() => {
        if (contentInputRef.current) {
          contentInputRef.current.focus();
          // Place cursor at the end of the content
          const length = contentInputRef.current.value.length;
          contentInputRef.current.setSelectionRange(length, length);
          
          // Make sure the textarea is correctly sized
          handleTextareaResize();
        }
      }, 10);
    }
  }, [isEditing, item.title, item.description]);

  // Close dependency suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDepSuggestions &&
        depSuggestionsRef.current &&
        !depSuggestionsRef.current.contains(event.target as Node) &&
        !contentInputRef.current?.contains(event.target as Node)
      ) {
        setShowDepSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDepSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDependencyMenuOpen &&
        dependencyMenuRef.current &&
        !dependencyMenuRef.current.contains(event.target as Node)
      ) {
        setIsDependencyMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDependencyMenuOpen])

  useEffect(() => {
    if (isDependencyMenuOpen && dependencyButtonRef.current) {
      const buttonRect = dependencyButtonRef.current.getBoundingClientRect()
      const menuTop = `${buttonRect.top + (buttonRect.height / 2) + window.scrollY}px`
      const menuLeft = `${buttonRect.left + window.scrollX}px`
      
      document.documentElement.style.setProperty('--menu-top', menuTop)
      document.documentElement.style.setProperty('--menu-left', menuLeft)
    }
  }, [isDependencyMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isTypeMenuOpen &&
        typeMenuRef.current &&
        !typeMenuRef.current.contains(event.target as Node)
      ) {
        setIsTypeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTypeMenuOpen])

  useEffect(() => {
    if (isTypeMenuOpen && typeButtonRef.current) {
      const buttonRect = typeButtonRef.current.getBoundingClientRect()
      const menuTop = `${buttonRect.bottom + window.scrollY}px`
      const menuLeft = `${buttonRect.left + window.scrollX}px`
      
      document.documentElement.style.setProperty('--type-menu-top', menuTop)
      document.documentElement.style.setProperty('--type-menu-left', menuLeft)
    }
  }, [isTypeMenuOpen])

  // Parse content and extract dependencies
  const parseContentAndDependencies = (content: string) => {
    // Extract dependencies using regex
    const depRegex = /@\[(.*?)\]\(#(.*?)\)/g;
    const matches = Array.from(content.matchAll(depRegex));
    
    // Extract dependencies
    const dependencies = matches.map(match => ({
      title: match[1],
      id: match[2]
    }));
    
    // Remove dependency markup from content
    const cleanContent = content.replace(depRegex, '').trim();
    
    return { cleanContent, dependencies };
  };

  // Parse content and extract subtasks
  
  // Get cursor coordinates function - simplified approach without unused parameters
  const getCursorCoordinates = (textarea: HTMLTextAreaElement) => {
    // Get textarea dimensions and position
    const rect = textarea.getBoundingClientRect();
    
    // Use a simpler approach - just position below the textarea
    return { 
      top: rect.bottom + window.scrollY + 5, // 5px below the textarea
      left: rect.left + window.scrollX + 10 // 10px from the left edge
    };
  };

  // Add a simple debug function for tracing the dependency dropdown
  const debugDependency = (message: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[@Dependency] ${message}`);
    }
  };

  // Completely rewrite handleTextareaKeyDown for better handling
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle @ character to trigger suggestions
    if (e.key === '@') {
      debugDependency('@ key pressed - showing suggestions');
      e.preventDefault();
      
      // Get cursor position
      const cursorPos = e.currentTarget.selectionStart || 0;
      
      // Insert @ manually
      const newContent = 
        editedContent.substring(0, cursorPos) + 
        '@' + 
        editedContent.substring(cursorPos);
      
      setEditedContent(newContent);
      
      // Need to delay showing suggestions until state updates
      setTimeout(() => {
        const newCursorPos = cursorPos + 1;
        if (contentInputRef.current) {
          contentInputRef.current.selectionStart = newCursorPos;
          contentInputRef.current.selectionEnd = newCursorPos;
          
          // Get coordinates for dropdown - using our utility function
          const coords = getCursorCoordinates(contentInputRef.current);
          debugDependency(`Showing dropdown at ${coords.top}, ${coords.left}`);
          setDepSuggestionPos(coords);
          setFilterText('');
          setSelectedSuggestionIndex(0);
          setShowDepSuggestions(true);
        }
      }, 10);
      
      return;
    }
    
    // Navigation in dropdown
    if (showDepSuggestions) {
      // Handle keyboard navigation in dropdown
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
    
    // Original handlers
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleContentSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditedContent(item.description 
        ? `${item.title}\n${item.description}` 
        : item.title);
      setIsEditing(false);
      toast.success('Edit cancelled');
    }
  };

  // Modify the handleTextareaChange function to match the updated getCursorCoordinates signature
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setEditedContent(newValue);
    
    // Handle dependency suggestions
    if (showDepSuggestions) {
      // Get text before cursor
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtPos = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtPos >= 0) {
        // Get filter text (text after last @)
        const filterText = textBeforeCursor.substring(lastAtPos + 1);
        
        setFilterText(filterText);
        setSelectedSuggestionIndex(0);
        
        // If we typed a space after @ without starting a tag, close suggestions
        if (filterText.includes(' ') && !filterText.includes('[')) {
          setShowDepSuggestions(false);
        }
      } else {
        // No @ found, close suggestions
        setShowDepSuggestions(false);
      }
      
      // Update position since text might have changed
      if (contentInputRef.current) {
        const coords = getCursorCoordinates(contentInputRef.current);
        setDepSuggestionPos(coords);
      }
    }
    
    // Auto-resize the textarea
    handleTextareaResize();
  };
  
  // Update the filter for tasks
  const filteredTasks = useMemo(() => {
    return availableTasks
      .filter(task => 
        // Don't include current task
        task.id !== item.id && 
        // Only include tasks that match filter text
        task.title.toLowerCase().includes(filterText.toLowerCase())
      )
      // Sort alphabetically
      .sort((a, b) => a.title.localeCompare(b.title))
      // Limit results
      .slice(0, 10);
  }, [availableTasks, item.id, filterText]);

  // Use direct DOM insertion approach for dependency
  const insertDependency = (task: ItemRow) => {
    if (!contentInputRef.current) return;
    
    const textarea = contentInputRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = editedContent.substring(0, cursorPos);
    
    // Find the last @ character
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos >= 0) {
      // Format dependency
      const depText = `@[${task.title}](#${task.id})`;
      
      // Replace everything from @ to cursor with the formatted dependency
      const newContent = 
        editedContent.substring(0, lastAtPos) + 
        depText + 
        editedContent.substring(cursorPos);
      
      setEditedContent(newContent);
      
      // Move cursor after insertion
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = lastAtPos + depText.length;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          
          // Resize textarea
          handleTextareaResize();
        }
      }, 10);
    }
    
    // Close suggestions
    setShowDepSuggestions(false);
  };
  
  // Now modify the handleContentSubmit function with a simpler, more functional approach
  const handleContentSubmit = () => {
    // If we're in the process of deleting subtasks, don't proceed with the normal save flow
    if (isProcessingDeletion) {
      return;
    }
    
    // Parse content and extract dependencies
    const { cleanContent: contentWithoutDeps, dependencies } = parseContentAndDependencies(editedContent);
    
    // Split content by lines
    const contentLines = contentWithoutDeps.split('\n');
    const title = contentLines[0].trim();
    const description = contentLines.slice(1).filter(line => !line.trim().startsWith('- ')).join('\n').trim();
    
    // Basic validation - title is required
    if (title === '') {
      toast.error('Task title cannot be empty');
      contentInputRef.current?.focus();
      return;
    }
    
    // STEP 1: Get current subtasks from database
    const currentSubtasks = availableTasks
      .filter(task => task.parent_id === item.id)
      .map(task => ({ id: task.id, title: task.title }));
    
    // STEP 2: Parse the subtasks from content
    const subtasksToProcess: { id?: string, title: string, position: number }[] = [];
    
    // Find all lines that start with "- " and parse them
    contentLines.forEach((line) => {
      // Check for existing subtask format: - [Title](#id)
      const existingMatch = line.trim().match(/^-\s*\[(.*?)\]\(#(.*?)\)$/);
      // Check for new subtask format: - Title
      const newMatch = line.trim().match(/^-\s+(.+)$/);
      
      if (existingMatch) {
        // This is an existing subtask
        subtasksToProcess.push({
          id: existingMatch[2],
          title: existingMatch[1].trim(),
          position: subtasksToProcess.length
        });
      } else if (newMatch) {
        // This is a new subtask to create
        subtasksToProcess.push({
          title: newMatch[1].trim(),
          position: subtasksToProcess.length
        });
      }
    });
    
    // Find subtasks to delete (in currentSubtasks but not in subtasksToProcess)
    const subtasksToDelete = currentSubtasks.filter(
      current => !subtasksToProcess.some(toProcess => toProcess.id === current.id)
    );
    
    // Handle deletions first if there are any
    if (subtasksToDelete.length > 0) {
      // Set deletion mode
      setIsProcessingDeletion(true);
      
      // Store the pending work for after deletion
      setPendingOperations({
        title,
        description: description || undefined,
        dependencies,
        subtasksToProcess,
        newSubtasks: [],
        existingSubtaskIds: []
      });
      
      // Start deletion process
      setDeletedSubtasksQueue(subtasksToDelete);
      setDeletingSubtaskId(subtasksToDelete[0].id);
    }
    
    // No deletions needed, proceed with update and create
    performContentUpdate(title, description, dependencies);
    processSubtasks(subtasksToProcess);
  };
  
  // Process subtasks function to handle adding/updating
  const processSubtasks = (subtasks: { id?: string, title: string, position: number }[]) => {
    console.log('Processing subtasks', subtasks);
    // Process each subtask - using a more functional approach
    subtasks.forEach(subtask => {
      if (!subtask.id) {
        // This is a new subtask - create it
        if (onCreateSubtask) {
          onCreateSubtask(item.id, subtask.title, subtask.position);
        }
      } else {
        // This is an existing subtask - update it
        if (onUpdateSubtask) {
          // Update the title and position directly
          onUpdateSubtask(subtask.id, { 
            title: subtask.title, 
            position: subtask.position 
          });
        }
      }
    });
    
    // We no longer need the separate reordering step as each subtask is updated individually
    // with its position, which is a more functional approach
  };
  
  // Update content only (title, description, dependencies)
  const performContentUpdate = (
    title: string, 
    description?: string, 
    dependencies?: {id: string, title: string}[]
  ) => {
    // Update the item title and description
    onUpdateItem(item.id, { title, description });
    
    // Process dependencies if provided
    if (dependencies) {
      dependencies.forEach(dep => {
        const existingDep = blockedByTasks.find(
          blockDep => blockDep.blocking_task_id === dep.id
        );
        
        if (!existingDep) {
          // Add the new dependency
          onAddDependency(dep.id, item.id);
        }
      });
    }
    
    // Exit editing mode
    setIsEditing(false);
    toast.success('Task updated successfully');
  };

  // Add a callback to handle when delete is confirmed - completely rewritten
  const handleDeleteSubtaskConfirmed = (deleteChildren: boolean) => {
    if (deletingSubtaskId) {
      // Find the current subtask from our queue
      
      // Get the subtask title for logging
      
      // Call the existing delete function
      onDeleteItem(deletingSubtaskId, deleteChildren);
      
      // Remove the current subtask from the queue
      const updatedQueue = deletedSubtasksQueue.filter(s => s.id !== deletingSubtaskId);
      setDeletedSubtasksQueue(updatedQueue);
      
      // Check if there are more subtasks to delete
      if (updatedQueue.length > 0) {
        // Process the next deleted subtask
        setTimeout(() => {
          setDeletingSubtaskId(updatedQueue[0].id);
        }, 100); // Small delay to ensure UI updates correctly
      } else {
        // All deletions are completed
        
        // Reset deletion states
        setDeletingSubtaskId(null);
        
        // Add small delay before proceeding with other operations
        setTimeout(() => {
          // Now perform the pending operations if they exist
          if (pendingOperations) {
            const { title, description, dependencies, subtasksToProcess = [] } = pendingOperations;
            
            // First update the content
            performContentUpdate(title, description, dependencies);
            
            // Then process the subtasks
            if (subtasksToProcess.length > 0) {
              setTimeout(() => {
                processSubtasks(subtasksToProcess);
              }, 50);
            }
            
            // Clear pending operations
            setPendingOperations(null);
          }
          
          // Turn off deletion mode
          setIsProcessingDeletion(false);
        }, 150);
      }
    }
  };

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: 'ITEM',
    item: {
      id: item.id,
      type: 'ITEM',
      parentId: item.parent_id,
      position: item.position
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: () => !isEditing
  })

  const setDragRef = useCallback((node: HTMLDivElement | null) => {
    drag(node)
  }, [drag])

  const typeColors = {
    Task: 'bg-blue-100 text-blue-800',
    Mission: 'bg-green-100 text-green-800',
    Objective: 'bg-purple-100 text-purple-800',
    Ambition: 'bg-red-100 text-red-800'
  } as const

  const typeRingColors = {
    Task: 'ring-blue-500',
    Mission: 'ring-green-500',
    Objective: 'ring-purple-500',
    Ambition: 'ring-red-500'
  } as const

  // SVG icons for each type
  const typeIcons = {
    Task: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    ),
    Mission: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
    Objective: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
      </svg>
    ),
    Ambition: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20">
        <path d="M10,2 L7,14 L10,12 L13,14 L10,2 Z" fill="currentColor" />
        <path d="M8,14 L6,17 L7.5,16.5 L9,18 L8,14 Z" fill="currentColor" />
        <path d="M12,14 L14,17 L12.5,16.5 L11,18 L12,14 Z" fill="currentColor" />
      </svg>
    )
  } as const;

  const isBlocked = isItemBlocked(item, blockedByTasks, availableTasks, hasChildren, childrenBlocked, dateDependency)

  // Get the title and description from the current item for display
  const displayTitle = item.title
  const displayDescription = item.description
  
  // Determine the effective type to display based on automatic or manual setting
  const effectiveType = item.type || (() => {
    // This replicates the automatic type calculation logic
    if (!hasChildren) return 'Task' as ItemType
    if (childCount === 0) return 'Task' as ItemType
    return 'Mission' as ItemType // Default for items with children when auto-calculated
  })()

  // Add a new helper function to highlight matching text
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

  // Add this new effect to handle clicking outside the editing area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        contentInputRef.current &&
        !contentInputRef.current.contains(event.target as Node) &&
        (!depSuggestionsRef.current || !depSuggestionsRef.current.contains(event.target as Node))
      ) {
        // Save content when clicking outside
        handleContentSubmit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  // Add a useEffect to notify the parent when isEditing changes
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isEditing);
    }
  }, [isEditing, onEditingChange]);

  return (
    <div className={`
      relative group
    `}>
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
          ${!isBlocked ? 'hover:bg-gray-50' : ''}
        `}
      >
        {/* Display breadcrumbs if available */}
        {breadcrumbs.length > 0 && onNavigate && (
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
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(item.id);
            }}
            disabled={isBlocked}
            className={`
              w-5 h-5 rounded border flex items-center justify-center
              ${item.completed ? 'bg-green-500 border-green-600' : 'border-gray-300'}
              ${isBlocked ? 'cursor-not-allowed' : ''}
            `}
            title={isBlocked ? hasChildren ? 'All subitems are blocked' : 'Complete blocked tasks first' : undefined}
          >
            {item.completed && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <div className="flex-grow">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsed(!isCollapsed);
                  }}
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
              )}
              {isEditing ? (
                <div className="flex-grow relative" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    ref={contentInputRef}
                    value={editedContent}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    className="w-full px-1 py-0.5 text-base font-medium border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[60px] bg-white text-gray-800"
                    rows={Math.max(2, editedContent.split('\n').length)}
                    placeholder="Type title here (first line)&#10;Add details here (following lines). Type @ to mention dependencies."
                    onInput={handleTextareaResize}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute inset-x-0 top-[24px] border-t border-gray-200 opacity-50 pointer-events-none" />
                  <div className="text-xs text-gray-500 mt-1">
                    First line: title, list: subtasks, rest: description. Type @ to add dependencies. Supports markdown and links.
                    <br />
                    Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> to save, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to cancel.
                  </div>
                  
                  {/* Dependency suggestions dropdown - using portal to ensure it's directly in body */}
                  {showDepSuggestions && typeof document !== 'undefined' && createPortal(
                    <div 
                      ref={depSuggestionsRef}
                      style={{
                        position: 'fixed',
                        top: `${depSuggestionPos.top}px`,
                        left: `${depSuggestionPos.left}px`,
                        zIndex: 9999
                      }}
                      className="bg-white rounded-md shadow-xl border border-gray-300 max-h-64 overflow-y-auto w-72"
                    >
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-600 px-2 py-1 mb-1 border-b border-gray-200">
                          Dependencies {filterText ? `matching "${filterText}"` : ''}
                        </div>
                        
                        {filteredTasks.length > 0 ? (
                          <div className="max-h-52 overflow-y-auto">
                            {filteredTasks.map((task, index) => (
                              <div
                                key={task.id}
                                onClick={() => insertDependency(task)}
                                className={`
                                  px-3 py-2 text-sm cursor-pointer flex items-center
                                  ${index === selectedSuggestionIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}
                                `}
                              >
                                <span className="mr-1.5 font-bold text-indigo-500">@</span>
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {filterText ? 'No matching tasks found' : 'Type to search for tasks'}
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
              ) : (
                <div 
                  className="flex-grow"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      ref={dependencyButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDependencyMenuOpen(!isDependencyMenuOpen)
                      }}
                      className="flex items-center justify-center hover:opacity-80 transition-opacity"
                      title={isBlocked ? hasChildren ? 'All subitems are blocked' : 'Task is blocked - Click to manage dependencies' : 'Task is unblocked - Click to manage dependencies'}
                    >
                      <div 
                        className={`
                          w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium
                          ${isBlocked ? 'bg-red-500' : 'bg-green-500'}
                        `}
                      >
                        {isBlocked ? blockedByTasks.length + (dateDependency ? 1 : 0) : blockingTasks.length}
                      </div>
                    </button>
                    <span className="font-medium cursor-text hover:text-gray-600">
                      {highlightMatchingText(displayTitle, searchQuery.trim())}
                    </span>
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
                          ${item.manual_type ? `ring-1 ${typeRingColors[effectiveType as keyof typeof typeRingColors]}` : ''}
                        `}>
                        {typeIcons[effectiveType as keyof typeof typeIcons]}
                      </div>
                      {/* Tooltip that appears on hover */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 translate-y-full 
                                      opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 
                                      pointer-events-none z-10">
                        <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          {effectiveType} {item.manual_type ? '(Manual)' : '(Auto)'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {displayDescription && (
                    <div 
                      className="mt-1 text-sm text-gray-600 cursor-text hover:text-gray-700 whitespace-pre-wrap break-words markdown-content"
                    >
                      {renderMarkdown(highlightMatchingText(displayDescription, searchQuery.trim()) as string)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveItem(item.id, 'up');
                }}
                disabled={itemPosition === 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveItem(item.id, 'down');
                }}
                disabled={itemPosition === siblingCount - 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(item.id);
              }}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onFocus(item.id);
              }}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Focus on this task"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z" />
                <path fillRule="evenodd" d="M2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
              className="p-1 text-gray-500 hover:text-red-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {children && (
          <div 
            className={`
              mt-2 ml-6 space-y-2 overflow-hidden transition-all duration-200 ease-in-out
              ${isCollapsed ? 'h-0 mt-0 opacity-0' : 'opacity-100'}
            `}
          >
            {children}
          </div>
        )}
      </div>

      {/* Type menu dropdown */}
      {isTypeMenuOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={typeMenuRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            transform: 'translate(var(--type-menu-left), var(--type-menu-top))',
          }}
          className="w-32 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200"
        >
          <div className="p-1">
            <button 
              onClick={() => {
                onTypeChange(item.id, null)
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${!item.type ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Auto
            </button>
            <button 
              onClick={() => {
                onTypeChange(item.id, 'Task' as ItemType)
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${item.type === ('Task' as ItemType) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Task
            </button>
            <button 
              onClick={() => {
                onTypeChange(item.id, 'Mission' as ItemType)
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${item.type === ('Mission' as ItemType) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Mission
            </button>
            <button 
              onClick={() => {
                onTypeChange(item.id, 'Objective' as ItemType)
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${item.type === ('Objective' as ItemType) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Objective
            </button>
            <button 
              onClick={() => {
                onTypeChange(item.id, 'Ambition' as ItemType)
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${item.type === ('Ambition' as ItemType) ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Ambition
            </button>
          </div>
        </div>,
        document.body
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={(deleteChildren) => {
          onDeleteItem(item.id, deleteChildren)
          setIsDeleteDialogOpen(false)
        }}
        hasChildren={hasChildren}
        itemTitle={item.title}
        childCount={childCount}
      />

      {isDependencyMenuOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dependencyMenuRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            transform: 'translate(var(--menu-left), var(--menu-top))',
          }}
          className="w-64 bg-white rounded-lg shadow-lg z-[9999] border border-gray-200"
        >
          <div className="p-2">
            {/* Task dependencies section */}
            {blockedByTasks.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Blocked by tasks:</h3>
                {blockedByTasks.map(dep => {
                  const blockingTask = availableTasks?.find(t => t.id === dep.blocking_task_id)
                  const isCompleted = blockingTask?.completed
                  return (
                    <div key={dep.id} className="flex items-center justify-between text-sm text-gray-700 py-1">
                      <span className={`truncate flex-1 mr-2 flex items-center gap-1 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {isCompleted && (
                          <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {blockingTask?.title || 'Unknown task'}
                      </span>
                      <button
                        onClick={() => onRemoveDependency(dep.blocking_task_id, item.id)}
                        className="text-red-600 hover:text-red-700 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            
            {blockingTasks.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Blocking tasks:</h3>
                {blockingTasks.map(dep => {
                  const blockedTask = availableTasks?.find(t => t.id === dep.blocked_task_id)
                  const isCompleted = blockedTask?.completed
                  return (
                    <div key={dep.id} className="flex items-center justify-between text-sm text-gray-700 py-1">
                      <span className={`truncate flex-1 mr-2 flex items-center gap-1 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {isCompleted && (
                          <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {blockedTask?.title || 'Unknown task'}
                      </span>
                      <button
                        onClick={() => onRemoveDependency(item.id, dep.blocked_task_id)}
                        className="text-red-600 hover:text-red-700 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {blockingTasks.length === 0 && blockedByTasks.length === 0 && !dateDependency && (
              <p className="text-sm text-gray-500 py-1">No dependencies</p>
            )}

            <div className="mt-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsDependencySelectionOpen(true)
                  setIsDependencyMenuOpen(false)
                }}
                className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 py-1"
              >
                Add task dependency...
              </button>
            </div>

            {/* Date dependency section */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Date dependency:</h3>
              {dateDependency ? (
                <div className="flex items-center justify-between text-sm text-gray-700 py-1">
                  <span className="truncate flex-1 mr-2">
                    Blocked until {new Date(dateDependency.unblock_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onRemoveDateDependency(item.id)}
                    className="text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsDateDependencyOpen(true)}
                  className="w-full text-left text-sm text-indigo-600 hover:text-indigo-700 py-1"
                >
                  Add date dependency...
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Date dependency dialog */}
      {isDateDependencyOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96">
            <h2 className="text-lg font-medium mb-4">Add Date Dependency</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unblock Date
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={selectedDate?.toISOString().slice(0, 16) || ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsDateDependencyOpen(false)
                  setSelectedDate(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedDate) {
                    onAddDateDependency(item.id, selectedDate)
                    setIsDateDependencyOpen(false)
                    setSelectedDate(null)
                  }
                }}
                disabled={!selectedDate}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <DependencySelectionDialog
        isOpen={isDependencySelectionOpen}
        onClose={() => setIsDependencySelectionOpen(false)}
        onSelect={(taskId) => onAddDependency(taskId, item.id)}
        currentTaskId={item.id}
        availableTasks={filteredTasks}
      />
      
      {/* Subtask deletion confirmation dialog */}
      {deletingSubtaskId && (
        <DeleteConfirmationDialog
          isOpen={!!deletingSubtaskId}
          onClose={() => {
            // Clear the deletion queue and reset
            setDeletedSubtasksQueue([]);
            setDeletingSubtaskId(null);
            setIsProcessingDeletion(false);
            // Resume save workflow
            handleContentSubmit();
          }}
          onConfirm={(deleteChildren) => {
            handleDeleteSubtaskConfirmed(deleteChildren);
          }}
          hasChildren={!!availableTasks.some(task => task.parent_id === deletingSubtaskId)}
          itemTitle={deletedSubtasksQueue.find(s => s.id === deletingSubtaskId)?.title || 'Unknown Subtask'}
          childCount={availableTasks.filter(task => task.parent_id === deletingSubtaskId).length}
        />
      )}
    </div>
  )
} 