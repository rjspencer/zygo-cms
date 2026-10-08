import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChangesBlocker(isDirty: boolean) {
  const bypassNext = useRef(false);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypassNext.current) {
      bypassNext.current = false;
      return false;
    }
    return isDirty && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Call right before a programmatic navigation that follows a successful save.
  const allowNextNavigation = () => {
    bypassNext.current = true;
  };

  return { blocker, allowNextNavigation };
}
