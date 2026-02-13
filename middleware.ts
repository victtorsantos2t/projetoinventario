import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // IMPORTANTE: getUser() é mais seguro que getSession() no middleware
    const { data: { user } } = await supabase.auth.getUser()

    console.log(`[Middleware] Path: ${request.nextUrl.pathname} | User: ${user ? user.email : 'None'}`)

    const isAuthPage = request.nextUrl.pathname.startsWith('/login')
    const isPublicPage = isAuthPage || request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.startsWith('/favicon.ico')

    // Se NÃO estiver logado e NÃO for página pública -> Redireciona para Login
    if (!user && !isPublicPage) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Se ESTIVER logado e tentar acessar Login -> Redireciona para Home
    if (user && isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
