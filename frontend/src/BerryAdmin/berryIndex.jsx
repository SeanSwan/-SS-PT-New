/**
 * berryIndex.jsx
 * Entry point for BerryAdmin dashboard that configures providers
 */
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SnackbarProvider } from 'notistack';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Project imports
import { store, persister } from '../store';
import BerryApp from './BerryApp';
import { ConfigProvider } from './contexts/ConfigContext';

// Import your Header component
import Header from '../components/Header/header';

// ==============================|| BERRY ADMIN - MAIN ||============================== //

const Berry = () => {
  // Add/remove admin-view class when this component mounts/unmounts
  useEffect(() => {
    document.body.classList.add('admin-view');
    
    return () => {
      document.body.classList.remove('admin-view');
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persister}>
        <ConfigProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <SnackbarProvider 
              maxSnack={3} 
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              autoHideDuration={5000}
            >
              {/* CSS to properly adjust layout while keeping your header */}
              <style>
                {`
                  /* Add padding to the top of the Berry admin container */
                  body.admin-view .berry-admin-container {
                    padding-top: 60px !important; 
                  }
                  
                  /* Adjust the main content area to start after header */
                  body.admin-view main {
                    margin-top: 60px !important;
                    padding-top: 20px !important;
                  }
                  
                  /* Make sidebar start below header */
                  body.admin-view .MuiDrawer-root .MuiDrawer-paper,
                  body.admin-view .MuiDrawer-root .MuiPaper-root {
                    top: 60px !important;
                    height: calc(100vh - 60px) !important;
                  }
                  
                  /* Adjust any Berry AppBar (its internal header) */
                  body.admin-view .MuiAppBar-root {
                    top: 60px !important;
                    z-index: 1100 !important;
                  }
                  
                  /* Ensure proper z-index for your main header */
                  body.admin-view header {
                    z-index: 1200 !important;
                  }
                  
                  /* Fix any scroll issues */
                  body.admin-view {
                    overflow-x: hidden;
                  }
                  
                  /* Make sure nothing pushes content below visible area */
                  body.admin-view #root {
                    padding-top: 0 !important;
                  }
                `}
              </style>
              
              {/* Include your Header component */}
              <Header />
              
              {/* Berry Admin app */}
              <BerryApp />
            </SnackbarProvider>
          </LocalizationProvider>
        </ConfigProvider>
      </PersistGate>
    </Provider>
  );
};

export default Berry;