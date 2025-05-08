declare const __DEV__: boolean;

// Use your machine's IP address when testing on physical devices
// Use localhost when testing in simulator
export const API_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://your-production-api.com';  // Production 

// Configuration options
export const CONFIG = {
  defaultModel: 'gpt-3.5-turbo',
  maxCodeLength: 5000,
  theme: {
    primary: '#00a82d',    // Evernote green
    secondary: '#2196f3',
  },
}; 