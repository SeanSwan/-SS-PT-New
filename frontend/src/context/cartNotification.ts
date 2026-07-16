/** Creates the short-lived, accessible cart status notification. */
export const showCartNotification = (
  message: string,
  type: 'success' | 'error' = 'success',
): void => {
  if (typeof document === 'undefined') return;

  const notification = document.createElement('div');
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');
  notification.style.cssText = `
    position: fixed;
    top: max(76px, calc(env(safe-area-inset-top) + 12px));
    right: max(12px, env(safe-area-inset-right));
    width: max-content;
    max-width: min(360px, calc(100vw - 24px));
    box-sizing: border-box;
    background: ${type === 'success'
      ? 'linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--accent-primary, #60C0F0))'
      : 'linear-gradient(135deg, var(--danger, #EF4444), var(--wing-purple, #8B5CF6))'};
    color: var(--text-primary, #E0ECF4);
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
    padding: 0.75rem 0.875rem;
    border-radius: 10px;
    font: 600 0.9rem/1.35 "Sora", "Plus Jakarta Sans", sans-serif;
    z-index: var(--z-toast, 1300);
    box-shadow: 0 12px 30px color-mix(in srgb, var(--wing-purple, #8B5CF6) 24%, transparent);
    transform: translateY(-12px);
    opacity: 0;
    transition: opacity 0.22s ease, transform 0.22s ease;
    overflow-wrap: anywhere;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  window.setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  }, 100);

  window.setTimeout(() => {
    notification.style.transform = 'translateY(-12px)';
    notification.style.opacity = '0';
    window.setTimeout(() => notification.remove(), 300);
  }, 3000);
};
