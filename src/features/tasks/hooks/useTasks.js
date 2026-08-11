import { useQuery } from '@tanstack/react-query'
import { fetchTasks } from '../api'

export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })
}