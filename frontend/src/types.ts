export interface ElementSummary {
  emoji: string;
  name: string;
  is_seed: boolean;
}

export interface CombineResponse {
  element: ElementSummary;
  created: boolean;
}
