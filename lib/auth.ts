const SESSION_PAYLOAD = 'authenticated'

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(SESSION_PAYLOAD))
  const b64 = Buffer.from(sig).toString('base64url')
  return `${SESSION_PAYLOAD}.${b64}`
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const dot = token.indexOf('.')
    if (dot === -1) return false
    const payload = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)
    if (payload !== SESSION_PAYLOAD) return false
    const enc = new TextEncoder()
    const key = await getKey(secret)
    const sig = Buffer.from(sigB64, 'base64url')
    return await crypto.subtle.verify('HMAC', key, sig, enc.encode(payload))
  } catch {
    return false
  }
}
