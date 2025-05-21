# User Story: Drag and Drop Reordering

As a user, I want to be able to drag and drop tasks to reorder them within their parent or move them to a different parent so that I can quickly adjust priorities and restructure my hierarchy as my understanding evolves.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | High |

## Acceptance Criteria

1. ✓ Users can drag any task to reposition it within its current parent
2. ✓ Users can drag tasks to place them under a different parent
3. ✓ The UI provides clear visual feedback during drag operations:
   - ✓ Dragged items show reduced opacity (10%)
   - ✓ Drop zones use a blue highlight with opacity transitions
   - ✓ Drop zones are hidden by default and only appear during drag operations
4. ✓ Drop zones are clearly indicated when dragging an item:
   - ✓ Before drop zones appear above items
   - ✓ After drop zones appear below the last item at each level
   - ✓ Child drop zones cover the entire task item for leaf nodes
   - ✓ Drop zones only appear when an item is being dragged
   - ✓ Child drop zones only appear for tasks without children
   - ✓ After drop zones only appear for the last item at each level
5. ✓ Task hierarchy is preserved when moving items (children move with their parent)
6. ✓ Position changes persist after page refresh
7. ✓ The drag and drop interface works in tree view
8. ✓ Dragging respects the current view filters and focus
9. ✓ Users receive visual confirmation when a drag operation is completed
10. ✓ Tasks maintain their proper position values after being moved

## Non-Functional Requirements

1. Drag and drop operations should be smooth and responsive
2. The interface should provide clear affordances for draggable items
3. Visual feedback during drag operations should be intuitive
4. The system should prevent invalid drop operations
5. Performance should remain good even with large hierarchies

## Dependencies

1. Task hierarchy implementation
2. Position tracking system
3. React DnD or similar drag and drop library
4. UI components for drag feedback

## Implementation Notes

### Drag Interface
- Implemented using the React DnD library for reliable drag and drop functionality
- Each task item is made draggable with appropriate hover states
- The cursor changes to indicate that an item is draggable
- Items being dragged show a semi-transparent preview with reduced opacity

### Drop Zones
- Created visible drop zones that appear when dragging:
  - Between items (for positioning within the same parent)
  - Within items (for adding as a child)
- Drop zones are highlighted when hovered over during a drag operation
- Drop zones dynamically resize to provide larger targets when approached
- Invalid drop targets are prevented (e.g., dropping an item inside itself)

### Visual Feedback
- Drop zones show a blue highlight when valid and a different color when invalid
- The height of drop zones increases when an item is dragged over them
- During dragging, the original position shows a placeholder
- Items animate smoothly to their new positions after a drop

### Data Management
- Drag operations track:
  - The item being dragged (id, parent, position)
  - The target drop zone (parent, position)
- On drop, the system updates:
  1. The parent_id of the moved item (if needed)
  2. The position of the moved item
  3. The positions of other affected items to maintain order
- All position updates are persisted to the database to ensure consistency

### Performance Considerations
- Only visible items are made draggable to reduce overhead
- Drop zone rendering is optimized to prevent layout thrashing
- Position updates are batched to minimize database operations
- The drag preview is optimized to maintain smooth performance 