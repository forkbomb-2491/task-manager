# Roadmap

## v0.2 (Current)
- [x] Project Planner
- [x] Check-Ins & Notifications

### Bug Fixes
- [ ] Pause button on Pomodoro adds play/pause emojis endlessly.
- [x] Project Planner subtask list doesn't sort on task selection

## Future

### v0.3 (Next Release)
- [ ] Built-in Feedback Form
- [ ] ~Custom Category Names~ <!-- Strikethrough: we're not doing it anymoreeee -->
- [x] Sorting Applies to Subtasks too
- [x] Drop down notification
- [x] Bug Report Form
- [x] Project Planner has filter for different lists
- [x] ✨ Due date offset ~recommendations~ __adjustments__ based on past tasks
- [x] Separate Task Lists (with colors assignable)
- [x] Editing Tasks
- [x] Add due time
- [x] Sorting Tasks in Tasks Tab
- [x] Help Tab has Toggle Overdue
- [x] Sheets/info boxes

#### Bugs
- [ ] Task edit pencil shifts over task contents.
- [ ] Pause button on Pomodoro adds play/pause emojis endlessly.
- [ ] Tasks remain on list previews after completion.
- [ ] (macOS) Checkboxes on TaskPlan display checkmark 0.2rem too high.
- [x] Task list previews add wrong task elements when task is edited/refreshed.
- [x] Color still doesn't change when task is added from taskplan.
- [x] Changing task due date does not move planner element.
    - Current solution is messy--make it so TaskEvents have before and after versions.
- [x] Tasks do not appear in project planner after being made in Tasks tab without refresh.
- [x] Tasks do not adopt color of parent list without refresh.
- [x] Certain private properties of the Task class were public, potentially preventing task modifications from being registered by event listeners.

### v0.4
- [ ] Even more and more comprehensive recommendations
- [ ] Can move tasks between lists
- [ ] Calendar View

### v0.5
TBD