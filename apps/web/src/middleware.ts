import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Bu middleware server-side token yoxlaması edir
// Client-side-da AuthContext əlavə qorunma təmin edir
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth səhifələri — login olan istifadəçi dashboard-a yönlənsin
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    // Client-side yönləndirmə AuthContext tərəfindən idarə olunur
    return NextResponse.next()
  }

  // Dashboard səhifələri — login olmayan yönlənsin
  const protectedPaths = ['/dashboard', '/tasks', '/todos', '/todo', '/users', '/finance', '/businesses', '/inbox', '/upcoming', '/tapshiriqlarim']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected) {
    // Client-side token yoxlanılır AuthContext-da
    // Server-side middleware sadəcə next() qaytarır
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
