import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });
}
