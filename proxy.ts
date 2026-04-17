import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isAdminRoute = ADMIN_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  if (!isAdminRoute) {
    return NextResponse.next()
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (data?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
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
