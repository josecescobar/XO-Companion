import { api } from '../client';

export async function unregisterPushToken(token: string): Promise<void> {
  await api<{ success: boolean }>('/notifications/unregister', {
    method: 'DELETE',
    body: { token },
  });
}
