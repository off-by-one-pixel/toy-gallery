// API Configuration
export const API_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    auth: {
        username: process.env.NEXT_PUBLIC_API_USERNAME || 'max',
        password: process.env.NEXT_PUBLIC_API_PASSWORD || 'max'
    }
};
