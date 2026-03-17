import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith("/signin") || 
                     request.nextUrl.pathname.startsWith("/signup");
                     
  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");

  // Check auth session
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (isDashboardPage && !session) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup"],
};
