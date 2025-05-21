# Ancestor-Based Task Blocking

## User Story
As a user, I want to see that a task is automatically marked as blocked when all of its uncompleted descendants are blocked, so that I can understand the true state of my task hierarchy.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Management |
| Priority | Medium |

## Acceptance Criteria
- Tasks are automatically marked as blocked when all their uncompleted descendants are blocked ✓
- Tasks are automatically unblocked when at least one ancestor becomes unblocked and incomplete or there are no uncompleted descendants ✓
- The automatic blocking status updates in real-time as ancestor statuses change ✓
- The automatic blocking status is visible in both list and tree views ✓
- The filter respects these blocked items as blocked ✓

## Implementation Details
- Ancestor blocking logic implemented in taskUtils.ts ✓
- Real-time status updates through React Query ✓
- Visual indicators for blocked status in both views ✓
- Integration with blocking status filters ✓

## Related Components
- `app/utils/taskUtils.ts` - Contains the ancestor blocking logic
- `app/components/TaskItem.tsx` - Displays blocking status
- `app/services/tasks.ts` - Manages blocking relationships
