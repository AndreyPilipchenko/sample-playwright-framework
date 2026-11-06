/**
 * Where the app keeps its browser-position state in sessionStorage. It only asks the browser when
 * `request` is set, stores the answer in `answer` and reloads the home page.
 */
export const GEOLOCATION_SESSION_KEYS = {
  request: 'RETRIEVE_GEOLOCATION',
  answer: 'GEO_LOCATION',
} as const;
