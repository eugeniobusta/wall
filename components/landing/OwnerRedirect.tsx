"use client";
// The owner, already signed in, goes straight to the app. Everyone else stays on the landing page.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO, supabase } from "@/components/useWall";

export default function OwnerRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (DEMO || new URLSearchParams(location.search).has("about")) return;
    supabase().auth.getSession().then(({ data }) => { if (data.session) router.replace("/edit"); });
  }, [router]);
  return null;
}
