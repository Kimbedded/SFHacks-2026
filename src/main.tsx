import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setGmpError, getLastGmpError } from './utils/googleMapsConfig';

// Intercept Google Maps Platform Authentication & Runtime Errors
(window as any).gm_authFailure = () => {
  // If an exact error code wasn't already caught by console.error, set generic AUTH_FAILURE
  if (!getLastGmpError()) {
    setGmpError('AUTH_FAILURE');
  }
};

const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');

  if (msg.includes('ApiProjectMapError')) {
    setGmpError('API_PROJECT_ERROR');
  } else if (msg.includes('BillingNotEnabledMapError')) {
    setGmpError('BILLING_DISABLED');
  } else if (msg.includes('InvalidKeyMapError') || msg.includes('DeletedKeyMapError')) {
    setGmpError('INVALID_KEY');
  } else if (msg.includes('RefererNotAllowedMapError')) {
    setGmpError('UNAUTHORIZED_DOMAIN');
  } else if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    setGmpError('OVER_QUOTA');
  } else if (msg.includes('MissingKeyMapError')) {
    setGmpError('MISSING_KEY');
  }
};

createRoot(document.getElementById('root')!).render(<App />);
