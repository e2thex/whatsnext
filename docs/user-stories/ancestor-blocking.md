# Ancestor-Based Task Blocking

## User Story
As a user, I want to see that a task is automatically marked as blocked when all of its uncompleted  decendents  are blocked , so that I can understand the true state of my task hierarchy.

## Acceptance Criteria
- Tasks are automatically marked as blocked when all their uncompleted decendents  are blocked
- Tasks are automatically unblocked when at least one ancestor becomes unblocked and incomplete or there are no uncompleted decendents 
- The automatic blocking status updates in real-time as ancestor statuses change
- The automatic blocking status is visible in both list and tree views
- the filter respects these blocked items as blocked
