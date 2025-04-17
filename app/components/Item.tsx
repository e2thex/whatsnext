import { type ReactNode, useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from 'react-dnd'
import { type Database } from '@/src/lib/supabase/client'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { DependencySelectionDialog } from './DependencySelectionDialog'
import { toast } from 'react-hot-toast'
import { renderMarkdown } from '@/src/utils/markdown'
import typeIcons, { typeColors, typeRingColors } from './typeIcons'
import { ItemTypes } from './ItemTypes'
import type { Item, Dependencies, SubItem, ItemType } from './types'

type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']

const isItemType = (type: ItemType | null | undefined, value: ItemType): boolean => {
  return type === value
}

interface ItemProps {
  item: Item
  onAddChild: (item: Item) => void
  onToggleComplete: (item: Item) => void
  searchQuery?: string
  viewMode?: 'tree' | 'list'
}

interface DragItem {
  id: string
  type: typeof ItemTypes.ITEM
  parentId: string | null
  position: number
}

const sortByTitle = (a: Item, b: Item): number => a.title.localeCompare(b.title)

const getDependencyTitle = (dep: Dependencies[number]): string => {
  if (dep.type === 'Task') {
    const taskDep = dep.data as Database['public']['Tables']['task_dependencies']['Row']
    return taskDep.blocking_task_id // We'll need to look up the title from the items table
  } else {
    const dateDep = dep.data as Database['public']['Tables']['date_dependencies']['Row']
    return new Date(dateDep.unblock_at).toLocaleDateString()
  }
}

const sortSubItems = (a: Item, b: Item): number => a.title.localeCompare(b.title)

const handleAddChild = async (childItem: Item) => {
  // ... existing code ...
}

export function Item({ 
  item, 
  onAddChild, 
  onToggleComplete, 
  searchQuery = '',
  viewMode = 'tree',
}: ItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(item.isCollapsed)
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
    item.dateDependency ? new Date(item.dateDependency.unblock_at) : null
  )
  
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

  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [, setCurrentChildItems] = useState<Item[]>([]);
  const [deletedSubtasksQueue, setDeletedSubtasksQueue] = useState<{ id: string, title: string }[]>([]);
  const [isProcessingDeletion, setIsProcessingDeletion] = useState(false);
  
  const [showParentSuggestions, setShowParentSuggestions] = useState(false)
  const [parentSuggestionPos, setParentSuggestionPos] = useState({ top: 0, left: 0 })
  const [parentFilterText, setParentFilterText] = useState('')
  const [selectedParentIndex, setSelectedParentIndex] = useState(0)
  const parentSuggestionsRef = useRef<HTMLDivElement>(null)

  const [pendingOperations, setPendingOperations] = useState<{
    title: string;
    description: string | undefined;
    newSubtasks: { title: string, position: number }[];
    existingSubtaskIds: string[];
    dependencies: { id: string, title: string }[];
    subtasksToProcess?: { id?: string, title: string, position: number }[];
  } | null>(null);

  useEffect(() => {
    setIsCollapsed(item.isCollapsed);
  }, [item.isCollapsed]);

  const updateItem = (updates: Partial<Item>) => {
    item.update(updates);
  };

  useEffect(() => {
    if (isEditing && item.subItems.length > 0) {
      const childItems = item.entries({ parent_id: item.id })
        .sort((a, b) => a.position - b.position);
      
      setCurrentChildItems(childItems);
    }
  }, [isEditing, item.subItems]);

  const handleTextareaResize = () => {
    if (contentInputRef.current) {
      contentInputRef.current.style.height = 'auto';
      contentInputRef.current.style.height = `${contentInputRef.current.scrollHeight + 2}px`;
    }
  };

  const formatDependenciesForEditing = () => {
    if (item.blockedBy.length === 0) return '';
    
    const depLines = item.blockedBy.map(dep => {
      const blockingTask = item.entries({ id: dep.id })[0];
      if (!blockingTask) return '';
      return `@[${blockingTask.title}](#${blockingTask.id})`;
    }).filter(Boolean);
    
    return depLines.join(' ');
  };

  const formatChildItemsForEditing = () => {
    if (item.subItems.length === 0) {
      return '';
    }
    
    const childItems = item.entries({ parent_id: item.id })
      .sort((a, b) => a.position - b.position);
    
    if (childItems.length === 0) {
      return '';
    }
    
    const listItems = childItems.map(childItem => 
      `- [${childItem.title}](#${childItem.id})`
    );
    
    return listItems.join('\n');
  };
  
  useEffect(() => {
    if (item.title === '') {
      setIsEditing(true);
    }
  }, [item.id, item.title]);

  useEffect(() => {
    if (isEditing) {
      const depsFormatted = formatDependenciesForEditing();
      const parentFormatted = formatParentForEditing();
      const childrenFormatted = formatChildItemsForEditing();
      
      const formattedContent = item.title +
        (parentFormatted ? `\n${parentFormatted}` : '') +
        (depsFormatted ? `\n${depsFormatted}` : '') +
        (item.description ? `\n${item.description}` : '') +
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
  }, [isEditing, item.title, item.description]);

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

  const parseContentAndDependencies = (content: string) => {
    const depRegex = /@\[(.*?)\]\(#(.*?)\)/g;
    const matches = Array.from(content.matchAll(depRegex));
    
    const dependencies = matches.map(match => ({
      title: match[1],
      id: match[2]
    }));
    
    const cleanContent = content.replace(depRegex, '').trim();
    
    return { cleanContent, dependencies };
  };

  const parseContentAndParent = (content: string) => {
    const parentRegex = /\^(?:\[(.*?)\]\(#(.*?)\))/;
    const match = content.match(parentRegex);
    
    const parent = match ? {
      title: match[1],
      id: match[2]
    } : null;
    
    const cleanContent = content.replace(parentRegex, '').trim();
    
    return { cleanContent, parent };
  };

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
    if (!item.parent_id) return '';
    
    const parentItem = item.entries({ id: item.parent_id })[0];
    if (!parentItem) return '';
    
    return `^[${parentItem.title}](#${parentItem.id})`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showParentSuggestions &&
        parentSuggestionsRef.current &&
        !parentSuggestionsRef.current.contains(event.target as Node) &&
        !contentInputRef.current?.contains(event.target as Node)
      ) {
        setShowParentSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showParentSuggestions]);

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
          setParentSuggestionPos(coords);
          setParentFilterText('');
          setSelectedParentIndex(0);
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
          setDepSuggestionPos(coords);
          setFilterText('');
          setSelectedSuggestionIndex(0);
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setEditedContent(newValue);
    
    if (showParentSuggestions) {
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastCaretPos = textBeforeCursor.lastIndexOf('^');
      
      if (lastCaretPos >= 0) {
        const filterText = textBeforeCursor.substring(lastCaretPos + 1);
        
        setParentFilterText(filterText);
        setSelectedParentIndex(0);
        
        if (filterText.includes(' ') && !filterText.includes('[')) {
          setShowParentSuggestions(false);
        }
      } else {
        setShowParentSuggestions(false);
      }
      
      if (contentInputRef.current) {
        const coords = getCursorCoordinates(contentInputRef.current);
        setParentSuggestionPos(coords);
      }
    }
    
    if (showDepSuggestions) {
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtPos = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtPos >= 0) {
        const filterText = textBeforeCursor.substring(lastAtPos + 1);
        
        setFilterText(filterText);
        setSelectedSuggestionIndex(0);
        
        if (filterText.includes(' ') && !filterText.includes('[')) {
          setShowDepSuggestions(false);
        }
      } else {
        setShowDepSuggestions(false);
      }
      
      if (contentInputRef.current) {
        const coords = getCursorCoordinates(contentInputRef.current);
        setDepSuggestionPos(coords);
      }
    }
    
    handleTextareaResize();
  };
  
  const filteredTasks = useMemo(() => {
    return item.entries({ completed: false })
      .filter(task => 
        task.id !== item.id && 
        task.title.toLowerCase().includes(filterText.toLowerCase())
      )
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 10);
  }, [item.id, filterText]);

  const filteredParentTasks = useMemo(() => {
    return item.entries({ completed: false })
      .filter(task => 
        task.id !== item.id && 
        (!task.parent_id || (task.parent_id && task.parent_id !== item.id)) &&
        task.title.toLowerCase().includes(parentFilterText.toLowerCase())
      )
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 10);
  }, [item.id, parentFilterText]);

  const insertDependency = (task: Item) => {
    if (!contentInputRef.current) return;
    
    const textarea = contentInputRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = editedContent.substring(0, cursorPos);
    
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtPos >= 0) {
      const depText = `@[${task.title}](#${task.id})`;
      
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
      const parentText = `^[${task.title}](#${task.id})`;
      
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

  const handleContentSubmit = () => {
    if (isProcessingDeletion) {
      return;
    }
    
    const { cleanContent: contentWithoutParent, parent } = parseContentAndParent(editedContent);
    const { cleanContent: contentWithoutDeps, dependencies } = parseContentAndDependencies(contentWithoutParent);
    
    const contentLines = contentWithoutDeps.split('\n');
    const title = contentLines[0].trim();
    const description = contentLines.slice(1).filter(line => !line.trim().startsWith('- ')).join('\n').trim();
    
    if (title === '') {
      toast.error('Task title cannot be empty');
      contentInputRef.current?.focus();
      return;
    }
    
    if (parent && parent.id !== item.parent_id) {
      updateItem({ parent_id: parent.id });
    } else if (!parent && item.parent_id) {
      updateItem({ parent_id: null });
    }
    
    const currentSubtasks = item.entries({ parent_id: item.id })
      .map(task => ({ id: task.id, title: task.title }));
    
    const subtasksToProcess: { id?: string, title: string, position: number }[] = [];
    
    contentLines.forEach((line) => {
      const existingMatch = line.trim().match(/^-\s*\[(.*?)\]\(#(.*?)\)$/);
      const newMatch = line.trim().match(/^-\s+(.+)$/);
      
      if (existingMatch) {
        subtasksToProcess.push({
          id: existingMatch[2],
          title: existingMatch[1].trim(),
          position: subtasksToProcess.length
        });
      } else if (newMatch) {
        subtasksToProcess.push({
          title: newMatch[1].trim(),
          position: subtasksToProcess.length
        });
      }
    });
    
    const subtasksToDelete = currentSubtasks.filter(
      current => !subtasksToProcess.some(toProcess => toProcess.id === current.id)
    );
    
    if (subtasksToDelete.length > 0) {
      setIsProcessingDeletion(true);
      
      setPendingOperations({
        title,
        description: description || undefined,
        dependencies,
        subtasksToProcess,
        newSubtasks: [],
        existingSubtaskIds: []
      });
      
      setDeletedSubtasksQueue(subtasksToDelete);
      setDeletingSubtaskId(subtasksToDelete[0].id);
    }
    
    performContentUpdate(title, description, dependencies);
    processSubtasks(subtasksToProcess);
  };
  
  const processSubtasks = (subtasks: { id?: string, title: string, position: number }[]) => {
    console.log('Processing subtasks', subtasks);
    subtasks.forEach(subtask => {
      if (!subtask.id) {
        item.create({title: subtask.title, parent_id: item.id, position: subtask.position});
      } else {
        const existingSubtask = item.entry(subtask.id);
        if (existingSubtask) {
          existingSubtask.update({title: subtask.title, position: subtask.position});
        }
      }
    });
  };
  
  const performContentUpdate = (
    title: string, 
    description?: string, 
    dependencies?: {id: string, title: string}[]
  ) => {
    const updates: Partial<Item> = { 
      title, 
      description 
    };
    
    item.update(updates);
    
    if (dependencies) {
      dependencies.forEach(dep => {
        const existingDep = item.blockedBy.find(
          blockDep => blockDep.id === dep.id
        );
        
        if (!existingDep) {
          const newDependency: Dependency = {
            type: 'task',
            data: {
              id: dep.id,
              blocking_task_id: dep.id,
              blocked_task_id: item.id,
              created_at: new Date().toISOString(),
              user_id: item.user_id || ''
            }
          };
          item.update({ blockedBy: [...item.blockedBy, newDependency] });
        }
      });
    }
    
    setIsEditing(false);
    toast.success('Task updated successfully');
  };

  const handleDeleteSubtaskConfirmed = (deleteChildren: boolean) => {
    if (deletingSubtaskId) {
      const subtask = item.entry(deletingSubtaskId);
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

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ITEM,
    item: { 
      type: ItemTypes.ITEM,
      id: item.id,
      parentId: item.parent_id,
      position: item.position
    } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const setDragRef = useCallback((node: HTMLDivElement | null) => {
    drag(node)
  }, [drag])

  const displayTitle = item.title
  const displayDescription = item.description
  
  const effectiveType = item.type || (() => {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        contentInputRef.current &&
        !contentInputRef.current.contains(event.target as Node) &&
        (!depSuggestionsRef.current || !depSuggestionsRef.current.contains(event.target as Node))
      ) {
        handleContentSubmit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isEditing);
    }
  }, [isEditing, onEditingChange]);

  const hasChildren = item.subItems.length > 0;
  const childCount = item.subItems.length;

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
          ${!item.isBlocked ? 'hover:bg-gray-50' : ''}
        `}
      >
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

        <div className="flex flex-col sm:flex-row sm:items-start gap-y-2 sm:gap-y-0 gap-x-4">
          <div className="flex items-start gap-4 flex-grow">
            <button
              onClick={(e) => {
                e.stopPropagation();
                item.update({ completed: !item.completed });
              }}
              disabled={item.isBlocked}
              className={`
                w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
                ${item.completed ? 'bg-green-500 border-green-600' : 'border-gray-300'}
                ${item.isBlocked ? 'cursor-not-allowed' : ''}
              `}
              title={item.isBlocked ? hasChildren ? 'All subitems are blocked' : 'Complete blocked tasks first' : undefined}
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
                      const newCollapsedState = !isCollapsed;
                      updateItem({ isCollapsed: newCollapsedState });
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
                        title={item.isBlocked ? hasChildren ? 'All subitems are blocked' : 'Task is blocked - Click to manage dependencies' : 'Task is unblocked - Click to manage dependencies'}
                      >
                        <div 
                          className={`
                            w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium
                            ${item.isBlocked ? 'bg-red-500' : 'bg-green-500'}
                          `}
                        >
                          {item.isBlocked ? item.blockedBy.length + (item.dateDependency ? 1 : 0) : item.blockedBy.length}
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
          </div>

          <div className="flex items-center sm:items-start gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 w-full sm:w-auto justify-between sm:justify-end sm:flex-shrink-0">
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  item.update({position: item.position+1});
                  item.entries({position: item.position+1, parent_id: item.parent_id})[0]?.update({position: item.position});
                }}
                disabled={item.position === 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  item.update({position: item.position-1});
                  item.entries({position: item.position-1, parent_id: item.parent_id})[0]?.update({position: item.position});
                }}
                disabled={item.position === siblingCount - 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(item);
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
                  onFocus(item);
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
        </div>

        {hasChildren && (
          <div 
            className={`
              mt-2 ml-6 space-y-2 overflow-hidden transition-all duration-200 ease-in-out
              ${isCollapsed ? 'h-0 mt-0 opacity-0' : 'opacity-100'}
            `}
          >
            {item.subItems.map((child, index) => (
              <Item
                key={child.id}
                item={child}
                onAddChild={onAddChild}
                onToggleComplete={onToggleComplete}
                onFocus={onFocus}
                onAddDependency={onAddDependency}
                onRemoveDependency={onRemoveDependency}
                onAddDateDependency={onAddDateDependency}
                onRemoveDateDependency={onRemoveDateDependency}
                onCreateSubtask={onCreateSubtask}
                onUpdateSubtask={onUpdateSubtask}
                onEditingChange={onEditingChange}
                siblingCount={siblingCount}
                isSearchMatch={isSearchMatch}
                breadcrumbs={[...breadcrumbs, item]}
                onNavigate={onNavigate}
                searchQuery={searchQuery}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

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
                updateItem({ type: null, manual_type: false })
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${!item.type ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Auto
            </button>
            <button 
              onClick={() => {
                updateItem({ type: 'task', manual_type: true })
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${item.type === 'task' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Task
            </button>
            <button 
              onClick={() => {
                updateItem({ type: 'mission', manual_type: true })
                setIsTypeMenuOpen(false)
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm ${item.type === 'mission' ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
            >
              Mission
            </button>
          </div>
        </div>,
        document.body
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={(deleteChildren) => {
          item.delete(deleteChildren);
          setIsDeleteDialogOpen(false);
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
            {item.blockedBy.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Blocked by tasks:</h3>
                {item.blockedBy.map(dep => {
                  const blockingTask = item.entries({ id: dep.id })[0];
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
                        onClick={() => {
                          const updatedDependencies = item.blockedBy.filter((d: Dependency) => d.id !== dep.id);
                          item.update({ blockedBy: updatedDependencies });
                        }}
                        className="text-red-600 hover:text-red-700 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            
            {item.blockedBy.length > 0 && (
              <div className="mb-2">
                <h3 className="text-xs font-medium text-gray-500 mb-1">Blocking tasks:</h3>
                {item.blockedBy.map(dep => {
                  const blockedTask = item.entries({ id: dep.id })[0];
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
                        onClick={() => {
                          const updatedDependencies = item.blockedBy.filter((d: Dependency) => d.id !== dep.id);
                          item.update({ blockedBy: updatedDependencies });
                        }}
                        className="text-red-600 hover:text-red-700 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {item.blockedBy.length === 0 && item.dateDependency && (
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

            <div className="mt-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 mb-1">Date dependency:</h3>
              {item.dateDependency ? (
                <div className="flex items-center justify-between text-sm text-gray-700 py-1">
                  <span className="truncate flex-1 mr-2">
                    Blocked until {new Date(item.dateDependency.unblock_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => {
                      item.update({ dateDependency: null });
                    }}
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
                    item.update({ dateDependency: { unblock_at: selectedDate.toISOString() } });
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
        onSelect={(taskId) => {
          const newDependency: Dependency = {
            type: 'task',
            data: {
              id: taskId,
              blocking_task_id: taskId,
              blocked_task_id: item.id,
              created_at: new Date().toISOString(),
              user_id: item.user_id || ''
            }
          };
          item.update({ blockedBy: [...item.blockedBy, newDependency] });
        }}
        currentTaskId={item.id}
        availableTasks={filteredTasks}
      />
      
      {deletingSubtaskId && (
        <DeleteConfirmationDialog
          isOpen={!!deletingSubtaskId}
          onClose={() => {
            setDeletedSubtasksQueue([]);
            setDeletingSubtaskId(null);
            setIsProcessingDeletion(false);
            handleContentSubmit();
          }}
          onConfirm={(deleteChildren) => {
            handleDeleteSubtaskConfirmed(deleteChildren);
          }}
          hasChildren={!!item.entries({ parent_id: deletingSubtaskId }).length > 0}
          itemTitle={deletedSubtasksQueue.find(s => s.id === deletingSubtaskId)?.title || 'Unknown Subtask'}
          childCount={item.entries({ parent_id: deletingSubtaskId }).length}
        />
      )}

      {showParentSuggestions && typeof document !== 'undefined' && createPortal(
        <div 
          ref={parentSuggestionsRef}
          style={{
            position: 'fixed',
            top: `${parentSuggestionPos.top}px`,
            left: `${parentSuggestionPos.left}px`,
            zIndex: 9999
          }}
          className="bg-white rounded-md shadow-xl border border-gray-300 max-h-64 overflow-y-auto w-72"
        >
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-600 px-2 py-1 mb-1 border-b border-gray-200">
              Set as parent {parentFilterText ? `matching "${parentFilterText}"` : ''}
            </div>
            
            {filteredParentTasks.length > 0 ? (
              <div className="max-h-52 overflow-y-auto">
                {filteredParentTasks.map((task, index) => (
                  <div
                    key={task.id}
                    onClick={() => insertParent(task)}
                    className={`
                      px-3 py-2 text-sm cursor-pointer flex items-center
                      ${index === selectedParentIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}
                    `}
                  >
                    <span className="mr-1.5 font-bold text-indigo-500">^</span>
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                {parentFilterText ? 'No matching tasks found' : 'Type to search for tasks'}
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