import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const protectedPaths = [
  "/dashboard",
  "/collection",
  "/storage",
  "/add",
  "/imports",
  "/settings",
  "/subscribe",
  "/decks",
  "/analytics",
];

function isProtected(pathname: string) {
  return (
    protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/api/export") ||
    pathname.startsWith("/api/deck-search")
  );
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const next = () =>
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  if (!isProtected(request.nextUrl.pathname)) {
    return next();
  }
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return next();
  }
  // Redirect to login. We intentionally do NOT include a ?next= redirect param
  // here: any future code that reads ?next= must validate it is same-origin
  // before using it, to prevent open-redirect attacks.
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/pricing",
    "/dashboard",
    "/dashboard/:path*",
    "/collection",
    "/collection/:path*",
    "/storage",
    "/storage/:path*",
    "/add",
    "/add/:path*",
    "/imports",
    "/imports/:path*",
    "/settings",
    "/settings/:path*",
    "/subscribe",
    "/subscribe/:path*",
    "/decks",
    "/decks/:path*",
    "/analytics",
    "/analytics/:path*",
    "/api/export",
    "/api/deck-search",
  ],
};
