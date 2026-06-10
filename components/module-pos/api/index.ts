import { Api } from './api';

const apiGatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/';
const basePosUrl = `${apiGatewayUrl.replace(/\/$/, '')}/api/pos`;

export const apiClient = new Api({
  baseURL: basePosUrl,
});

