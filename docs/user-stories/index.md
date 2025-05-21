# WhatsNext User Stories

This document provides an overview of all user stories for the WhatsNext task management application. User stories are organized by epics and show implementation status and dependencies.

## Task Organization Epic

This epic focuses on features that help users organize, view, and interact with their tasks.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Tool Bar](task-organization--tool-bar.md) | Not Completed | None | Provides a centralized UI for controlling task display, including layout, filtering, and search. |
| [Completion Status Filtering](task-organization--completion-status-filtering.md) | Completed | [Tool Bar](task-organization--tool-bar.md) | Allows users to filter tasks based on completion status (All/Todo/Done). |
| [Blocking Status Filtering](task-organization--blocking-status-filtering.md) | Completed | [Tool Bar](task-organization--tool-bar.md) | Allows users to filter tasks based on blocking status (Any/Actionable/Blocked). |
| [Layout Switching](task-organization--layout-switching.md) | Not Completed | [Tool Bar](task-organization--tool-bar.md) | Enables users to switch between Tree and List views of tasks. |
| [Task Search](task-organization--task-search.md) | Not Completed | [Tool Bar](task-organization--tool-bar.md) | Provides functionality to search for tasks by keywords. |
| [Type Filtering](task-organization--type-filtering.md) | Not Completed | [Tool Bar](task-organization--tool-bar.md) | Allows users to filter tasks based on their type. |
| [List View](task-organization--list-view.md) | Not Completed | [Layout Switching](task-organization--layout-switching.md) | Provides a flat list view of tasks with sorting and filtering capabilities. |
| [Tree View](task-organization--tree-view.md) | Not Completed | [Layout Switching](task-organization--layout-switching.md) | Provides a hierarchical view of tasks with parent-child relationships. |
| [Drag & Drop Reordering](task-organization--drag-drop-reordering.md) | Not Completed | None | Enables users to reorder tasks through intuitive drag and drop interactions. |

## Task Management Epic

This epic focuses on core task management features.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Task Dependencies](task-management--task-dependencies.md) | Not Completed | None | Allows users to create and manage dependencies between tasks. |
| [Task Archiving](task-management--task-archiving.md) | Not Completed | None | Enables users to archive completed tasks while preserving history. |
| [Task Due Dates](task-management--task-due-dates.md) | Not Completed | None | Allows users to set and manage due dates for tasks. |
| [Task Progress](task-management--task-progress.md) | Not Completed | None | Provides visual indicators of task completion progress. |
| [Task Questions](task-management--task-questions.md) | Not Completed | None | Enables users to add questions and answers to tasks. |
| [Date Dependencies](task-management--date-dependencies.md) | Not Completed | [Task Dependencies](task-management--task-dependencies.md) | Allows users to create dependencies based on dates. |
| [Task Creation](task-management--task-creation.md) | Not Completed | None | Enables users to create new tasks with various properties. |
| [Task Deletion](task-management--task-deletion.md) | Not Completed | None | Allows users to delete tasks from the system. |
| [Task Completion](task-management--task-completion.md) | Completed | None | Enables users to mark tasks as complete. |
| [Task Blocking](task-management--task-blocking.md) | Completed | None | Allows users to mark tasks as blocking other tasks. |
| [Ancestor Blocking](task-management--ancestor-blocking.md) | Completed | [Task Blocking](task-management--task-blocking.md) | Enables blocking status to propagate up the task hierarchy. |

## Task Editing Epic

This epic focuses on features related to task creation and modification.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Item Edit](task-editing--item-edit.md) | Not Completed | None | Provides comprehensive task editing capabilities. |
| [Manual Type Override](task-editing--manual-type-override.md) | Not Completed | None | Allows users to manually override task types. |
| [Task Type](task-editing--task-type.md) | Not Completed | None | Defines the different types of tasks and their properties. |
| [Focus on Item](task-editing--focus-on-item.md) | Not Completed | None | Enables users to focus on and edit specific tasks. |

## Task Structure Epic

This epic focuses on hierarchical organization of tasks.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Hierarchical Tasks](task-structure--hierarchical-tasks.md) | Not Completed | None | Supports creating and managing task hierarchies. |
| [Subtask Creation](task-structure--subtask-creation.md) | Not Completed | [Hierarchical Tasks](task-structure--hierarchical-tasks.md) | Enables users to create subtasks within parent tasks. |

## Security Epic

This epic focuses on user authentication and security.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Authentication](security--authentication.md) | Completed | None | Provides user authentication and authorization. |

## Implementation Architecture

The user stories are implemented using a component-based architecture:

1. `app/components/Toolbar.tsx` - Central component that provides UI controls for:
   - Layout switching (Tree/List views)
   - Task filtering (by completion and blocking status)
   - Task search (with keyboard shortcuts)
   - Adding new tasks

2. `app/components/ItemList.tsx` - Displays tasks based on:
   - Selected view mode (Tree/List)
   - Applied filters
   - Search queries

3. `app/components/Item.tsx` - Renders individual task items with:
   - Task details
   - Interactive controls
   - Visual indicators for status

4. `app/page.tsx` - Main application container that:
   - Integrates all components
   - Manages application state
   - Handles data operations

## Future User Stories

Additional user stories that could be developed include:

1. **Task Sorting** - Allow users to sort tasks by different criteria
2. **Custom Filters** - Enable users to create and save custom filter combinations
3. **View Preferences** - Allow users to save and quickly switch between different view configurations
4. **Bulk Operations** - Enable users to perform actions on multiple tasks at once
5. **Task Templates** - Allow users to create and reuse task templates
6. **Collaboration Features** - Enable multiple users to work on the same task list
7. **Task Analytics** - Provide insights into task completion patterns and productivity
8. **Mobile App** - Create a mobile version of the application 