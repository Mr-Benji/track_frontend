import { useMutation } from '@tanstack/react-query'
import { registerRequest } from '../api'

export function useRegister() {
  return useMutation({ mutationFn: registerRequest })
}
