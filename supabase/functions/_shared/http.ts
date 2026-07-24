// Small JSON response helper shared across the edge functions. Carries the CORS
// headers so browser callers can read every response, including errors.
import { corsHeaders } from './cors.ts';

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
