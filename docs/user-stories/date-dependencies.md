# User Story: Date Dependencies

As a user, I want to add a date as a dependency so that a task is blocked until that date, on that date it will be unblocked automatically so I can delay tasks and then have them come back automatically.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task States |
| Priority | Medium |

## Acceptance Criteria

1. Users can set a future date and time as a dependency for any task
2. Tasks with date dependencies are visually indicated as blocked until the specified date arrives
3. Date dependencies are shown alongside task dependencies in the dependency interface
4. Users can easily modify or remove a date dependency
5. Tasks automatically become unblocked when their date dependency is reached
6. The date dependency UI is intuitive and easy to use
7. Users can see the specific date when a task will become unblocked
8. Date dependencies persist across sessions and page refreshes
9. Date dependencies can coexist with task dependencies (both must be satisfied for a task to be unblocked)
10. Date dependency status is updated without requiring page refresh

## Non-Functional Requirements

1. Date selection UI should be intuitive with appropriate date and time controls
2. Date dependency status should update automatically as time passes
3. Date dependencies should be efficiently checked without excessive server load
4. The system should handle timezone differences appropriately

## Dependencies

1. Task dependency system
2. UI components for date selection
3. Data persistence for date dependencies
4. A mechanism for time-based task status updates

## Implementation Notes

### Date Dependency UI
- Implemented a date dependency section in the dependency management menu
- Added a date/time picker for selecting the unblock date
- The date selection UI defaults to future dates only
- Date dependencies are displayed alongside task dependencies for a unified experience

### Date Dependency Data Model
- Created a `date_dependencies` table with fields for `task_id` and `unblock_at`
- Each task can have at most one date dependency
- Date values are stored in UTC format for consistent timezone handling
- Date dependency data is loaded alongside task dependencies for efficient retrieval

### Visual Indicators
- Tasks with date dependencies show the same blocked visual treatment as task dependencies
- The dependency indicator includes date dependencies in its count
- The dependency menu shows the specific date when the task will be unblocked
- Date dependencies are visually distinguished from task dependencies in the menu

### Date Dependency Logic
- A task is considered blocked if the current time is before the `unblock_at` time
- Date dependency status is checked:
  1. On initial page load
  2. Periodically while the page is open
  3. When the user interacts with the task
- If a task has both date and task dependencies, both must be satisfied for the task to be unblocked

### User Experience Considerations
- Users can add a date dependency with an intuitive date/time picker
- Date dependencies can be removed with a single click
- The UI converts UTC times to the user's local timezone for display
- The dependency menu provides clear feedback about when a task will be unblocked
- Date selection defaults to the next day to prevent accidental creation of immediately unblocked dependencies 