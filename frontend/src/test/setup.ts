import '@testing-library/jest-dom';

const noop = () => {};
const originalConsoleWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
  const [firstArg] = args;
  if (
    typeof firstArg === 'string' &&
    firstArg.startsWith('⚠️ React Router Future Flag Warning:')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

if ('HTMLCanvasElement' in globalThis) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(type: string) {
      if (type !== '2d') return null;
      return {
        arc: noop,
        beginPath: noop,
        clearRect: noop,
        closePath: noop,
        createLinearGradient: () => ({ addColorStop: noop }),
        drawImage: noop,
        ellipse: noop,
        fill: noop,
        fillRect: noop,
        fillText: noop,
        lineTo: noop,
        measureText: () => ({ width: 0 }),
        moveTo: noop,
        restore: noop,
        rotate: noop,
        save: noop,
        scale: noop,
        setLineDash: noop,
        stroke: noop,
        translate: noop,
      };
    },
  });
}

if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // @ts-expect-error - mock browser API for jsdom
  globalThis.IntersectionObserver = IntersectionObserverMock;
}
