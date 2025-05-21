# User Story: Hierarchical Tasks

As a user, I want notes to support infinite levels of hierarchy so that I can break down complex goals into manageable parts.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Hierarchy |
| Priority | High |

## Acceptance Criteria

1. Tasks can be nested under other tasks to create parent-child relationships
2. There is no limit to how deeply tasks can be nested
3. Users can add a child task to any existing task
4. The UI clearly displays the hierarchical relationship between tasks
5. Tasks maintain their hierarchical relationships when the page is refreshed
6. Users can view and navigate the hierarchy in different ways (expanded, collapsed)
7. Child tasks are visually indented under their parent tasks for clear visual hierarchy
8. Parent-child relationships are preserved when tasks are reordered

## Non-Functional Requirements

1. Task hierarchy should be intuitive and easy to understand
2. Performance should not degrade significantly with deeply nested hierarchies
3. The UI should scale appropriately to handle deep nesting levels
4. Hierarchical operations should be responsive and immediate

## Dependencies

1. Database schema that supports hierarchical relationships
2. UI components for displaying hierarchical data
3. State management for tracking parent-child relationships

## Implementation Notes

### Data Structure
- Each task has a `parent_id` field that references its parent task
- Tasks with `null` parent_id are considered top-level tasks
- Tasks are sorted by a `position` field within their parent context

### UI Representation
- Tasks are indented under their parents to visually represent hierarchy
- Each level of hierarchy has adequate spacing to distinguish between levels
- Parent tasks have a collapse/expand toggle button when they have children

### Adding Child Tasks
- Each task has an "Add Child" button that creates a new task with the current task as its parent
- When a child task is added, it's positioned at the end of the existing children

### Hierarchical Navigation
- Collapsing a parent hides all of its descendants
- Expanding a parent shows its immediate children (not all descendants)
- Proper tree traversal ensures correct rendering order

### Performance Considerations
- Tasks are organized in a map by parent_id for efficient lookup
- Collapsing large sections of the hierarchy helps manage visual complexity
- Rendering is optimized to handle large hierarchies without performance degradation 