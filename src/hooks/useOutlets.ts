import { useQuery } from '@tanstack/react-query';
import { outletsApi } from '../api/endpoints/outlets';

export const useOutlets = () =>
  useQuery({
    queryKey: ['outlets'],
    queryFn: outletsApi.list,
    staleTime: 5 * 60 * 1000,
  });
