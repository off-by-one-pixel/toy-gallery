// API Configuration
export const API_CONFIG = {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    auth: {
        username: process.env.REACT_APP_API_USERNAME || 'max',
        password: process.env.REACT_APP_API_PASSWORD || 'max'
    }
};
