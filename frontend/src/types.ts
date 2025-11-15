export interface ElementSummary {
  id: number;
  name_tr: string;
  emoji: string;
  is_seed: boolean;
}

export interface CanvasElement {
  uid: string;
  elementId: number;
  name: string;
  emoji: string;
  x: number;
  y: number;
}

export interface CombineResponse {
  element: ElementSummary;
  created: boolean;
}
