import type { CombineResponse, ElementSummary } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function fetchElements(): Promise<ElementSummary[]> {
  const response = await fetch(`${API_URL}/api/elements`);
  if (!response.ok) {
    throw new Error('Failed to fetch elements');
  }
  const data = (await response.json()) as { elements: ElementSummary[] };
  return data.elements;
}

export async function combineElements(elementAId: number, elementBId: number): Promise<CombineResponse> {
  const response = await fetch(`${API_URL}/api/combine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elementAId, elementBId })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to combine elements');
  }
  return (await response.json()) as CombineResponse;
}
