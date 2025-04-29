import { Editor, Descendant, Range, Transforms } from 'slate'
import { useQueryClient } from '@tanstack/react-query'
import { updateTask } from '../services/tasks'
import type { Task } from '../services/tasks'
import type { SlateProcessor } from '../types/slate-processor'
import type { PartialTask } from '../types/slate-processor'
import type { ParentMentionElement } from '../types/slate-elements'

export const useParentProcesses = (): SlateProcessor => {
  const queryClient = useQueryClient();

  const initialize = (task: PartialTask, tasks: Task[]) => (initialContent: Descendant[]) => {
    if (task.parent_id) {
      const parent = tasks.find(t => t.id === task.parent_id);
      if (parent) {
        return [
          ...initialContent,
          {
            type: 'parent-mention',
            task: parent,
            children: [{ text: '' }],
          }
        ];
      }
    }
    return initialContent;
  };

  const handleKeyDown = (editor: Editor) => (event: React.KeyboardEvent) => {
    if (event.key === '^') {
      event.preventDefault();
      const { selection } = editor;
      if (selection) {
        const [start] = Range.edges(selection);
        // Insert a space before the ^ if needed
        const before = Editor.before(editor, start);
        if (before) {
          const beforeRange = Editor.range(editor, before, start);
          const beforeText = Editor.string(editor, beforeRange);
          if (beforeText !== ' ' && beforeText !== '') {
            Transforms.insertText(editor, ' ', { at: start });
            Transforms.move(editor, { distance: 1 });
          }
        }
        // Insert the parent-selector element
        Transforms.insertNodes(editor, {
          type: 'parent-selector',
          children: [{ text: '' }],
        });
        // Insert a space after the selector
        Transforms.insertText(editor, ' ');
        return { showSelector: false };
      }
    }
    return { showSelector: false };
  };

  const processAndSave = (editor: Editor, task: PartialTask) => async () => {
    const mentions = editor.children
      .filter(node => 'type' in node && node.type === 'parent-mention')
      .map(node => (node as ParentMentionElement).task);

    if (task.id && mentions.length > 0) {
      const newParentId = mentions[0].id;
      if (newParentId !== task.parent_id) {
        await updateTask(task.id, { parent_id: newParentId });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    } else if (task.id && task.parent_id) {
      // If no mentions but had a parent, remove the parent relationship
      await updateTask(task.id, { parent_id: null });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
    return undefined;
  };

  const handleDelete = (editor: Editor) => (taskToDelete: Task) => {
    const mentionIndex = editor.children.findIndex(
      node => 'type' in node && node.type === 'parent-mention' && 'task' in node && node.task.id === taskToDelete.id
    );
    
    if (mentionIndex !== -1) {
      Transforms.removeNodes(editor, { at: [mentionIndex] });
    }
  };

  const handleSelect = (editor: Editor) => (selectedTask: Task) => {
    const { selection } = editor;
    if (selection) {
      const [start] = Range.edges(selection);
      const node = Editor.above(editor, {
        at: start,
        match: n => 'type' in n && n.type === 'parent-selector'
      });

      if (node) {
        const [, path] = node;
        Transforms.removeNodes(editor, { at: path });
        Transforms.insertNodes(editor, {
          type: 'parent-mention',
          task: selectedTask,
          children: [{ text: '' }],
        }, { at: path });
      }
    }
  };

  return {
    initialize,
    handleKeyDown,
    processAndSave,
    handleDelete,
    handleSelect
  };
}; 