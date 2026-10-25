import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LEGACY_REDIRECTS } from './lib/legacy-redirects'

function normalizePath(path: string): string {
  try {
    const decoded = decodeURIComponent(path)
    const doubleDecoded = decoded !== path ? decodeURIComponent(decoded) : decoded
    return doubleDecoded.trim()
  } catch {
    return path.trim()
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/catalog/')) {
    return NextResponse.next()
  }

  const normalizedPath = normalizePath(pathname)

  if (LEGACY_REDIRECTS.has(normalizedPath)) {
    const canonicalPath = LEGACY_REDIRECTS.get(normalizedPath)!
    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    return NextResponse.redirect(url, 308)
  }

  if (LEGACY_REDIRECTS.has(pathname)) {
    const canonicalPath = LEGACY_REDIRECTS.get(pathname)!
    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    return NextResponse.redirect(url, 308)
  }

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/check-redirect?path=${encodeURIComponent(normalizedPath)}`, {
      method: 'GET',
      headers: { 'x-middleware': 'true' },
      signal: AbortSignal.timeout(500),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.redirect) {
        const url = request.nextUrl.clone()
        url.pathname = data.redirect
        return NextResponse.redirect(url, 308)
      }
    }
  } catch (err) {
    console.error('Dynamic redirect check failed:', err)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/catalog/:path*',
}
