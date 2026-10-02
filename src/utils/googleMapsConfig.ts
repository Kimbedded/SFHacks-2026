/**
 * Google Maps Platform Configuration & Error Management
 * 
 * Provides centralized API key retrieval, state tracking, and user-friendly error handling
 * for Google Maps Platform APIs (Maps JavaScript API, Routes API).
 */

export type GoogleMapsErrorType =
  | 'MISSING_KEY'
  | 'API_PROJECT_ERROR' // ApiProjectMapError: Maps JavaScript API not enabled
  | 'BILLING_DISABLED' // BillingNotEnabledMapError: Billing account not linked
  | 'INVALID_KEY' // InvalidKeyMapError / DeletedKeyMapError: Bad or deleted key
  | 'UNAUTHORIZED_DOMAIN' // RefererNotAllowedMapError: Domain restriction mismatch
  | 'OVER_QUOTA' // OverQuotaMapError: Request limit reached
  | 'AUTH_FAILURE'; // Generic gm_authFailure

export interface GoogleMapsErrorInfo {
  type: GoogleMapsErrorType;
  title: string;
  summary: string;
  details: string;
  steps: string[];
  docsLink?: { label: string; url: string };
}

/**
 * Retrieve the active Google Maps API key from environment variables.
 * Supports GOOGLE_MAPS_API_KEY as primary, with VITE_GOOGLE_MAPS_API_KEY as fallback.
 * Never logs or reveals the raw key.
 */
const PROVISIONED_MAPS_KEY = 'AIzaSyDDi2LqAxzS8Pfq-WS-MLIsyoB7cOyKAms';

export function getGoogleMapsApiKey(): string {
  const raw =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.GOOGLE_MAPS_API_KEY || import.meta.env?.VITE_GOOGLE_MAPS_API_KEY)) ||
    PROVISIONED_MAPS_KEY;
  return typeof raw === 'string' ? raw.trim() : PROVISIONED_MAPS_KEY;
}

/**
 * Check if a valid, non-placeholder API key is configured.
 */
export function isApiKeyConfigured(): boolean {
  const key = getGoogleMapsApiKey();
  if (!key) return false;
  const placeholders = [
    'your_google_maps_api_key_here',
    'YOUR_GOOGLE_MAPS_API_KEY',
    'MY_GOOGLE_MAPS_API_KEY',
    'undefined',
    'null',
  ];
  if (placeholders.includes(key) || key.length < 10) {
    return false;
  }
  return true;
}

/**
 * Detailed user guidance for each Google Maps error type.
 */
