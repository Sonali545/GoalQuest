# Security Specification - GoalQuest Portal

## Data Invariants
1. A **Goal** must belong to a **GoalSheet**.
2. A **GoalSheet** can only be edited by the **Employee** if it is not locked.
3. A **GoalSheet** can only be approved/edited by the assigned **Manager**.
4. **Shared Goals** can only be created by **Admins**.
5. **Check-ins** can only be created for existing approved goals.
6. **Total Weightage** in a GoalSheet must be exactly 100 before submission.

## The "Dirty Dozen" Payloads (Red Team Tests)
1. **Identity Spoofing**: Attempt to create a user profile for another UID.
2. **Privilege Escalation**: Attempt to update own user profile to `role: 'admin'`.
3. **Orphaned Goal**: Attempt to create a Goal without a valid `sheetId`.
4. **Lock Bypass**: Employee attempting to edit a Goal after the sheet is `isLocked: true`.
5. **Weightage Poisoning**: Attempting to set a goal weightage to 5% (min is 10%).
6. **Unauthorized Approval**: Employee attempting to set their own sheet status to 'approved'.
7. **PII Leak**: Non-admin/non-manager attempting to list all users.
8. **Goal Scraping**: Authenticated user attempting to read goals of an unrelated employee.
9. **Shared Goal Manipulation**: Recipient of a shared goal attempting to change the goal `title` or `target`.
10. **Shadow Update**: Adding an `isVerified: true` field to a goal sheet to bypass logic.
11. **Check-in Injection**: Creating a check-in for a goal that doesn't exist.
12. **Status Shortcutting**: Moving a goal sheet directly from `draft` to `approved` without manager intervention.

## Test Runner (firestore.rules.test.ts)
(Planned for next step after environment is ready)
