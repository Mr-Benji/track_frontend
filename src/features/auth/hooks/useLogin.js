import { useMutation } from '@tanstack/react-query'
import { loginRequest } from '../api'

export function useLogin() {
  return useMutation({ mutationFn: loginRequest })
}