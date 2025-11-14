export interface ElementSummary {
  id: number;
  name_tr: string;
  emoji: string;
  is_seed: boolean;
  description_tr?: string | null;
}

export interface ElementDetail extends ElementSummary {
  description_tr: string;
  tags: string[];
}

export interface CanvasElement {
  uid: string;
  elementId: number;
  name: string;
  emoji: string;
  description?: string;
  tags?: string[];
  x: number;
  y: number;
  discoveredAt: number;
  isNew?: boolean;
  isFirstEver?: boolean;
  isVanishing?: boolean;
}

export interface CombineResponse {
  element: {
    id: number;
    name_tr: string;
    emoji: string;
    description_tr: string;
    tags: string[];
  };
  isNewElementForSession: boolean;
  isFirstEverCombination: boolean;
  combinationId?: number | null;
  rateLimitReached: boolean;
}
