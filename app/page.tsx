"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    console.log("Hello from Vercel build test");
  }, []);

  return <h1>Hello Supabase 👋</h1>;
}
