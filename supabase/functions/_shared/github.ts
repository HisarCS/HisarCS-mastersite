// ============================================================================
// Shared GitHub App auth for the org-membership functions.
//
// A GitHub App authenticates as itself with a short-lived RS256 JWT signed by
// its private key, then trades that for an installation token scoped to the org.
//
// Secrets:
//   GH_APP_ID, GH_APP_INSTALLATION_ID, GH_APP_PRIVATE_KEY (full PKCS#8 PEM)
//   ORG_LOGIN (optional, defaults to "HisarCS")
// ============================================================================

export const ORG = Deno.env.get('ORG_LOGIN') ?? 'HisarCS';

const UA = 'ideaLab-org-membership';

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

const b64url = (data: Uint8Array | string): string => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

async function appJwt(): Promise<string> {
  const appId = Deno.env.get('GH_APP_ID');
  const pem = Deno.env.get('GH_APP_PRIVATE_KEY');
  if (!appId || !pem) throw new Error('missing GH_APP_ID / GH_APP_PRIVATE_KEY');

  const now = Math.floor(Date.now() / 1000);
  // clock-skew guard: backdate iat 60s; GitHub caps exp at 10 min
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${b64url(sig)}`;
}

export async function installationToken(): Promise<string> {
  const installId = Deno.env.get('GH_APP_INSTALLATION_ID');
  if (!installId) throw new Error('missing GH_APP_INSTALLATION_ID');
  const res = await fetch(
    `https://api.github.com/app/installations/${installId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await appJwt()}`,
        accept: 'application/vnd.github+json',
        'user-agent': UA,
      },
    },
  );
  if (!res.ok) throw new Error(`installation token failed: ${res.status} ${await res.text()}`);
  return (await res.json()).token as string;
}

// active | pending | none — one user's membership. GitHub returns 200 or 404.
export async function orgMembershipState(login: string, token: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/orgs/${ORG}/memberships/${encodeURIComponent(login)}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': UA,
      },
    },
  );
  if (res.status === 404) return 'none';
  if (!res.ok) throw new Error(`membership check failed: ${res.status} ${await res.text()}`);
  return (await res.json()).state as string;
}
