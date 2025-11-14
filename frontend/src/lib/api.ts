import axios from 'axios';
import type { CombineResponse, ElementSummary } from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
});

export interface SessionPayload {
  safetyOverride?: boolean;
}

export async function createSession(payload?: SessionPayload) {
  const response = await client.post('/api/session', payload ?? {});
  return response.data as { sessionId: string; discoveredElementIds: number[] };
}

export async function fetchElements(sessionId: string, search?: string) {
  const response = await client.get('/api/elements', {
    params: { sessionId, q: search }
  });
  return response.data.elements as ElementSummary[];
}

export async function combineElements(
  sessionId: string,
  elementAId: number,
  elementBId: number,
  allowUnsafe?: boolean
) {
  const response = await client.post('/api/combine', {
    sessionId,
    elementAId,
    elementBId,
    allowUnsafe: allowUnsafe ?? false
  });
  return response.data as CombineResponse;
}

export async function updateSession(sessionId: string, safetyOverride: boolean) {
  await client.patch(`/api/session/${sessionId}`, {
    safetyOverride
  });
}
