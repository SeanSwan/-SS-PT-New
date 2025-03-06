/**
 * berryIndex.jsx
 * Entry point for BerryAdmin dashboard that configures providers
 * Includes Redux store, theme provider, and configuration
 */
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SnackbarProvider } from 'notistack';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Project imports
import { store, persister } from '../store'; // Use the main app store
import BerryApp from './BerryApp';
import { ConfigProvider } from './contexts/ConfigContext';

// ==============================|| BERRY ADMIN - MAIN ||============================== //

const Berry = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persister}>
      <ConfigProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <SnackbarProvider 
            maxSnack={3} 
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            autoHideDuration={5000}
          >
            {/* Hide the main app header/footer when in BerryAdmin */}
            <style>
              {`
                .App > header, 
                .App > footer {
                  display: none !important;
                }
                .App > main {
                  padding: 0 !important;
                  margin: 0 !important;
                }
              `}
            </style>
            <BerryApp />
          </SnackbarProvider>
        </LocalizationProvider>
      </ConfigProvider>
    </PersistGate>
  </Provider>
);

export default Berry;