import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { preCacheCampusData } from './utils/offlineCacheManager';

// Register Service Worker with automatic updates for offline accessibility caching
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New GatorAccess navigation updates ready.');
    },
    onOfflineReady() {
      console.log('GatorAccess offline cache is active for low reception zones.');
    },
  });

  // Pre-seed core campus buildings and accessibility reports into Cache API
  preCacheCampusData().catch((err) => console.log('Offline cache seed notice:', err));
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
