import type { Shape, ToySection } from 'cone-editor';

import type { Dimension } from './units';

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

// ---------- API wire shapes ----------

export interface ApiSection {
  id: number;
  height: Dimension;
  diameter: Dimension;
  circumference: Dimension | null;
}

export interface ApiCone {
  id: number;
  name: string;
  brand: string;
  size: string;
  color: string;
  height: Dimension;
  diameter: Dimension;
  circumference: Dimension | null;
  insertable_length: Dimension | null;
  shape: {
    top_section_shape: string;
    bottom_section_shape?: string;
    sections: ApiSection[];
  };
}

// ---------- Domain types used throughout the app ----------

export interface Toy {
  id: number;
  name: string;
  brand: string;
  size: string;
  color: string;
  height: Dimension;
  diameter: Dimension;
  circumference: Dimension | null;
  insertableLength: Dimension | null;
  topShape: Shape;
  bottomShape: Shape;
  /** Section values are in mm for the geometry renderer. */
  sections: ToySection[];
}

export interface Section {
  id: number;
  height: number | string;
  diameter: number | string;
  circumference?: number | null;
}

export interface ToyPayload {
  brand: string;
  name: string;
  size: string;
  color: string;
  insertableLength: number | null;
  topShape: string;
  bottomShape: string;
  sections: Section[];
}

// ---------- Bulk import/export envelope ----------

export interface ExportEnvelope {
  version: number;
  exported_at: string;
  toys: unknown[];
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
