import { API_CONFIG } from '../config';
import { refreshAccessToken, tokenStorage } from './auth';

const TOYS_ENDPOINT = '/toys/toys';

interface Section {
  id: number;
  height: number | string;
  diameter: number | string;
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

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private buildHeaders(extra?: HeadersInit): HeadersInit {
    const headers = new Headers(extra);
    const token = tokenStorage.getAccess();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
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

  async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseURL}${endpoint}`;
    const doFetch = () =>
      fetch(url, { ...options, headers: this.buildHeaders(options.headers) });

    let response: Response;
    try {
      response = await doFetch();
    } catch (error) {
      throw new APIError('Network error', 0, error);
    }

    if (response.status === 401 && tokenStorage.getRefresh()) {
      const newAccess = await refreshAccessToken();
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
  topShape: string;
  sections: Section[];
}

const transformToyForAPI = (toy: ToyPayload) => ({
  brand: toy.brand,
  name: toy.name,
  size: toy.size,
  color: toy.color,
  shape: {
    top_section_shape: toy.topShape.toUpperCase(),
    sections: toy.sections.map((s, idx) => ({
      order: idx,
      height: parseFloat(String(s.height)),
      diameter: parseFloat(String(s.diameter)),
    })),
  },
});

const apiClient = new APIClient(API_CONFIG.baseUrl);

export const fetchCones = () =>
  apiClient.request(`${TOYS_ENDPOINT}/`);

export const deleteToy = (id: number | string) =>
  apiClient.request(`${TOYS_ENDPOINT}/${id}/`, {
    method: 'DELETE',
  });

export const createToy = (toy: ToyPayload) =>
  apiClient.request(`${TOYS_ENDPOINT}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformToyForAPI(toy)),
  });

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
