import type {
  RawTask,
  RawTaskCategory,
  Task,
  TaskCategoryOption,
  TaskStatus,
  TaskPriority,
  TaskRecurrenceType,
  TaskBadgeTone,
} from './taskTypes';

function listFromRaw(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function uniqueList(items: string[]): string[] {
  return Array.from(new Set(items));
}

export function mapTaskCategory(raw: RawTaskCategory): TaskCategoryOption {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description,
  };
}

export function mapTask(raw: RawTask): Task {
  const id = String(raw._id ?? raw.id ?? '');
  const description = String(raw.description ?? '');
  const title = description.split('\n')[0]?.trim().slice(0, 120) || 'Task';
  const taskCategory =
    raw.taskCategory?._id && raw.taskCategory?.name
      ? {
          _id: String(raw.taskCategory._id),
          name: String(raw.taskCategory.name),
          description: raw.taskCategory.description,
        }
      : undefined;

  // outlet
  let outletId: string | undefined;
  let outletName: string | undefined;
  if (raw.outlet?._id) {
    outletId = String(raw.outlet._id);
    outletName = raw.outlet.name;
  } else if (typeof raw.outletId === 'object' && raw.outletId?._id) {
    outletId = String(raw.outletId._id);
    outletName = (raw.outletId as { name?: string }).name;
  } else if (typeof raw.outletId === 'string') {
    outletId = raw.outletId;
  }
  if (!outletName && raw.outletName) outletName = raw.outletName;

  // assignees
  let assigneeIds: string[] = [];
  let assigneeNames: string[] = [];
  if (Array.isArray(raw.assignees) && raw.assignees.length > 0) {
    for (const a of raw.assignees) {
      if (a._id) assigneeIds.push(String(a._id));
      if (typeof a.name === 'string') assigneeNames.push(a.name);
    }
  } else {
    assigneeIds = (raw.assigneeIds ?? [])
      .map((x) => (typeof x === 'string' ? x : String((x as { _id?: string })._id ?? '')))
      .filter(Boolean);
    assigneeNames = raw.assigneeNames ?? [];
  }

  const images = uniqueList([
    ...listFromRaw(raw.imageUrls),
    ...listFromRaw(raw.attachments?.images),
    ...listFromRaw(raw.adminSubmission?.attachments?.images),
  ]);
  const videos = uniqueList([
    ...listFromRaw(raw.videoUrls),
    ...listFromRaw(raw.attachments?.videos),
    ...listFromRaw(raw.adminSubmission?.attachments?.videos),
  ]);
  const audios = uniqueList([
    ...listFromRaw(raw.audioUrls),
    ...listFromRaw(raw.attachments?.audios),
    ...listFromRaw(raw.adminSubmission?.attachments?.audios),
  ]);
  const files = uniqueList([
    ...listFromRaw(raw.fileUrls),
    ...listFromRaw(raw.attachments?.files),
    ...listFromRaw(raw.adminSubmission?.attachments?.files),
  ]);
  const hasAttachments =
    images.length > 0 || videos.length > 0 || audios.length > 0 || files.length > 0;

  const badges = Array.isArray(raw.badges)
    ? raw.badges
        .filter((badge): badge is { key?: string; label?: string; tone?: TaskBadgeTone } =>
          Boolean(badge?.label),
        )
        .map((badge) => ({
          key: String(badge.key ?? badge.label ?? ''),
          label: String(badge.label ?? ''),
          tone: badge.tone ?? 'neutral',
        }))
    : undefined;

  const assignedAt = raw.assignedAt ?? raw.assigned_at ?? raw.createdAt ?? raw.created_at;
  const createdAt = raw.createdAt ?? raw.created_at ?? assignedAt ?? new Date().toISOString();

  return {
    id,
    description,
    title,
    status: (raw.status as TaskStatus) ?? 'OPEN',
    priority: (raw.priority as TaskPriority) ?? 'MEDIUM',
    category: raw.category ?? taskCategory?.name,
    taskCategory,
    dueDate: raw.dueDate ?? new Date().toISOString(),
    dueTime: raw.dueTime,
    outletId,
    outletName,
    outlet: raw.outlet?._id ? { _id: String(raw.outlet._id), name: raw.outlet.name } : null,
    assigneeIds,
    assigneeNames,
    assignees: Array.isArray(raw.assignees)
      ? raw.assignees
          .filter((a): a is { _id?: string; name?: string } => Boolean(a?._id))
          .map((a) => ({ _id: String(a._id), name: a.name }))
      : undefined,
    imageUrls: images.length > 0 ? images : undefined,
    attachments: hasAttachments ? { images, videos, audios, files } : undefined,
    adminSubmission: raw.adminSubmission
      ? {
          text: raw.adminSubmission.text,
          attachments: raw.adminSubmission.attachments
            ? {
                images: listFromRaw(raw.adminSubmission.attachments.images),
                videos: listFromRaw(raw.adminSubmission.attachments.videos),
                audios: listFromRaw(raw.adminSubmission.attachments.audios),
                files: listFromRaw(raw.adminSubmission.attachments.files),
              }
            : undefined,
        }
      : undefined,
    managerSubmission: raw.managerSubmission
      ? {
          text: raw.managerSubmission.text,
          attachments: raw.managerSubmission.attachments
            ? {
                images: listFromRaw(raw.managerSubmission.attachments.images),
                videos: listFromRaw(raw.managerSubmission.attachments.videos),
                audios: listFromRaw(raw.managerSubmission.attachments.audios),
                files: listFromRaw(raw.managerSubmission.attachments.files),
              }
            : undefined,
        }
      : undefined,
    isRecurring: !!raw.isRecurring,
    recurrenceType: raw.recurrenceType as TaskRecurrenceType | undefined,
    recurrenceDays: raw.recurrenceDays ?? [],
    assignedAt,
    createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt ?? null,
    badges,
  };
}
