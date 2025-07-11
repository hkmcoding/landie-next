import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignInPageClient from "./SignInPageClient";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <SignInPageClient />;
} 