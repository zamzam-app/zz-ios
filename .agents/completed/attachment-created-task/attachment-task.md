# Plan: Show Create-Task Attachments in Task Detail Timeline

## Problem statement
When attachments are added while creating a task (`CreateTaskScreen` flow), they are saved under `adminSubmission.attachments` in the create payload, but users do not see those attachments in `TaskDetailScreen` timeline.

## Current behavior (confirmed)
1. Create flow builds `CreateTaskPayload.adminSubmission.attachments` and submits through task submission queue:
   - `src/screens/tasks/hooks/useCreateTaskFormState.ts`
   - `src/api/endpoints/tasks/taskSubmissionProcessor.ts`
2. Task detail timeline UI renders attachment previews only for specific event types:
   - `ATTACHMENT_ADDED` / `ATTACHMENT_REMOVED` -> `TimelineEventAttachment`
   - `COMMENTED` may include previews in its own renderer
   - `CREATED` -> `TimelineEventCreated` only renders description (no attachments)
3. Result: if backend does not emit separate `ATTACHMENT_ADDED` events for creation-time attachments, the timeline shows no attachment cards for initial attachments.

## Implementation strategy
Use a two-layer approach so it works regardless of backend event shape:

1. Preferred path: render attachments from `CREATED` event when `attachmentPreviews` exist.
2. Fallback path: synthesize a timeline attachment view from `source` (`adminSubmission/attachments`) for create-time data when no attachment event exists.

## Detailed steps

### 1) Extend CREATED event renderer to support attachment previews
Files:
- `src/screens/tasks/components/timeline/TimelineEventCreated.tsx`

Changes:
1. Keep current description rendering.
2. If `event.attachmentPreviews?.length > 0`, render a compact attachment grid below description.
3. Reuse existing attachment card visuals/logic from `TimelineEventAttachment` (either extract shared `AttachmentPreviewList` component or duplicate minimal presentation to avoid behavior drift).
4. Wire `onAttachmentPress` to open previews (requires updating prop plumbing in step 2).

### 2) Pass attachment click handler into CREATED event card path
Files:
- `src/screens/tasks/components/timeline/TimelineEventCard.tsx`

Changes:
1. Update `TimelineEventCreated` invocation to pass optional `onAttachmentPress`.
2. Update `TimelineEventCreatedProps` accordingly.

### 3) Add controller-level fallback event synthesis for create-time attachments
Files:
- `src/screens/tasks/hooks/useTaskDetailController.ts`

Changes:
1. In `timelineEvents` derivation, after dedupe/clubbing, detect if timeline has any attachment-bearing event:
   - `ATTACHMENT_ADDED`, or
   - event with non-empty `attachmentPreviews`.
2. If none exist, but `sourceAttachments` has items from initial task data (`images/videos/savedAudios/files`), append or inject a synthetic event representing "attachments added at creation".
3. Synthetic event should:
   - use stable id/key prefix (e.g., `synthetic-created-attachments-${taskId}`),
   - set `type: ATTACHMENT_ADDED` (or `CREATED` with previews if you prefer consistent semantics),
   - provide `createdBy` and `createdAt` from task source where possible,
   - include normalized `attachmentPreviews` mapping URL -> type.
4. Ensure synthetic event is only added once and does not duplicate real backend attachment events.

Note:
- If you choose `type: CREATED`, the new CREATED renderer from step 1 can display previews naturally.
- If you choose `type: ATTACHMENT_ADDED`, existing attachment renderer works without further UI changes.

### 4) Normalize URL->AttachmentPreview mapping helper
Files:
- `src/screens/tasks/hooks/useTaskDetailController.ts` (or a small local helper file under `src/screens/tasks/hooks/`)

Changes:
1. Add pure helper to convert source arrays into `AttachmentPreview[]`:
   - images -> `AttachmentType.IMAGE`
   - videos -> `AttachmentType.VIDEO`
   - audios -> `AttachmentType.AUDIO`
   - files -> `AttachmentType.FILE`
2. Deduplicate by URL.
3. Generate deterministic `_id` from type + index + url.

### 5) Keep query/cache ownership intact
No endpoint changes needed unless backend contract is updated.

Rules to preserve:
1. Do not move query-key logic into endpoint modules.
2. No raw `client` usage outside `src/api/endpoints/*`.
3. Keep iOS-only posture intact (no platform branching).

## Validation plan
1. Create task with each attachment type (image, video, audio, file) from create flow.
2. Open new task detail immediately and verify timeline shows attachment cards for initial attachments.
3. Add extra attachment from Task Detail bottom "+" and verify no duplication/regression in timeline (real `ATTACHMENT_ADDED` still works).
4. Verify attachment tap opens preview/external handler as expected.
5. Run `npm run do` to validate lint/types.

## Risks / edge cases
1. Backend may already send created-event `attachmentPreviews` in some environments; fallback must avoid double rendering.
2. Audio previews from `source` may not always be streamable; tapping should follow existing safe behavior.
3. Sorting: synthetic event insertion should respect timeline order and not break pagination UX.

## Optional backend follow-up (recommended)
If backend team can guarantee timeline includes initial attachment events (or `CREATED.attachmentPreviews`), we can later remove synthesis fallback and keep UI purely server-driven.
