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

const transformConeForAPI = (brand: string, name: string, size: string, sections: Section[], topShape: string) => ({
  name,
  brand,
  size,
  shape: {
    sections: sections.map(section => ({
      order: section.id,
      height: parseFloat(String(section.height)),
      diameter: parseFloat(String(section.diameter))
    })),
    top_section_shape: topShape.toUpperCase()
  }
});

const apiClient = new APIClient(API_CONFIG.baseUrl);

export const fetchCones = () =>
  apiClient.request(`${TOYS_ENDPOINT}/`);

export const deleteToy = (id: number | string) =>
  apiClient.request(`${TOYS_ENDPOINT}/${id}/`, {
    method: 'DELETE',
  });

export const saveCone = (toyBrand: string, coneName: string, toySize: string, coneSections: Section[], topShape: string) => {
  const transformedData = transformConeForAPI(toyBrand, coneName, toySize, coneSections, topShape);

  return apiClient.request(`${TOYS_ENDPOINT}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformedData)
  });
};
