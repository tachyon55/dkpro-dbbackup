import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = nextUrl.pathname.startsWith("/login")
      const isOnChangePassword = nextUrl.pathname.startsWith("/change-password")

      // Redirect logged-in users away from login page
      if (isOnLogin) {
        return isLoggedIn ? Response.redirect(new URL("/dashboard", nextUrl)) : true
      }

      // Unauthenticated users must log in
      if (!isLoggedIn) return false

      // Force password change: redirect to /change-password if mustChangePassword=true
      const mustChangePassword = (auth.user as { mustChangePassword?: boolean }).mustChangePassword
      if (mustChangePassword && !isOnChangePassword) {
        return Response.redirect(new URL("/change-password", nextUrl))
      }

      return true
    },
    jwt({ token, user }) {
      // Persist role, id, and mustChangePassword from user object on first sign-in
      if (user) {
        token.role = user.role
        token.id = user.id
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as "admin" | "operator" | "viewer"
      session.user.id = token.id as string
      session.user.mustChangePassword = token.mustChangePassword as boolean
      return session
    },
  },
  providers: [], // populated in auth.ts
}
