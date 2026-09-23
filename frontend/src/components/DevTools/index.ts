// D-03 fix (hostile review, fixing pass): this barrel used to re-export
// ./DevTools (default), ./DevLoginPanel and ./ApiDebugger. Importing ANY name
// from a barrel statically pulls every re-export into the module graph, so
// `import { DevToolsProvider } from './components/DevTools'` in App.tsx
// dragged DevTools.tsx — which statically imports DevLogin.tsx (reads
// VITE_DEV_*) — straight into the production bundle, defeating the lazy
// import.meta.env.DEV gates DevToolsProvider applies internally.
//
// DevToolsProvider is the only export the production import graph needs, and
// it is the one that is itself correctly gated. DevTools.tsx remains
// reachable through routes/debug-routes.tsx, which is dev-lazy.
export { default as DevToolsProvider } from './DevToolsProvider';
