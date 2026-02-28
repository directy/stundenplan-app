export interface ConstraintRule {
  id: number;
  ruleType: string;
  description: string;
  weight: number;
  isActive: boolean;
  parameters: string;
  sortOrder: number;
}

export interface NewConstraintRule {
  ruleType: string;
  description: string;
  weight?: number;
  isActive?: boolean;
  parameters?: string;
}

export interface ConstraintOrderUpdate {
  id: number;
  sortOrder: number;
}
