# User Story: Edit Task Inline
As a user, I want to be able to edit task titles and descriptions inline so that I can quickly update information.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Management |
| Priority | High |

## Acceptance Criteria

1. Each task title and description is editable directly in the task list.
2. When a user clicks on a task title or description, it transforms into an input field for editing.
3. Changes are saved automatically when the user clicks outside the input field or presses the Enter key.
4. If the user cancels the edit (e.g., by pressing the Escape key), the original text is restored.
5. Inline editing should be visually distinct to indicate that the field is editable.
6. The first line of the input should be saved as the task title, and any subsequent lines should be saved as the task description.
7. Users should be able to add links as part of the content in both the title and description.
8. Validation should be applied to ensure that titles and descriptions are not empty.
9. Users should receive feedback (e.g., a success message) when changes are saved successfully.
10. The editing functionality should work seamlessly in both mobile and desktop views.
11. Users can type "@" while editing to see a dropdown of available tasks and add them as dependencies in the format `@[TASK TITLE](#TASK_ID)`.
12. The editing interface will have subtasks as a list , new subitems can be added, subitems titles can be edited and subitems can be reorder or deleted

## Non-Functional Requirements

1. Inline editing should be smooth and responsive to user interactions.
2. The user interface should remain intuitive and easy to navigate during editing.
3. Performance should not degrade when editing tasks with long titles or descriptions.

## Dependencies

1. Task list implementation
2. State management for tasks
3. Input validation logic
4. User feedback mechanism (e.g., notifications)

## Implementation Notes

### Inline Editing
- Implemented an input field that appears when a task title or description is clicked.
- The input field should have a placeholder that indicates the expected format (e.g., "Enter task title").

### Save and Cancel Functionality
- Added event listeners for the Enter and Escape keys to handle saving and canceling edits.
- On save, the first line of the input is saved as the title, and subsequent lines are saved as the description.

### Markdown Support
- The title and description should be saved as Markdown to allow for rich text formatting, including links.
- Implemented a method to parse and render Markdown content in the task display.

### Validation
- Implemented validation logic to check for empty titles or descriptions before allowing the save action.
- Display error messages if validation fails.

### User Feedback
- Added a notification system to inform users when their changes have been successfully saved.
- Consider using a toast notification for unobtrusive feedback.

### Responsive Design
- Ensured that the inline editing feature works well on both mobile and desktop devices.
- Adjusted input field sizes and styles based on screen size for optimal usability.

### Dependency Management
- Implemented a suggestion dropdown that appears when typing "@" in the textarea.
- The dropdown shows filtered tasks as you type and allows selection via mouse click or keyboard navigation.
- Selected dependencies are formatted as `@[TASK TITLE](#TASK_ID)` in the content.
- When saving, dependencies are extracted from the content and added to the task's dependencies.
- Dependencies are displayed after the title during editing for easy reference and modification.