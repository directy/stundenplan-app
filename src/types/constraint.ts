export interface ConstraintRule {
  id: number;
  ruleType: string;
  description: string;
  weight: number;
  isActive: boolean;
  parameters: string;
  sortOrder: number;
  scopeType: string;
  scopeId: number | null;
}

export interface NewConstraintRule {
  ruleType: string;
  description: string;
  weight?: number;
  isActive?: boolean;
  parameters?: string;
  scopeType?: string;
  scopeId?: number | null;
}

export interface ConstraintOrderUpdate {
  id: number;
  sortOrder: number;
}
