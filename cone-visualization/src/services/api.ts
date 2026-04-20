import { API_CONFIG } from '../config';
import type { Dimension } from './units';

import type { Shape, ToySection } from 'cone-editor';

// ---------- Auth context: injected by the auth service ----------
//
// api.ts stays ignorant of where tokens live. The auth service registers
// an AuthContext on module load; APIClient calls it to obtain the current
// access token and to ask for a refresh when a request returns 401.

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthContext {
  getAccessToken(): string | null;
  /** Return a new access token (and persist however the caller wants), or null. */
  onUnauthorized(): Promise<string | null>;
}

let authContext: AuthContext | null = null;

export const setAuthContext = (ctx: AuthContext | null): void => {
  authContext = ctx;
};

// ---------- Endpoint paths (single source of truth) ----------

const Endpoint = {
  auth: {
    login: '/toys/token/',
    refresh: '/toys/token/refresh/',
  },
  toys: {
    list: '/toys/toys/',
    detail: (id: number | string) => `/toys/toys/${id}/`,
    export: '/toys/toys/export/',
    import: '/toys/toys/import/',
  },
} as const;

interface Section {
  id: number;
  height: number | string;
  diameter: number | string;
  circumference?: number | null;
}

// ---------- API wire shapes ----------

interface ApiSection {
  id: number;
  height: Dimension;
  diameter: Dimension;
  circumference: Dimension | null;
}

interface ApiCone {
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

// ---------- Domain type used throughout the app ----------

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

const transformApiCone = (cone: ApiCone): Toy => ({
  id: cone.id,
  name: cone.name,
  brand: cone.brand,
  size: cone.size,
  color: cone.color,
  height: cone.height,
  diameter: cone.diameter,
  circumference: cone.circumference,
  insertableLength: cone.insertable_length,
  topShape: cone.shape.top_section_shape.toLowerCase() as Shape,
  bottomShape: (cone.shape.bottom_section_shape || 'flat').toLowerCase() as Shape,
  sections: cone.shape.sections.map((s) => ({
    id: s.id,
    height: s.height.mm,
    diameter: s.diameter.mm,
    circumference: s.circumference?.mm ?? null,
  })),
});

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

class APIClient {
  constructor(private baseURL: string) {}

  // ---------- Verb helpers ----------

  get(endpoint: string): Promise<unknown> {
    return this.fetchAuthed(endpoint, this.jsonInit('GET'));
  }

  delete(endpoint: string): Promise<unknown> {
    return this.fetchAuthed(endpoint, this.jsonInit('DELETE'));
  }

  post(endpoint: string, body?: unknown): Promise<unknown> {
    return this.fetchAuthed(endpoint, this.jsonInit('POST', body));
  }

  /** POST without auth, for endpoints that mint tokens. */
  postUnauth(endpoint: string, body?: unknown): Promise<unknown> {
    return this.fetchRaw(endpoint, this.jsonInit('POST', body));
  }

  // ---------- Internals ----------

  private jsonInit(method: string, body?: unknown): RequestInit {
    const headers = new Headers();
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    return {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    };
  }

  private attachAuth(init: RequestInit): RequestInit {
    const headers = new Headers(init.headers);
    const token = authContext?.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  }

  private async handleResponse(response: Response): Promise<unknown> {
    if (response.status === 204) return null;
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.detail || error.message || 'API request failed',
        response.status,
        error,
      );
    }
    return response.json();
  }

  private async fetchRaw(endpoint: string, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseURL}${endpoint}`, init);
    } catch (error) {
      throw new APIError('Network error', 0, error);
    }
    return this.handleResponse(response);
  }

  private async fetchAuthed(endpoint: string, init: RequestInit): Promise<unknown> {
    const url = `${this.baseURL}${endpoint}`;
    const doFetch = () => fetch(url, this.attachAuth(init));

    let response: Response;
    try {
      response = await doFetch();
    } catch (error) {
      throw new APIError('Network error', 0, error);
    }

    if (response.status === 401 && authContext) {
      const newAccess = await authContext.onUnauthorized();
      if (newAccess) {
        try {
          response = await doFetch();
        } catch (error) {
          throw new APIError('Network error', 0, error);
        }
      }
    }

    return this.handleResponse(response);
  }
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

const transformToyForAPI = (toy: ToyPayload) => ({
  brand: toy.brand,
  name: toy.name,
  size: toy.size,
  color: toy.color,
  insertable_length: toy.insertableLength,
  shape: {
    top_section_shape: toy.topShape.toUpperCase(),
    bottom_section_shape: toy.bottomShape.toUpperCase(),
    sections: toy.sections.map((s, idx) => ({
      order: idx,
      height: parseFloat(String(s.height)),
      diameter: parseFloat(String(s.diameter)),
      circumference: s.circumference ?? null,
    })),
  },
});

const apiClient = new APIClient(API_CONFIG.baseUrl);

// ---------- Token endpoints (no auth header; raw JSON in/out) ----------

export const login = (username: string, password: string): Promise<TokenPair> =>
  apiClient.postUnauth(Endpoint.auth.login, { username, password }) as Promise<TokenPair>;

export const refreshTokens = async (refresh: string): Promise<TokenPair> => {
  const data = (await apiClient.postUnauth(Endpoint.auth.refresh, { refresh })) as TokenPair;
  return { access: data.access, refresh: data.refresh ?? refresh };
};

// ---------- Toy CRUD ----------

export const fetchCones = async (): Promise<Toy[]> => {
  const data = (await apiClient.get(Endpoint.toys.list)) as ApiCone[];
  return data.map(transformApiCone);
};

export const deleteToy = (id: number | string) =>
  apiClient.delete(Endpoint.toys.detail(id));

export const createToy = (toy: ToyPayload) =>
  apiClient.post(Endpoint.toys.list, transformToyForAPI(toy));

/**
 * The DRF serializer doesn't support in-place update of the nested shape, so
 * "edit" is implemented as create-new-then-delete-old. We POST first so a
 * failure leaves the original intact.
 */
export const replaceToy = async (originalId: number, toy: ToyPayload) => {
  const created = await createToy(toy);
  await deleteToy(originalId);
  return created;
};

export interface ExportEnvelope {
  version: number;
  exported_at: string;
  toys: unknown[];
}

const exportToys = () =>
  apiClient.get(Endpoint.toys.export) as Promise<ExportEnvelope>;

const importToys = (envelope: ExportEnvelope) =>
  apiClient.post(Endpoint.toys.import, envelope) as Promise<{ created: number }>;

const triggerBrowserDownload = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const EXPORT_FILENAME = (date: string) => `toy-gallery-${date}.json`;

/** Fetch the full collection and trigger a browser download. */
export const downloadExport = async (): Promise<void> => {
  const payload = await exportToys();
  const date = new Date().toISOString().slice(0, 10);
  triggerBrowserDownload(payload, EXPORT_FILENAME(date));
};

/**
 * Read a JSON file picked by the user and POST it to the import endpoint.
 * Throws `APIError` on server rejection or a `SyntaxError` for malformed JSON.
 */
export const importFromFile = async (file: File): Promise<{ created: number }> => {
  const text = await file.text();
  const envelope = JSON.parse(text) as ExportEnvelope;
  return importToys(envelope);
};
