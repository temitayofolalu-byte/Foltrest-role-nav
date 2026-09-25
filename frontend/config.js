// Set this to your deployed NestJS API origin when the frontend is hosted separately on Netlify.
// Example: https://api.foltrest.com/api
window.FOLTREST_API_URL = window.FOLTREST_API_URL || (
  ['localhost', '127.0.0.1'].includes(location.hostname)
    ? '/api'
    : 'https://REPLACE_WITH_YOUR_BACKEND_URL/api'
);
