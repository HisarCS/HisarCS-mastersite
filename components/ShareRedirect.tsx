'use client';

import { useEffect } from 'react';

/** Sends people from a share page to the real page. Bots that don't run
 *  JavaScript stay on the share page and read its preview tags. */
export function ShareRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}
