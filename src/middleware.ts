import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LEGACY_REDIRECTS } from './lib/legacy-redirects'

function normalizePath(path: string): string {
  try {
    // Decode URL-encoded characters
    const decoded = decodeURIComponent(path)
    // Normalize multiple decoding attempts (handles double-encoding)
    const doubleDecoded = decoded !== path ? decodeURIComponent(decoded) : decoded
    return doubleDecoded.trim()
  } catch {
    return path.trim()
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only handle /catalog routes
  if (!pathname.startsWith('/catalog/')) {
    return NextResponse.next()
  }

  const normalizedPath = normalizePath(pathname)

  // Check for legacy product URL redirects
  if (LEGACY_REDIRECTS.has(normalizedPath)) {
    const canonicalPath = LEGACY_REDIRECTS.get(normalizedPath)!
    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    // Use 308 Permanent Redirect (preserves HTTP method, more appropriate for product URLs)
    return NextResponse.redirect(url, 308)
  }

  // Also check raw pathname (for already-encoded URLs)
  if (LEGACY_REDIRECTS.has(pathname)) {
    const canonicalPath = LEGACY_REDIRECTS.get(pathname)!
    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/catalog/:path*',
}