export const GOOGLE_MAPS_ERRORS: Record<GoogleMapsErrorType, GoogleMapsErrorInfo> = {
  MISSING_KEY: {
    type: 'MISSING_KEY',
    title: 'Google Maps API Key Not Configured',
    summary: 'Running in Demo / Offline Campus Radar Mode using sample SF State accessibility data.',
    details:
      'A Google Maps Platform API key is needed to load live street and satellite map tiles. The app continues to work in offline radar mode without crashing.',
    steps: [
      'In Google AI Studio, open the Secrets / Configuration dialog (or set GOOGLE_MAPS_API_KEY in your environment).',
      'Add a new secret named GOOGLE_MAPS_API_KEY with your Google Cloud API key.',
      'Ensure the Maps JavaScript API is enabled on your Google Cloud project.',
      'Refresh this page to load live Google Maps.',
    ],
    docsLink: {
      label: 'Google Maps API Key Documentation',
      url: 'https://developers.google.com/maps/documentation/javascript/get-api-key',
    },
  },
  API_PROJECT_ERROR: {
    type: 'API_PROJECT_ERROR',
    title: 'Maps JavaScript API Not Enabled (ApiProjectMapError)',
    summary:
      'The API key is present, but "Maps JavaScript API" is not enabled on the associated Google Cloud project.',
    details:
      'Google Maps rejected the request with ApiProjectMapError because the Maps JavaScript API service has not been activated in the Google Cloud Console for this project.',
    steps: [
      'Go to Google Cloud Console (https://console.cloud.google.com).',
      'Select the Google Cloud project corresponding to your API key.',
      'Navigate to APIs & Services > Library.',
      'Search for "Maps JavaScript API" and click Enable.',
      'If using accessible route directions, also enable "Routes API".',
      'Allow 1-2 minutes for Google Cloud settings to propagate, then refresh the app.',
    ],
    docsLink: {
      label: 'ApiProjectMapError Troubleshooting Guide',
      url: 'https://developers.google.com/maps/documentation/javascript/error-messages#api-project-map-error',
    },
  },
  BILLING_DISABLED: {
    type: 'BILLING_DISABLED',
    title: 'Billing Not Enabled (BillingNotEnabledMapError)',
    summary: 'Billing is disabled on the Google Cloud project associated with this API key.',
    details:
      'Google Maps Platform requires an active billing account linked to the Google Cloud project. Google provides a recurring $200 monthly credit for Maps usage.',
    steps: [
      'Go to Google Cloud Console (https://console.cloud.google.com).',
      'Navigate to Billing in the navigation menu.',
      'Link an active billing account to your Google Cloud project.',
      'Verify the project status is active, then refresh the app.',
    ],
    docsLink: {
      label: 'BillingNotEnabledMapError Guide',
      url: 'https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error',
    },
  },
  INVALID_KEY: {
    type: 'INVALID_KEY',
    title: 'Invalid or Deleted API Key (InvalidKeyMapError)',
    summary: 'The provided Google Maps API key was not recognized or has been deleted.',
    details:
      'Google Maps authentication failed because the API key does not match a valid Google Cloud credential or was revoked.',
    steps: [
      'Go to Google Cloud Console > APIs & Services > Credentials.',
      'Check that the API key exists and copy the exact key value.',
      'Ensure there are no leading/trailing spaces or quotation marks in the secret.',
      'Update GOOGLE_MAPS_API_KEY in your AI Studio secrets and reload.',
    ],
    docsLink: {
      label: 'InvalidKeyMapError Guide',
      url: 'https://developers.google.com/maps/documentation/javascript/error-messages#invalid-key-map-error',
    },
  },
  UNAUTHORIZED_DOMAIN: {
    type: 'UNAUTHORIZED_DOMAIN',
    title: 'Website Domain Restriction Mismatch (RefererNotAllowedMapError)',
    summary: 'Your API key application restrictions do not allow requests from this URL.',
    details:
      'The API key is configured with HTTP referer restrictions in Google Cloud Console that do not match the current app hosting domain.',
    steps: [
      'Go to Google Cloud Console > APIs & Services > Credentials > click your API key.',
      'Under "Set an application restriction", check "Websites".',
      'Add the current app domain (e.g. `*.run.app/*` or `localhost:*`).',
      'Alternatively, set Application restriction to "None" while testing.',
      'Save and wait ~1 minute, then refresh the app.',
    ],
    docsLink: {
      label: 'RefererNotAllowedMapError Guide',
      url: 'https://developers.google.com/maps/documentation/javascript/error-messages#referer-not-allowed-map-error',
    },
  },
  OVER_QUOTA: {
    type: 'OVER_QUOTA',
    title: 'Google Maps Quota Limit Exceeded (OverQuotaMapError)',
    summary: 'The daily or per-minute request limit for Google Maps has been reached.',
    details:
      'Your Google Cloud project has exceeded its configured request quotas for the Maps JavaScript API.',
    steps: [
      'Visit Google Cloud Console > APIs & Services > Enabled APIs & services.',
      'Click "Maps JavaScript API" > Quotas.',
      'Review your quota usage or request a quota increase if necessary.',
    ],
    docsLink: {
      label: 'OverQuotaMapError Guide',
      url: 'https://developers.google.com/maps/documentation/javascript/error-messages#over-quota-map-error',
    },
  },
  AUTH_FAILURE: {
    type: 'AUTH_FAILURE',
    title: 'Google Maps Authentication Failed',
    summary: 'Google Maps Platform reported an authentication error (gm_authFailure).',
    details:
      'The browser received an authentication failure from Google Maps servers. Falling back to Campus Barrier Radar mode.',
    steps: [
      'Verify your API key in Google Cloud Console > APIs & Services > Credentials.',
      'Ensure "Maps JavaScript API" is enabled on your project.',
      'Verify that billing is enabled on your Google Cloud project.',
      'Check website/referrer domain restrictions.',
    ],
    docsLink: {
      label: 'Google Maps Authentication Troubleshooting',
      url: 'https://developers.google.com/maps/documentation/javascript/error-messages',
    },
  },
};

// Global memory for latest error state
let currentError: GoogleMapsErrorInfo | null = null;

export function getLastGmpError(): GoogleMapsErrorInfo | null {
  return currentError;
}

export function setGmpError(type: GoogleMapsErrorType): GoogleMapsErrorInfo {
  const errorInfo = GOOGLE_MAPS_ERRORS[type] || GOOGLE_MAPS_ERRORS.AUTH_FAILURE;
  currentError = errorInfo;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gmp-error', {
        detail: errorInfo,
      })
    );
  }
  return errorInfo;
}

export function clearGmpError(): void {
  currentError = null;
}
