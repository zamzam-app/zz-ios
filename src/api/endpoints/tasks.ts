import client from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskCategory = 'HYGIENE' | 'MAINTENANCE' | 'INVENTORY' | 'STAFFING';

export interface Task {
  id: string;
  description: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: TaskCategory;
  dueDate: string;
  outletId?: string;
  outletName?: string;
  assigneeIds: string[];
  assigneeNames?: string[];
  imageUrls?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export interface TasksQuery {
  page?: number;
  limit?: number;
  outletId?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

export interface CreateTaskPayload {
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string;
  outletId: string;
  assigneeIds: string[];
  status?: TaskStatus;
}

// ─── Raw API shape (backend returns nested objects) ───────────────────────────

interface RawTask {
  _id?: string;
  id?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  outletId?: string | { _id?: string; name?: string };
  outlet?: { _id?: string; name?: string };
  outletName?: string;
  assigneeIds?: Array<string | { _id?: string }>;
  assigneeNames?: string[];
  assignees?: Array<{ _id?: string; name?: string }>;
  imageUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

function mapTask(raw: RawTask): Task {
  const id = String(raw._id ?? raw.id ?? '');
  const description = String(raw.description ?? '');
  const title = description.split('\n')[0]?.trim().slice(0, 120) || 'Task';

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
    assigneeIds = (raw.assigneeIds ?? []).map((x) =>
      typeof x === 'string' ? x : String((x as { _id?: string })._id ?? ''),
    ).filter(Boolean);
    assigneeNames = raw.assigneeNames ?? [];
  }

  return {
    id,
    description,
    title,
    status: (raw.status as TaskStatus) ?? 'OPEN',
    priority: (raw.priority as TaskPriority) ?? 'MEDIUM',
    category: raw.category as TaskCategory | undefined,
    dueDate: raw.dueDate ?? new Date().toISOString(),
    outletId,
    outletName,
    assigneeIds,
    assigneeNames,
    imageUrls: raw.imageUrls,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt ?? null,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (query?: TasksQuery) =>
    client
      .get<{ data: RawTask[]; total?: number } | RawTask[]>('/tasks', { params: query })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawTask[] }).data ?? [];
        return raw.map(mapTask);
      }),

  getById: (id: string) =>
    client.get<RawTask>(`/tasks/${id}`).then((r) => mapTask(r.data)),

  create: (payload: CreateTaskPayload) =>
    client.post<RawTask>('/tasks', payload).then((r) => mapTask(r.data)),

  updateStatus: (id: string, status: TaskStatus) =>
    client.patch<RawTask>(`/tasks/${id}/status`, { status }).then((r) => mapTask(r.data)),

  delete: (id: string) =>
    client.delete(`/tasks/${id}`),
};
