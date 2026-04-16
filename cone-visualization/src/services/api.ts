import { API_CONFIG } from '../config';

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

  getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Basic ${btoa(`${API_CONFIG.auth.username}:${API_CONFIG.auth.password}`)}`
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  async handleResponse(response: Response): Promise<unknown> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.message || 'API request failed',
        response.status,
        error
      );
    }
    return response.json();
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseURL}${endpoint}`;
    const mergedOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };
    try {
      const response = await fetch(url, mergedOptions);
      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 0, error);
    }
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
