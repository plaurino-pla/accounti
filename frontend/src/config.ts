// Configuration for different environments
const config = {
  development: {
    apiUrl: 'http://localhost:5001'
  },
  production: {
    apiUrl: 'https://us-central1-accounti-4698b.cloudfunctions.net/api'
  }
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Export the appropriate config
export const API_BASE_URL = config[environment as keyof typeof config].apiUrl; 