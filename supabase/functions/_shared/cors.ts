// CORS headers for browser calls. The member area (hisarcs.github.io, and
// localhost in dev) is a different origin from the Supabase functions host, so
// every response — including errors and the preflight — must carry these or the
// browser blocks it. '*' is safe here: the function authenticates the caller
// from their JWT, not from the origin.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
