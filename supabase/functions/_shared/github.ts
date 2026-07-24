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

// Base64-decode a PEM body (any label) to its DER bytes.
function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

// DER length encoding (short form < 128, else long form).
function derLen(n: number): number[] {
  if (n < 0x80) return [n];
  const out: number[] = [];
  for (let x = n; x > 0; x >>= 8) out.unshift(x & 0xff);
  return [0x80 | out.length, ...out];
}

// Wrap content in a DER TLV (tag + length + value).
function derTLV(tag: number, content: Uint8Array): Uint8Array {
  const len = derLen(content.length);
  const out = new Uint8Array(1 + len.length + content.length);
  out[0] = tag;
  out.set(len, 1);
  out.set(content, 1 + len.length);
  return out;
}

// GitHub issues App private keys in PKCS#1 (`BEGIN RSA PRIVATE KEY`), but
// WebCrypto's importKey only accepts PKCS#8 (`BEGIN PRIVATE KEY`). Wrap a PKCS#1
// RSAPrivateKey in the fixed PKCS#8 PrivateKeyInfo envelope (version +
// rsaEncryption AlgorithmIdentifier + the key as an OCTET STRING) so either
// export works with no manual openssl step.
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
  const rsaAlg = new Uint8Array([ // SEQUENCE { OID rsaEncryption, NULL }
    0x30,
    0x0d,
    0x06,
    0x09,
    0x2a,
    0x86,
    0x48,
    0x86,
    0xf7,
    0x0d,
    0x01,
    0x01,
    0x01,
    0x05,
    0x00,
  ]);
  const keyOctet = derTLV(0x04, pkcs1); // OCTET STRING wrapping the PKCS#1 DER
  const body = new Uint8Array(version.length + rsaAlg.length + keyOctet.length);
  body.set(version, 0);
  body.set(rsaAlg, version.length);
  body.set(keyOctet, version.length + rsaAlg.length);
  return derTLV(0x30, body); // SEQUENCE
}

// Return PKCS#8 DER as a plain ArrayBuffer for WebCrypto's importKey, from
// either PKCS#1 or PKCS#8 input. (Copy into a fresh ArrayBuffer so the type is
// unambiguously ArrayBuffer, not ArrayBufferLike.)
function pemToPkcs8(pem: string): ArrayBuffer {
  const der = pemToDer(pem);
  const bytes = pem.includes('BEGIN RSA PRIVATE KEY') ? pkcs1ToPkcs8(der) : der;
  const out = new ArrayBuffer(bytes.length);
  new Uint8Array(out).set(bytes);
  return out;
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
