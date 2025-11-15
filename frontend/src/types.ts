export interface ElementSummary {
  id: number;
  name_tr: string;
  emoji: string;
  is_seed: boolean;
}

export interface CombineResponse {
  element: ElementSummary;
  created: boolean;
}
