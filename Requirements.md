# Task Management Application Requirements

| Completed | Epic | Story |
|-----------|------|-------|
| ✓ | Task Hierarchy | As a user, I want notes to support infinite levels of hierarchy so that I can break down complex goals into manageable parts |
| ✓ | Task Hierarchy | As a user, I want items without sub-tasks to be automatically labeled as "Tasks" so I can see what is actionable |
| ✓ | Task Hierarchy | As a user, I want items with 1 level of sub-tasks to be labeled as "Missions" so I can understand their scope |
| ✓ | Task Hierarchy | As a user, I want items with 2 levels of sub-tasks to be labeled as "Objectives" so I can see their intermediate complexity |
| ✓ | Task Hierarchy | As a user, I want top-level items to be labeled as "Ambitions" so I know what overarching goal they support |
| ✓ | Task Hierarchy | As a user, I want to be able to manually set or change an item's type through an intuitive dropdown menu, regardless of its hierarchy position, so I can properly categorize my tasks as my planning evolves |
| ✓ | Task Organization | As a user, I want items to be prioritized within their parent so I can control execution order in context |
| ✓ | Task Organization | As a user, I want to create a task by selecting its parent in a top-down manner so that my tasks are organized logically |
| ✓ | Task Organization | As a user, I want to be able to drag and drop tasks to reorder them within their parent so that I can quickly adjust priorities |
| ✓ | Task Organization | As a user, I want to be able to drag tasks between different parents so that I can restructure my hierarchy as my understanding evolves |
| ✓ | Task Organization | As a user, I want clear visual feedback when dragging tasks so that I can understand where tasks can be dropped |
| ✓ | Task Organization | As a user, I want to be able to collapse and expand task hierarchies so that I can focus on relevant sections |
| ✓ | Task Organization | As a user, I want to be able to view tasks in different ways (tree, list, kanban) so that I can work with my tasks in the most effective way for different scenarios |
| ✓ | Task Organization | As a user, I want to be able to toggle to a list view, which shows only bottom level items, but has their breadcrumbs, so that I can review all of the actionable tasks |
| ✓ | Task Organization | As a user, I want to focus on a single item and its children by clicking on something near it so that I can work without distraction |
| ✓ | Task States | As a user, I want to be able to mark any item as completed with a simple interaction so that I can quickly track progress |
| ✓ | Task States | As a user, I want to see when a task was completed so that I can track my progress over time |
| | Task States | As a user, I want to see task completion status reflected in parent tasks so that I can understand progress at a glance |
| ✓ | Task States | As a user, I want to mark that a task is blocked by another task so that I can ensure tasks are completed in the necessary order |
| ✓ | Task States | As a user, I want tasks to automatically become unblocked when their blocking task is completed so that I can maintain an accurate view of task readiness without manual updates |
| ✓ | Task States | As a user, I want to easily see which tasks are blocking a task and which tasks it blocks so that I can quickly understand task relationships in both directions |
| ✓ | Task States | As a user, I want clear visual indicators when a task is blocked so that I can quickly identify tasks that need attention |
| ✓ | Task States | As a user, I want to add a date as a dependency so that a task is blocked until that date, on that date it will be unblocked automatically so I can delay tasks and then have them come back automatically |
| ✓ | Task States | As a user, if there are no unblocked subitems, then an item will also be blocked and displayed as such so that I can see there is no work available in that item |
| ✓ | Task Filtering | As a user, I want to be able to filter to show only actionable (unblocked) tasks in both tree and list views so that I can focus on what I can work on right now |
| ✓ | Task Filtering | As a user, I want to be able to toggle between viewing all tasks, only completed tasks, or only uncompleted tasks, with uncompleted tasks being the default view, so I can focus on tasks that need my attention |
| ✓ | Authentication | As a user, I want to be able to sign up for an account so that I can keep my tasks private and accessible |
| ✓ | Authentication | As a user, I want to be able to log in to access my tasks so that I can work on them from anywhere |
| ✓ | Authentication | As a user, I want my tasks to be private and only accessible to me so that I can maintain confidentiality |
| ✓ | Authentication | As a user, I want to be able to sign out of my account so that I can protect my data on shared devices |
| ✓ | User Interface | As a user, I want visual indicators for task types so that I can quickly understand the scope of items |
| ✓ | User Interface | As a user, I want visual indicators for manually set types so that I can distinguish between automatic and manual classifications |
| ✓ | User Interface | As a user, I want a clean, modern interface with proper spacing so that I can focus on my tasks without distraction |
| ✓ | User Interface | As a user, I want smooth transitions and visual feedback so that I can understand the results of my actions |
| ✓ | User Interface | As a user, I want to see the count of blocking and blocked tasks through prominent colored indicators (red for blocked by, green for blocking) so I can quickly understand task dependencies |
| ✓ | User Interface | As a user, I want dependency indicators to display numerical counts, with red circles showing the number of items blocking a task and green circles showing the number of items that the task is blocking, so I can instantly see dependency relationships without opening menus |
| ✓ | User Interface | As a user, I want a more compact layout without borders around tasks and reduced whitespace between items so I can see more tasks at once while maintaining clarity |
| ✓ | User Interface | As a user, I want line breaks in task descriptions to be preserved so I can format my notes with proper spacing and structure |
| ✓ | User Interface | As a user, I want each task type to have a distinct and intuitive icon (checkbox for Task, document for Mission, flag for Objective, rocket for Ambition) so I can quickly identify task types at a glance |
| ✓ | Task Management | As a user, I want to be able to edit task titles and descriptions inline so that I can quickly update information |
| ✓ | Task Management | As a user, I want to be able to delete tasks with options for handling children so that I can maintain my task hierarchy effectively |
| ✓ | Task Management | As a user, when I add a new task, I want it to have an empty title with the edit mode automatically activated so that I can quickly type what I want |
| ✓ | Task Management | As a user, I want a combined title/description editor where the first line becomes the title and subsequent lines become the description, so I can edit content more naturally |
| | Task Management | As a user, I want to be able to archive completed tasks so that I can maintain a clean workspace while preserving history |
| | Task Progress | As a user, I want to be able to track progress on tasks so that I can understand how close they are to completion |
| | Task Progress | As a user, I want to see progress of parent tasks based on child task completion so that I can understand overall progress |
| | Task Dates | As a user, I want to be able to set due dates for tasks so that I can manage deadlines and priorities |
| | Task Filtering | As a user, I want to be able to filter tasks by type so that I can focus on specific levels of work |
| | Task Search | As a user, I want to be able to search for tasks by title or description so that I can quickly find relevant items |
| ✓| Task States | As a user, I want to toggle the visibility of completed tasks within a focused view so that I can manage scope and attention |
| | Task Types | As a user, I want each item to support both sub-tasks and questions so I can track execution and unknowns in one place |

## Implementation Notes

### Authentication
- Using Supabase for authentication and data storage
- Email/password authentication
- Automatic redirection to login page when not authenticated
- User-specific data isolation

### Task Types
- **Task**: Items without children, represented by a checkbox icon
- **Mission**: Items with one level of children, represented by a document/checklist icon
- **Objective**: Items with two or more levels of children, represented by a flag icon
- **Ambition**: Root level items, represented by a rocket icon
- Manual override available with visual distinction
- Automatic classification can be restored

### User Interface
- Modern, clean design using Tailwind CSS
- Drag and drop functionality for task reordering and restructuring
- Visual feedback for task interactions
- Responsive layout
- Hierarchical display with proper indentation
- Type-specific color coding
- Visual indicators for manual type overrides
- Smooth transitions and animations
- Collapsible task hierarchies with visual indicators
- Inline editing for titles and descriptions with keyboard support

### Task Management
- Delete confirmation dialogs to prevent accidental deletion
- Child tasks can be either deleted with parent or promoted to parent's level
- Position reordering handled automatically after deletions