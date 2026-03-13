
import { redirect } from "next/navigation";

// Route exists only as an entry-point shim; app experience starts at login.

// Minimal landing route that immediately redirects users to the events listing screen.
export default function Home() {
  redirect("/login");
}
