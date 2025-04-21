import { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Item } from './types';
import { toast } from 'react-hot-toast';

interface ProcessedContent {
  title: string;
  description?: string;
  dependencies: { id: string; title: string }[];
  subtasks: { id?: string; title: string; position: number }[];
}

interface ItemEditorProps {
  item: Item;
  onCancel: () => void;
  onSave?: () => void;
}

export const ItemEditor = ({ item, onCancel, onSave }: ItemEditorProps) => {
  const [editedContent, setEditedContent] = useState(item.core.description 
    ? `${item.core.title}\n${item.core.description}` 
    : item.core.title);
  const [showDepSuggestions, setShowDepSuggestions] = useState(false);
  const [depSuggestionPos, setDepSuggestionPos] = useState({ top: 0, left: 0 });
  const [filterText, setFilterText] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isProcessingDeletion, setIsProcessingDeletion] = useState(false);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [deletedSubtasksQueue, setDeletedSubtasksQueue] = useState<{ id: string, title: string }[]>([]);
  
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const depSuggestionsRef = useRef<HTMLDivElement>(null);

  const filteredTasks = useMemo(() => {
    return item.entries({ completed: false })
      .filter(task => 
        task.core.id !== item.core.id && 
        task.core.title.toLowerCase().includes(filterText.toLowerCase())
      )
      .sort((a, b) => a.core.title.localeCompare(b.core.title))
      .slice(0, 10);
  }, [item.core.id, filterText]);

  const parseContentAndDependencies = (content: string) => {
    const depRegex = /@\[(.*?)\]\(#(.*?)\)/g;
    const matches = Array.from(content.matchAll(depRegex));
    
    const dependencies = matches.map(match => ({
      title: match[1],
      id: match[2]
    }));
    const parentRegex = /^\[(.*?)\]\(#(.*?)\)/g; 
    const parentId = Array.from(content.matchAll(parentRegex)).map(match => match[2])[0];
    const cleanContent = content.replace(depRegex, '').trim();
    const contentLines = cleanContent.split('\n');
    
    const title = contentLines[0].trim();
    const description = contentLines.slice(1)
      .filter(line => !line.trim().startsWith('- '))
      .join('\n')
      .trim();
    
    const subtasks = contentLines
      .filter(line => line.trim().startsWith('- '))
      .map((line, index) => {
        const existingMatch = line.trim().match(/^-\s*\[(.*?)\]\(#(.*?)\)$/);
        const newMatch = line.trim().match(/^-\s+(.+)$/);
        
        if (existingMatch) {
          return {
            id: existingMatch[2],
            title: existingMatch[1].trim(),
            position: index
          };
        } else if (newMatch) {
          return {
            title: newMatch[1].trim(),
            position: index
          };
        }
        return null;
      })
      .filter(Boolean) as { id?: string; title: string; position: number }[];
    
    return {
      title,
      description: description || undefined,
      parentId,
      dependencies,
      subtasks
    };
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
        setIsProcessingDeletion(false);
        handleContentSubmit();
      }
    }
  };

  const handleContentSubmit = () => {
    if (isProcessingDeletion) {
      return;
    }

    const processedContent = parseContentAndDependencies(editedContent);
    if (processedContent.title === '') {
      toast.error('Task title cannot be empty');
      contentInputRef.current?.focus();
      return;
    }
    const updates = {
      core: {
        title: processedContent.title,
        description: processedContent.description || null,
        parent_id: processedContent.parentId || null

      },
      subtasks: processedContent.subtasks.map(subtask => ({
        id: subtask.id || undefined,
        title: subtask.title,
        position: subtask.position
      })),
      blockedBy: processedContent.dependencies.map(dep => ({
        type: "Task" as const,
        data: {
          id: dep.id,
          blocking_task_id: dep.id,
          blocked_task_id: item.core.id,
        }
      }))
    }
    // Make a single update call with the complete updated item
    item.update(updates);
    // Process subtasks

    // onSave?.();
    // onCancel();
  };

  useEffect(() => {
    if (contentInputRef.current) {
      contentInputRef.current.focus();
      const length = contentInputRef.current.value.length;
      contentInputRef.current.setSelectionRange(length, length);
      handleTextareaResize();
    }
  }, []);

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

  const handleTextareaResize = () => {
    if (contentInputRef.current) {
      contentInputRef.current.style.height = 'auto';
      contentInputRef.current.style.height = `${contentInputRef.current.scrollHeight + 2}px`;
    }
  };

  const getCursorCoordinates = (textarea: HTMLTextAreaElement) => {
    const rect = textarea.getBoundingClientRect();
    return { 
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX + 10
    };
  };

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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@') {
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
      onCancel();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setEditedContent(newValue);
    
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

  return (
    <div className="flex-grow relative" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={contentInputRef}
        value={editedContent}
        onChange={handleTextareaChange}
        onKeyDown={handleTextareaKeyDown}
        onBlur={handleContentSubmit}
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
                    key={task.core.id}
                    onClick={() => insertDependency(task)}
                    className={`
                      px-3 py-2 text-sm cursor-pointer flex items-center
                      ${index === selectedSuggestionIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}
                    `}
                  >
                    <span className="mr-1.5 font-bold text-indigo-500">@</span>
                    <span className="truncate">{task.core.title}</span>
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
  );
}; 