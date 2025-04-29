import { Editor, Descendant, Range, Transforms } from 'slate'
import { addBlockingRelationship, removeBlockingRelationship } from '../services/tasks'
import type { Task } from '../services/tasks'
import type { SlateProcessor } from '../types/slate-processor'
import type { PartialTask } from '../types/slate-processor'
import type { MentionElement } from '../types/slate-elements'

export const useBlockedByProcesses = (): SlateProcessor => {

  const initialize = (task: PartialTask) => (initialContent: Descendant[]) => {
    return [
      ...initialContent,
      ...(task.blockedBy || []).map(mention => ({
        type: 'mention',
        task: mention,
        children: [{ text: '' }],
      }))
    ];
  };

  const handleKeyDown = (editor: Editor) => (event: React.KeyboardEvent) => {
    if (event.key === '@') {
      event.preventDefault();
      const { selection } = editor;
      if (selection) {
        const [start] = Range.edges(selection);
        // Insert a space before the @ if needed
        const before = Editor.before(editor, start);
        if (before) {
          const beforeRange = Editor.range(editor, before, start);
          const beforeText = Editor.string(editor, beforeRange);
          if (beforeText !== ' ' && beforeText !== '') {
            Transforms.insertText(editor, ' ', { at: start });
            Transforms.move(editor, { distance: 1 });
          }
        }
        // Insert the blocked-by-selector element
        Transforms.insertNodes(editor, {
          type: 'blocked-by-selector',
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
      .filter(node => 'type' in node && node.type === 'mention')
      .map(node => (node as MentionElement).task);

    if (task.id) {
      const existingBlockedBy = task.blockedBy || [];
      const relationshipsToRemove = existingBlockedBy.filter(
        existing => !mentions.some(mention => mention.id === existing.id)
      );
      const relationshipsToAdd = mentions.filter(
        mention => !existingBlockedBy.some(existing => existing.id === mention.id)
      );

      for (const { id } of relationshipsToRemove) {
        await removeBlockingRelationship(id, task.id);
      }

      for (const { id } of relationshipsToAdd) {
        await addBlockingRelationship(id, task.id);
      }
    }
    return undefined;
  };

  const handleDelete = (editor: Editor) => (taskToDelete: Task) => {
    const mentionIndex = editor.children.findIndex(
      node => 'type' in node && node.type === 'mention' && 'task' in node && node.task.id === taskToDelete.id
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
        match: n => 'type' in n && n.type === 'blocked-by-selector'
      });

      if (node) {
        const [, path] = node;
        Transforms.removeNodes(editor, { at: path });
        Transforms.insertNodes(editor, {
          type: 'mention',
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