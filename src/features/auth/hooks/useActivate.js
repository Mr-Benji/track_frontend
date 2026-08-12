import { useMutation } from '@tanstack/react-query'
import { activateRequest } from '../api'

export function useActivate() {
  return useMutation({ mutationFn: activateRequest })
}
