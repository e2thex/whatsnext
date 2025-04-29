import { Editor, Descendant, Transforms, Range } from 'slate'
import { updateTask, createTask, deleteTask } from '../services/tasks'
import type { Task } from '../services/tasks'
import type { SlateProcessor } from '../types/slate-processor'
import type { PartialTask } from '../types/slate-processor'
import type { CustomElement, MentionElement, SubtaskElement, ListItemElement } from '../types/slate-elements'

type ListItemNode = {
  type: 'list-item'
  nodeId: string | null
  children: { text: string }[]
}

export const useSubtaskProcesses = (): SlateProcessor => {

  const initialize = (task: PartialTask, tasks: Task[]) => (initialContent: Descendant[]) => {
    return [
      ...initialContent,
      ...tasks
        .filter(t => t.parent_id === task.id)
        .map(subtask => ({
          type: 'list-item',
          nodeId: subtask.id,
          children: [{ text: subtask.title }],
        }))
    ];
  };

  const handleKeyDown = (editor: Editor) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      const { selection } = editor;
      if (selection) {
        const [start] = Range.edges(selection);
        const node = Editor.above(editor, {
          at: start,
          match: n => {
            const element = n as CustomElement | MentionElement | SubtaskElement | ListItemElement;
            return 'type' in element && element.type === 'list-item';
          }
        });
        if (node) {
          const [listItem, path] = node;
          const text = listItem.children[0].text;
          const offset = start.offset;

          // Handle cursor at start of line we insert a new node above the current node
          if (offset === 0) {
            Transforms.insertNodes(editor, {
              type: 'list-item',
              nodeId: null,
              children: [{ text: '' }]
            }, { at: path });
            Transforms.select(editor, {
              anchor: { path, offset: 0 },
              focus: { path, offset: 0 }
            });
            event.preventDefault();
            return { showSelector: false };
          }
          // Handle cursor in middle of line we do not allow a node with a nodeID to be split
          else if (offset > 0 && offset < text.length) {
            // If the current node has a nodeId, prevent default behavior
            if (listItem.nodeId) {
              event.preventDefault();
              return { showSelector: false };
            }
          }
          // Handle cursor at end of line we insert a new node below the current node
          else if (offset === text.length) {
            const newPath = [...path.slice(0, -1), path[path.length - 1] + 1];
            Transforms.insertNodes(editor, {
              type: 'list-item',
              nodeId: null,
              children: [{ text: '' }]
            }, { at: newPath });
            Transforms.select(editor, {
              anchor: { path: newPath, offset: 0 },
              focus: { path: newPath, offset: 0 }
            });
            event.preventDefault();
            return { showSelector: false };
          }
        }
      }
    }
    return { showSelector: false };
  };

  const processAndSave = (editor: Editor, task: PartialTask, tasks: Task[]) => async () => {
    const listItems = editor.children.filter((node): node is ListItemNode => 
      'type' in node && node.type === 'list-item'
    );

    const subtasks = listItems.map((node, index) => ({
      title: node.children[0].text,
      nodeId: node.nodeId,
      position: index
    }));

    if (task.id) {
      for (const subtask of subtasks) {
        if (subtask.nodeId) {
          await updateTask(subtask.nodeId, { position: subtask.position, title: subtask.title });
        } else {
          await createTask({
            title: subtask.title,
            parent_id: task.id,
            position: subtask.position,
            type: 'Task',
          });
        }
      }
      return undefined;
    }
    // TODO we need to no just delete the subtask but get conferemation for deleting each one before we delete it 
    const subtaskToDelete = tasks.filter(t => t.parent_id === task.id && !subtasks.some(st => st.nodeId === t.id))
    for (const subtask of subtaskToDelete) {
      await deleteTask(subtask.id)
    }
  };

  const handleDelete = (editor: Editor) => (taskToDelete: Task) => {
    const subtaskIndex = editor.children.findIndex(
      node => 'type' in node && node.type === 'list-item' && 'nodeId' in node && node.nodeId === taskToDelete.id
    );
    
    if (subtaskIndex !== -1) {
      Transforms.removeNodes(editor, { at: [subtaskIndex] });
    }
  };

  return {
    initialize,
    handleKeyDown,
    processAndSave,
    handleDelete
  };
}; 