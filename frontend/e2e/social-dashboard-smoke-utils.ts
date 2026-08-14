import type { Page } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

type FailedResource = {
  failureText?: string;
  status?: number;
  url: string;
};

function isSocketPollingUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  } catch {
    return false;
  }
}

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  const hasFailedSocketPoll = failedResources.some((resource) => (
    isSocketPollingUrl(resource.url)
    && (
      resource.status === 400
      || /ERR_CONNECTION_REFUSED|ERR_FAILED/i.test(resource.failureText || '')
    )
  ));

  if (/\/socket\.io\/.*blocked by CORS/i.test(message)) return true;
  if (/Failed to load resource: net::ERR_FAILED/i.test(message)) return hasFailedSocketPoll;
  if (/Failed to load resource: net::ERR_CONNECTION_REFUSED/i.test(message)) return hasFailedSocketPoll;
  if (!/Failed to load resource: the server responded with a status of 400/i.test(message)) return false;

  return failedResources.some((resource) => resource.status === 400 && isSocketPollingUrl(resource.url));
}

export function watchSocialSmokeConsole(page: Page) {
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];
  const captureConsoleError = (message: string) => {
    consoleErrors.push(message);
  };

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    captureConsoleError(message.text());
  });
  page.on('pageerror', (error) => {
    captureConsoleError(error.message);
  });
  page.on('requestfailed', (request) => {
    failedResources.push({
      failureText: request.failure()?.errorText,
      url: request.url(),
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResources.push({ status: response.status(), url: response.url() });
    }
  });

  return {
    actionableErrors: () => consoleErrors.filter((item) => {
      if (isSuppressedProductNoise(item)) return false;
      if (isKnownRealtimeTransportNoise(item, failedResources)) return false;
      return true;
    }),
  };
}
