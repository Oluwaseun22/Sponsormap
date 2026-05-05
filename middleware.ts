import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// All auth protection is handled client-side via Clerk's useUser() hook.
// This middleware is a pass-through — no Clerk imports to avoid edge runtime issues.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
