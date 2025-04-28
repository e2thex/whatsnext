import { Editor, Descendant } from 'slate'
import { useQueryClient } from '@tanstack/react-query'
import { updateTask, createTask } from '../services/tasks'
import type { Task } from '../services/tasks'
import type { SlateProcessor } from '../types/slate-processor'
import type { PartialTask } from '../types/slate-processor'
import type { CustomText } from '../types/slate-elements'

export const useCoreProcesses = (): SlateProcessor => {
  const queryClient = useQueryClient();

  const initialize = (task: PartialTask, tasks: Task[]) => (initialContent: Descendant[]) => {
    return [
      {
        type: 'paragraph',
        children: [{ text: task.title || '' }],
      },
      ...(task.description ? [{
        type: 'paragraph',
        children: [{ text: task.description }],
      }] : [])
    ];
  };

  const handleKeyDown = (editor: Editor, tasks: Task[]) => (event: React.KeyboardEvent) => {
    return { showSelector: false };
  };

  const processAndSave = (editor: Editor, task: PartialTask, tasks: Task[]) => async () => {
    const processedData = editor.children.reduce((acc, node, index) => {
      if ('type' in node && node.type === 'paragraph') {
        const text = node.children.map((textNode: CustomText) => textNode.text).join('');
        if (index === 0) {
          acc.title = text;
        } else {
          acc.description.push(text);
        }
      }
      return acc;
    }, {
      title: '',
      description: [] as string[]
    });

    if (processedData.title.trim()) {
      if (task.id) {
        await updateTask(task.id, {
          title: processedData.title.trim(),
          description: processedData.description.join('\n').trim() || null
        });
        return task.id;
      } else {
        const newTask = await createTask({
          title: processedData.title.trim(),
          description: processedData.description.join('\n').trim() || null,
          completed: false,
          parent_id: task.parent_id || null,
          position: tasks.filter(t => t.parent_id === task.parent_id).length,
          type: 'Task',
          manual_type: false
        });
        return newTask.id;
      }
    }
    return task.id;
  };

  return {
    initialize,
    handleKeyDown,
    processAndSave
  };
}; 