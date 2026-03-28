import { redirect } from "next/navigation"

// Root — middleware redirects unauthenticated users to /login
// Authenticated users land at /connections (D-22)
export default function RootPage() {
  redirect("/connections")
}
