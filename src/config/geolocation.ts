import { byBuild } from '../utils/AppEnvironment';

/**
 * Where the app keeps its browser-position state. It only asks the browser when `request` is set,
 * stores the answer in `answer` and reloads the home page. The with-bugs build keeps both in
 * sessionStorage, the fixed build in localStorage (docs/app-versions.md, B9).
 */
export const GEOLOCATION_SESSION_KEYS = {
  request: 'RETRIEVE_GEOLOCATION',
  answer: 'GEO_LOCATION',
  storage: byBuild<'sessionStorage' | 'localStorage'>({ fixed: 'localStorage', default: 'sessionStorage' }),
} as const;
