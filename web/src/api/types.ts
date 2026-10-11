import { InvolvementEnum, SectionShapeEnum } from '@/api/generated/schemas';

export type { AttributeSuggestion } from '@/api/generated/schemas';
import type {
  PersonalRecord as ApiPersonalRecord,
  ToyRecord as ApiToyRecord,
  Session as ApiSession,
  SessionMediaItem as ApiSessionMediaItem,
  SessionMediaResponse as ApiSessionMediaResponse,
  SessionRequest as ApiSessionRequest,
  Toy as ApiToy,
  ToyRequest as ApiToyRequest,
  ToyShape as ApiShape,
  ToyShapeSection as ApiSection,
  ToySessionEntry as ApiSessionEntry,
} from '@/api/generated/schemas';
import type { SnakeToCamel } from '@/api/case';

export interface TokenPair {
  access: string;
  refresh: string;
}

export type SectionShape = SectionShapeEnum;
export const SectionShape = SectionShapeEnum;

export type Section = SnakeToCamel<ApiSection>;
export type Shape = SnakeToCamel<ApiShape>;
export type Toy = SnakeToCamel<ApiToy>;
export type ToyRecord = SnakeToCamel<ApiToyRecord>;
export type ToyPayload = SnakeToCamel<ApiToyRequest>;

export type Involvement = InvolvementEnum;
export const Involvement = InvolvementEnum;

export type SessionEntry = SnakeToCamel<ApiSessionEntry>;
export type SessionRecord = SnakeToCamel<ApiPersonalRecord>;
export type Session = SnakeToCamel<ApiSession>;
export type SessionPayload = SnakeToCamel<ApiSessionRequest>;

export type { StatsGroup } from '@/api/generated/schemas';
export type SessionMediaItem = SnakeToCamel<ApiSessionMediaItem>;
export type SessionMedia = Omit<SnakeToCamel<ApiSessionMediaResponse>, 'items'> & { items: SessionMediaItem[] };

export type ToyTemplate = Readonly<{
  id: string;
  name: string;
  description?: string;
  shape: Shape;
  totalLength: number;
  insertableLength: number;
  circumference: number;
}>;

export interface AttributeRow {
  rowId: number;
  key: string;
  value: string;
  fromSaved: boolean;
}

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
