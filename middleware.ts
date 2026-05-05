import { clerkMiddleware } from "@clerk/nextjs/server";

// clerkMiddleware with no callback just injects the Clerk session context.
// Route protection (redirect when unauthenticated) is handled in each page
// via useUser() + router.replace(), which works on Vercel's Edge runtime.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
