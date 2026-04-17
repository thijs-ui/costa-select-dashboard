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

  // Session response die cookies kan bijwerken tijdens auth.getUser()
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

  if (!user) {
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.getAll().forEach(c =>
      redirect.cookies.set(c)
    )
    return redirect
  }

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (data?.role !== 'admin') {
    const redirect = NextResponse.redirect(new URL('/', request.url))
    response.cookies.getAll().forEach(c =>
      redirect.cookies.set(c)
    )
    return redirect
  }

  return response
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
