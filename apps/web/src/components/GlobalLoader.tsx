import { useEffect, useState, useSyncExternalStore } from 'react';
import { getPendingCount, subscribeLoading } from '../lib/loading';

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 350;

export function useGlobalLoading() {
  const pending = useSyncExternalStore(subscribeLoading, getPendingCount, getPendingCount);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pending > 0 && !visible) {
      const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    if (pending === 0 && visible) {
      const t = window.setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [pending, visible]);

  return visible;
}

export function GlobalLoader({ visible }: { visible: boolean }) {
  return (
    <div className={`global-loader${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <div className="global-loader-bar" />
      <div className="global-loader-spinner" role="status">
        <span className="sr-only">Carregando…</span>
      </div>
    </div>
  );
}
