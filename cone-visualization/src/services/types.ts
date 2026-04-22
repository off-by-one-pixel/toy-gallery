import { SectionShapeEnum } from './generated/schemas';
import type {
  Toy as ApiToy,
  ToyRequest as ApiToyRequest,
  ToyShape as ApiShape,
  ToyShapeSection as ApiSection,
} from './generated/schemas';
import type { SnakeToCamel } from '../utils/case';

// Domain types are derived mechanically from the generated API schemas by
// converting snake_case keys to camelCase. `readonly`/`?` modifiers and field
// presence (request vs response) come straight from the OpenAPI schema — the
// BE is the single source of truth.

// ---------- Auth ----------

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthContext {
  getAccessToken(): string | null;
  /** Return a new access token (and persist however the caller wants), or null. */
  onUnauthorized(): Promise<string | null>;
}

// ---------- Domain types ----------

export type SectionShape = SectionShapeEnum;
export const SectionShape = SectionShapeEnum;

export type Section = SnakeToCamel<ApiSection>;
export type Shape = SnakeToCamel<ApiShape>;
export type Toy = SnakeToCamel<ApiToy>;
export type ToyPayload = SnakeToCamel<ApiToyRequest>;

// ---------- Errors ----------

export class APIError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}
