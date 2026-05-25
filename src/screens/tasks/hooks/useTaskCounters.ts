import { useQuery } from '@tanstack/react-query';

import { tasksApi } from '../../../api/endpoints/tasks';

export function useTaskCounters(
  activeTab: 'NORMAL' | 'RECURRING',
  userIdentifier?: string,
  isAdmin?: boolean,
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayCountQuery = useQuery({
    queryKey: ['tasks-count-today', activeTab, userIdentifier, isAdmin],
    queryFn: () =>
      tasksApi.listPaginated({
        status: 'OPEN',
        dueFrom: todayStart.toISOString(),
        dueTo: todayEnd.toISOString(),
        assigneeId: isAdmin ? undefined : userIdentifier,
        isRecurring: activeTab === 'RECURRING',
        limit: 1,
      }),
    staleTime: 10 * 1000,
  });

  const highPriorityCountQuery = useQuery({
    queryKey: ['tasks-count-high', activeTab, userIdentifier, isAdmin],
    queryFn: () =>
      tasksApi.listPaginated({
        status: 'OPEN',
        priority: 'HIGH',
        assigneeId: isAdmin ? undefined : userIdentifier,
        isRecurring: activeTab === 'RECURRING',
        limit: 1,
      }),
    staleTime: 10 * 1000,
  });

  return {
    todayCount: todayCountQuery.data?.meta.total ?? 0,
    highPriorityCount: highPriorityCountQuery.data?.meta.total ?? 0,
    refetchTodayCount: todayCountQuery.refetch,
    refetchHighPriorityCount: highPriorityCountQuery.refetch,
  };
}
