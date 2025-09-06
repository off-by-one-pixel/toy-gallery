import { API_CONFIG } from '../config';

const TOYS_ENDPOINT = '/toys/toys';

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  getHeaders(contentType = null) {
    const headers = {
      'Authorization': `Basic ${btoa(`${API_CONFIG.auth.username}:${API_CONFIG.auth.password}`)}`
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  async handleResponse(response) {
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

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    try {
      const response = await fetch(url, options);
      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 0, error);
    }
  }
}

const transformConeForAPI = (brand, name, size, sections, topShape) => ({
  name,
  brand,
  size,
  shape: {
    sections: sections.map(section => ({
      order: section.id,
      height: parseFloat(section.height),
      diameter: parseFloat(section.diameter)
    })),
    top_section_shape: topShape.toUpperCase()
  }
});

const apiClient = new APIClient(API_CONFIG.baseUrl);

/**
 * Fetch all cones
 * @returns {Promise<Array>} List of cones
 */
export const fetchCones = () => 
  apiClient.request(`${TOYS_ENDPOINT}/`);

/**
 * Delete a cone by ID
 * @param {string} id - Cone ID
 * @returns {Promise<Object>} Deleted cone data
 */
export const deleteToy = (id) =>
  apiClient.request(`${TOYS_ENDPOINT}/${id}/`, {
    method: 'DELETE',
    headers: apiClient.getHeaders()
  });

/**
 * Save a new cone
 * @param {string} coneName - Name of the cone
 * @param {Array} coneSections - Array of cone sections
 * @returns {Promise<Object>} Created cone data
 */
export const saveCone = async (toyBrand, coneName, toySize, coneSections, topShape) => {
  const transformedData = transformConeForAPI(toyBrand, coneName, toySize, coneSections, topShape);
  
  return apiClient.request(`${TOYS_ENDPOINT}/`, {
    method: 'POST',
    headers: apiClient.getHeaders('application/json'),
    body: JSON.stringify(transformedData)
  });
};