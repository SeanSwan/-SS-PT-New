/**
 * SCRIPT: local frontend server guard
 * PURPOSE: Shared QA launcher helpers for selecting and cleaning up local Vite
 * frontend ports without accidentally targeting a stale server.
 * SAFETY: Probes the same loopback host Playwright uses and treats a Vite child
 * exit before readiness as a hard failure.
 */

import { spawnSync } from 'node:child_process';
import net from 'node:net';

const LOCAL_FRONTEND_HOST = '127.0.0.1';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function frontendProcessExited(child) {
  return Boolean(child) && (child.exitCode !== null || child.signalCode !== null);
}

export function canListenOnFrontendPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host: LOCAL_FRONTEND_HOST, exclusive: true });
  });
}

function canConnectToFrontendPort(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: LOCAL_FRONTEND_HOST });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

export async function chooseFrontendPort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await canListenOnFrontendPort(port)) return port;
  }

  throw new Error(`No open frontend port found from ${startPort} to ${startPort + 19}`);
}

export async function waitForOwnedFrontendPort(port, child, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (frontendProcessExited(child)) {
      throw new Error(`Frontend server exited before becoming ready on port ${port}`);
    }

    if (await canConnectToFrontendPort(port)) {
      await delay(100);
      if (frontendProcessExited(child)) {
        throw new Error(`Frontend server exited before becoming ready on port ${port}`);
      }
      return;
    }

    await delay(250);
  }
  throw new Error(`Frontend server did not become ready on port ${port}`);
}

function stopWindowsProcessTree(pid) {
  return spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
    encoding: 'utf8',
  }).status === 0;
}

function shouldUseWindowsTreeKill(child) {
  return process.platform === 'win32' && Boolean(child?.pid);
}

export function frontendProcessIsRunning(child) {
  return Boolean(child) && !child.killed && !frontendProcessExited(child);
}

function stopFrontendProcess(child) {
  if (shouldUseWindowsTreeKill(child) && stopWindowsProcessTree(child.pid)) return;
  child.kill('SIGTERM');
}

export function cleanupFrontendProcess(child) {
  if (frontendProcessIsRunning(child)) stopFrontendProcess(child);
}
