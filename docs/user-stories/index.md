# WhatsNext User Stories

This document provides an overview of all user stories for the WhatsNext task management application. User stories are organized by epics and show implementation status and dependencies.

## Task Organization Epic

This epic focuses on features that help users organize, view, and interact with their tasks.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Tool Bar](tool-bar.md) | Not Completed | None | Provides a centralized UI for controlling task display, including layout, filtering, and search. |
| [Completion Status Filtering](task-filtering.md) | Not Completed | [Tool Bar](tool-bar.md) | Allows users to filter tasks based on completion status (All/Todo/Done). |
| [Blocking Status Filtering](blocking-status-filtering.md) | Not Completed | [Tool Bar](tool-bar.md) | Allows users to filter tasks based on blocking status (Any/Actionable/Blocked). |
| [Layout Switching](layout-switching.md) | Not Completed | [Tool Bar](tool-bar.md) | Enables users to switch between Tree and List views of tasks. |
| [Task Search](task-search.md) | Not Completed | [Tool Bar](tool-bar.md) | Provides functionality to search for tasks by keywords. |
| [Type Filtering](type-filtering.md) | Not Completed | [Tool Bar](tool-bar.md) | Allows users to filter tasks based on their type. |
| [List View](list-view.md) | Not Completed | [Layout Switching](layout-switching.md) | Provides a flat list view of tasks with sorting and filtering capabilities. |
| [Drag & Drop Reordering](drag-drop-reordering.md) | Not Completed | None | Enables users to reorder tasks through intuitive drag and drop interactions. |

## Task Management Epic

This epic focuses on core task management features.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Task Dependencies](task-dependencies.md) | Not Completed | None | Allows users to create and manage dependencies between tasks. |
| [Task Archiving](task-archiving.md) | Not Completed | None | Enables users to archive completed tasks while preserving history. |
| [Task Due Dates](task-due-dates.md) | Not Completed | None | Allows users to set and manage due dates for tasks. |
| [Task Progress](task-progress.md) | Not Completed | None | Provides visual indicators of task completion progress. |
| [Task Questions](task-questions.md) | Not Completed | None | Enables users to add questions and answers to tasks. |
| [Date Dependencies](date-dependencies.md) | Not Completed | [Task Dependencies](task-dependencies.md) | Allows users to create dependencies based on dates. |

## Task Editing Epic

This epic focuses on features related to task creation and modification.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Item Edit](item-edit.md) | Not Completed | None | Provides comprehensive task editing capabilities. |
| [Manual Type Override](manual-type-override.md) | Not Completed | None | Allows users to manually override task types. |
| [Automatic Task Typing](automatic-task-typing.md) | Not Completed | None | Automatically determines task types based on content. |
| [Focus on Item](focus-on-item.md) | Not Completed | None | Enables users to focus on and edit specific tasks. |

## Task Structure Epic

This epic focuses on hierarchical organization of tasks.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Hierarchical Tasks](hierarchical-tasks.md) | Not Completed | None | Supports creating and managing task hierarchies. |
| [Task Management](task-management.md) | Not Completed | None | Provides core task management functionality. |

## Security Epic

This epic focuses on user authentication and security.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Authentication](authentication.md) | Completed | None | Provides user authentication and authorization. |

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