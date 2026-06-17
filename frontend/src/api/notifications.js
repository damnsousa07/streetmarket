import { api } from './client';

export async function getNotificationsByUser(user_id) {
  const res = await api.get(`/notifications/${user_id}`);
  return res.data;
}
