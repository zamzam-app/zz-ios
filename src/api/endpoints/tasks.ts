import client from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskCategory = string;

export interface TaskCategoryOption {
  id: string;
  name: string;
  description?: string;
}

export interface Task {
  id: string;
  description: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  taskCategory?: { _id: string; name: string; description?: string };
  dueDate: string;
  outletId?: string;
  outletName?: string;
  outlet?: { _id: string; name?: string } | null;
  assigneeIds: string[];
  assigneeNames?: string[];
  assignees?: Array<{ _id: string; name?: string }>;
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
  taskCategoryId?: string;
  category?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

export interface CreateTaskPayload {
  description: string;
  taskCategoryId: string;
  priority: TaskPriority;
  dueDate: string;
  outletId?: string;
  assigneeIds?: string[];
  status?: TaskStatus;
}

// ─── Raw API shape (backend returns nested objects) ───────────────────────────

interface RawTask {
  _id?: string;
  id?: string;
  description?: string;
  category?: string;
  taskCategory?: { _id?: string; name?: string; description?: string };
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

interface RawTaskCategory {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
}

function mapTaskCategory(raw: RawTaskCategory): TaskCategoryOption {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description,
  };
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

function mapTask(raw: RawTask): Task {
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
    category: raw.category ?? taskCategory?.name,
    taskCategory,
    dueDate: raw.dueDate ?? new Date().toISOString(),
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

  listCategories: async () => {
    const endpoints = ['/task-categories', '/task-category', '/taskCategory'];
    let lastNotFoundError: unknown;

    for (const endpoint of endpoints) {
      try {
        const response = await client.get<{ data: RawTaskCategory[] } | RawTaskCategory[]>(endpoint, {
          params: { limit: 100 },
        });
        const raw = Array.isArray(response.data)
          ? response.data
          : (response.data as { data: RawTaskCategory[] }).data ?? [];
        return raw
          .map(mapTaskCategory)
          .filter((category) => category.id.length > 0 && category.name.length > 0);
      } catch (error) {
        if (getHttpStatus(error) !== 404) {
          throw error;
        }
        lastNotFoundError = error;
      }
    }

    throw lastNotFoundError ?? new Error('Task categories endpoint not found');
  },

  updateStatus: (id: string, status: TaskStatus) =>
    client.patch<RawTask>(`/tasks/${id}/status`, { status }).then((r) => mapTask(r.data)),

  delete: (id: string) =>
    client.delete(`/tasks/${id}`),
};
