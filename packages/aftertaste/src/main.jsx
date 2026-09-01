/**
 * main.jsx — the React root. Nothing game-specific lives here on purpose.
 *
 * TEACHING NOTE: this file runs ONCE. Everything that happens 60 times a second lives inside
 * <Canvas> (see App.jsx). Keeping the one-time setup and the per-frame work in different files is
 * the habit that stops a game from getting tangled later.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
