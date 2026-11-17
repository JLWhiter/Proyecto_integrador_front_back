import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { DialogoProvider } from './context/DialogoContext';
import './styles.css';
import './comprobantes.css';
import './theme.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DialogoProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </DialogoProvider>
  </React.StrictMode>
);
