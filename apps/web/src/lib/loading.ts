let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function beginLoading() {
  pending += 1;
  emit();
}

export function endLoading() {
  pending = Math.max(0, pending - 1);
  emit();
}

export function subscribeLoading(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getPendingCount() {
  return pending;
}
