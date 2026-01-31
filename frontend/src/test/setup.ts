import '@testing-library/jest-dom';

if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // @ts-expect-error - mock browser API for jsdom
  globalThis.IntersectionObserver = IntersectionObserverMock;
}
