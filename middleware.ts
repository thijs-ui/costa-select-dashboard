import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase'

export async function middleware(request: NextRequest) {
  console.log('MIDDLEWARE HIT')

  const adminPaths = [
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

  const isAdminRoute = adminPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
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

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const svc = createServiceClient()

  const { data } = await svc
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (data?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
