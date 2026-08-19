import { InvolvementEnum, SectionShapeEnum } from './generated/schemas';
import type {
  Session as ApiSession,
  SessionMediaItem as ApiSessionMediaItem,
  SessionMediaResponse as ApiSessionMediaResponse,
  SessionRequest as ApiSessionRequest,
  Toy as ApiToy,
  ToyRequest as ApiToyRequest,
  ToyShape as ApiShape,
  ToyShapeSection as ApiSection,
  ToySessionEntry as ApiSessionEntry,
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

// ---------- Domain types ----------

export type SectionShape = SectionShapeEnum;
export const SectionShape = SectionShapeEnum;

export type Section = SnakeToCamel<ApiSection>;
export type Shape = SnakeToCamel<ApiShape>;
export type Toy = SnakeToCamel<ApiToy>;
export type ToyPayload = SnakeToCamel<ApiToyRequest>;

export type Involvement = InvolvementEnum;
export const Involvement = InvolvementEnum;

export type SessionEntry = SnakeToCamel<ApiSessionEntry>;
export type Session = SnakeToCamel<ApiSession>;
export type SessionPayload = SnakeToCamel<ApiSessionRequest>;

export type { StatsGroup } from './generated/schemas';
export type SessionMediaItem = SnakeToCamel<ApiSessionMediaItem>;
export type SessionMedia = Omit<SnakeToCamel<ApiSessionMediaResponse>, 'items'> & { items: SessionMediaItem[] };

// ---------- Toy shape templates ----------

/** Predefined starter shape shown in the "new toy" wizard. The author
 *  declares canonical `totalLength`, `insertableLength`, and `circumference`
 *  — the scaler stretches `shape.sections` to the user's target size using
 *  these as denominators. */
export type ToyTemplate = Readonly<{
  id: string;
  name: string;
  description?: string;
  shape: Shape;
  totalLength: number;
  insertableLength: number;
  circumference: number;
}>;

// ---------- Attribute editor row ----------

/** A single editable row in the custom-attributes editor. `fromSaved`
 *  distinguishes a row that came from the server (and should disappear
 *  when the server drops it on save) from a fresh user-added row (which
 *  stays visible until the user fills it in). */
export interface AttributeRow {
  rowId: number;
  key: string;
  value: string;
  fromSaved: boolean;
}

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
