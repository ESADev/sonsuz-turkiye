import type { CombineResponse, ElementSummary } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function fetchElements(search?: string): Promise<ElementSummary[]> {
  const params = search ? `?q=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_URL}/api/elements${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch elements');
  }
  const data = (await response.json()) as { elements: ElementSummary[] };
  return data.elements;
}

export async function combineElements(elementA: ElementSummary, elementB: ElementSummary): Promise<CombineResponse> {
  const response = await fetch(`${API_URL}/api/combine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elementA: elementA.emoji + elementA.name, elementB: elementB.emoji + elementB.name})
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to combine elements');
  }
  return (await response.json()) as CombineResponse;
}
