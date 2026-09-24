import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

// Opt-in integration check. Always initializes its OWN empty PGDATA and port.
// No application config, .env loader, existing cluster or production URL is read.
const pgBin = process.env.DATA_SAFETY_PG_BIN;
const moduleRoot = process.env.DATA_SAFETY_SEQUELIZE_ROOT;
test('gallery repair preserves rows, supplies model-compatible defaults, and is repeatable in PostgreSQL', {
  skip: !pgBin || !moduleRoot, timeout: 60000,
}, async () => {
  const root = mkdtempSync(join(tmpdir(), 'gallery-repair-pg-'));
  const data = join(root, 'data');
  const run = (name, args) => spawnSync(join(pgBin, name + (process.platform === 'win32' ? '.exe' : '')), args, { encoding: 'utf8', windowsHide: true, timeout: 25000 });
  let db; let started = false;
  try {
    const init = run('initdb', ['-D', data, '-U', 'fixture', '--auth=trust', '--no-locale', '--encoding=UTF8']);
    assert.equal(init.status, 0, init.stderr);
    const listener = createServer();
    await new Promise((ok, fail) => { listener.once('error', fail); listener.listen(0, '127.0.0.1', ok); });
    const port = listener.address().port;
    await new Promise(ok => listener.close(ok));
    const start = run('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -F`, '-w', '-t', '15', 'start']);
    started = start.status === 0;
    assert.equal(start.status, 0, start.stderr);
    const dep = createRequire(join(resolve(moduleRoot), 'package.json'));
    const { Sequelize } = dep('sequelize');
    db = new Sequelize('postgres', 'fixture', '', { host: '127.0.0.1', port, dialect: 'postgres', logging: false });
    const qi = db.getQueryInterface();
    const local = createRequire(import.meta.url);
    const migration = name => local(`../../backend/migrations/${name}`);
    await qi.createTable('Users', { id: { type: Sequelize.INTEGER, primaryKey: true } });
    await migration('20260308-add-enhancement-credits.cjs').up(qi, Sequelize);
    await migration('20260308-add-gallery-visitor-user-link.cjs').up(qi, Sequelize);
    await migration('20260308-create-gallery-tables.cjs').up(qi, Sequelize);
    await db.query("INSERT INTO gallery_events (id,name,slug,password_hash) VALUES (1,'Fixture','fixture','synthetic')");
    await db.query("INSERT INTO gallery_visitors (id,email,event_id) VALUES (1,'fixture@example.invalid',1)");
    const repair = migration('20260924000001-repair-skipped-gallery-columns.cjs');
    await repair.up(qi, Sequelize);
    await repair.up(qi, Sequelize);
    const [rows] = await db.query('SELECT enhancement_credits,is_vip,free_enhancements_used,user_id FROM gallery_visitors WHERE id=1');
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], { enhancement_credits: 0, is_vip: false, free_enhancements_used: {}, user_id: null });
    await assert.rejects(db.query('UPDATE gallery_visitors SET user_id=999 WHERE id=1'), /foreign key/i);
    const indexes = await qi.showIndex('gallery_visitors');
    assert.equal(indexes.filter(x => x.name === 'idx_gallery_visitors_user_id').length, 1);
  } finally {
    if (db) await db.close();
    let stopped = true;
    if (started || existsSync(join(data, 'postmaster.pid'))) stopped = run('pg_ctl', ['-D', data, '-w', '-t', '15', '-m', 'fast', 'stop']).status === 0;
    assert.equal(stopped, true, 'Scratch server did not stop; directory retained for inspection');
    assert.equal(dirname(root), resolve(tmpdir())); assert.ok(basename(root).startsWith('gallery-repair-pg-'));
    rmSync(root, { recursive: true, force: true });
  }
});
