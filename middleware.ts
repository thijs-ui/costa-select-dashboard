import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Diagnostic: crash-vrije redirect. Geen Supabase, geen env-vars.
  console.log('[middleware] path:', request.nextUrl.pathname)
  return NextResponse.redirect(new URL('/', request.url))
}

export const config = {
  matcher: [
    '/deals/:path*',
    '/agentschappen/:path*',
    '/partners/:path*',
    '/dossier/:path*',
    '/makelaars/:path*',
    '/commissies/:path*',
    '/pl/:path*',
    '/regios/:path*',
    '/maandkosten/:path*',
    '/bonnen/:path*',
    '/funnel/:path*',
    '/afspraken/:path*',
    '/aannames/:path*',
    '/pipedrive/:path*'
  ]
}
