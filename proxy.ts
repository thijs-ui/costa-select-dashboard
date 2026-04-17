import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_PATHS = [
  '/aannames',
  '/afspraken',
  '/deals',
  '/makelaars',
  '/partners',
  '/commissies',
  '/pl',
  '/regios',
  '/maandkosten',
  '/bonnen',
  '/funnel',
  '/dossier',
  '/pipedrive',
  '/agentschappen'
]

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isAdminRoute = ADMIN_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  console.log('[proxy]', pathname, 'admin?', isAdminRoute)

  if (!isAdminRoute) {
    return NextResponse.next()
  }

  // Diagnostic: crash-vrije redirect, geen Supabase.
  return NextResponse.redirect(new URL('/', request.url))
}

export const proxyConfig = {
  matcher: [
    '/aannames/:path*',
    '/afspraken/:path*',
    '/deals/:path*',
    '/makelaars/:path*',
    '/partners/:path*',
    '/commissies/:path*',
    '/pl/:path*',
    '/regios/:path*',
    '/maandkosten/:path*',
    '/bonnen/:path*',
    '/funnel/:path*',
    '/dossier/:path*',
    '/pipedrive/:path*',
    '/agentschappen/:path*'
  ]
}
