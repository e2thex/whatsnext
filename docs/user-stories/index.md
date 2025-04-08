# WhatsNext User Stories

This document provides an overview of all user stories for the WhatsNext task management application. User stories are organized by epics and show implementation status and dependencies.

## Task Organization Epic

This epic focuses on features that help users organize, view, and interact with their tasks.

| User Story | Status | Dependencies | Description |
|------------|--------|--------------|-------------|
| [Tool Bar](tool-bar.md) | ✓ Completed | None | Provides a centralized UI for controlling task display, including layout, filtering, and search. |
| [Completion Status Filtering](task-filtering.md) | ✓ Completed | [Tool Bar](tool-bar.md) | Allows users to filter tasks based on completion status (All/Todo/Done). |
| [Blocking Status Filtering](blocking-status-filtering.md) | ✓ Completed | [Tool Bar](tool-bar.md) | Allows users to filter tasks based on blocking status (Any/Actionable/Blocked). |
| [Layout Switching](layout-switching.md) | ✓ Completed | [Tool Bar](tool-bar.md) | Enables users to switch between Tree and List views of tasks. |
| [Task Search](task-search.md) | ✓ Completed | [Tool Bar](tool-bar.md) | Provides functionality to search for tasks by keywords. |

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