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
  '/pipedrive',
  '/agentschappen'
]

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/pipedrive/webhook', '/api/woningbot/log', '/api/news/test-scrape']

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Next.js static assets, favicon, etc. nooit gaten dichttimmeren.
  // De matcher-regex blijkt in Next.js 16 niet altijd goed uit te sluiten,
  // dus checken we hier zelf expliciet.
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next()
  }

  // Login en auth-API altijd doorlaten (anders oneindige redirect loop)
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Session-client met cookie-propagatie
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Niet ingelogd → naar /login (met ?from= zodat user post-login terugkomt)
  if (!user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach(c => redirect.cookies.set(c))
    return redirect
  }

  // Op admin-paths ook role-check
  const isAdminRoute = ADMIN_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  if (isAdminRoute) {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (data?.role !== 'admin') {
      const redirect = NextResponse.redirect(new URL('/', request.url))
      response.cookies.getAll().forEach(c => redirect.cookies.set(c))
      return redirect
    }
  }

  return response
}

export const config = {
  matcher: [
    // Alles behalve Next.js static assets en bekende publieke bestanden.
    // /login en /api/auth worden binnen de functie doorgelaten.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'
  ]
}
