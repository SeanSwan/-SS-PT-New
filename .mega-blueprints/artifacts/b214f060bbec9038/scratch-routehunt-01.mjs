import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const W = 'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-luna-01a098de-20260913';
const require = createRequire(W + '/backend/package.json');
const express = require('express');
const request = require('supertest');
const imp = p => import(pathToFileURL(W + p).href);
const bootcampRoutes = (await imp('/backend/routes/bootcampRoutes.mjs')).default;
const sprintRoutes = (await imp('/backend/routes/sprintRoutes.mjs')).default;
console.log('express version:', require('express/package.json').version);
const strip = r => { r.stack = r.stack.filter(l => !!l.route); };
strip(bootcampRoutes); strip(sprintRoutes);
const paths = r => r.stack.map(l => Object.keys(l.route.methods).join('|').toUpperCase() + ' ' + l.route.path);
console.log('BOOTCAMP PATHS:', JSON.stringify(paths(bootcampRoutes)));
console.log('SPRINT PATHS:', JSON.stringify(paths(sprintRoutes)));
const app = express(); app.use(express.json());
app.use('/api/bootcamp', bootcampRoutes);        // routes.mjs:439
app.use('/api/bootcamp/sprints', sprintRoutes);  // routes.mjs:440
app.use((req, res) => res.status(499).json({ reached: 'fell-through-both-routers', url: req.originalUrl }));
const targets = [
  ['post', '/api/bootcamp/log'],
  ['post', '/api/bootcamp/class-logs/7/attendance'],
  ['get',  '/api/bootcamp/sprints/1/generate/stream'],
  ['get',  '/api/bootcamp/sprints/1'],
];
for (const [m, p] of targets) {
  let r; try { r = await request(app)[m](p).timeout({ response: 6000, deadline: 8000 }); }
  catch (e) { console.log(m.toUpperCase(), p, '-> THREW', e.message); continue; }
  console.log(m.toUpperCase(), p, '->', r.status, JSON.stringify(r.body).slice(0, 200));
}
process.exit(0);
