import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, TasksQuery, CreateTaskPayload, TaskStatus } from '../api/endpoints/tasks';

export const useTasks = (query?: TasksQuery) =>
  useQuery({
    queryKey: ['tasks', query],
    queryFn: () => tasksApi.list(query),
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useUpdateTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.updateStatus(id, status),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', updated.id] });
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};
