import { Api } from './api';

const basePosUrl = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = new Api({
  baseURL: basePosUrl,
  withCredentials: true,
});
