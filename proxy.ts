import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    // Auth endpoints are browser-facing — skip API key check
    if (pathname.startsWith('/api/auth/')) return NextResponse.next()
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname === '/login') {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  const secret = process.env.SESSION_SECRET ?? ''
  if (!token || !(await verifySessionToken(token, secret))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
