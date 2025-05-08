// Use your machine's IP address when testing on physical devices
// Use localhost when testing in simulator
export const API_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://your-production-api.com';  // Production 