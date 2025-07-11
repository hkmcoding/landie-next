"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSupabase } from "@/lib/supabase/auth-provider";
import Link from "next/link";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SignInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type SignInValues = z.infer<typeof SignInSchema>;

export default function SignInPageClient() {
  const supabase = useSupabase();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);
    setLoading(true);
    console.log("Attempting login with:", values);
    const { error, data } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    console.log("Login result:", { error, data });
    if (error) {
      setFormError(error.message);
      console.error("Login error:", error);
    } else {
      // Debug: log cookies after login
      if (typeof document !== 'undefined') {
        console.log("Cookies after login:", document.cookie);
      }
      // Show a message before redirecting
      setFormError("Login successful! Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    }
  }

  return (
    <div className="flex justify-center mt-20 bg-background">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-white dark:bg-zinc-900">
        <h1 className="heading-2 mb-6 text-center">Sign In</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {formError && <div className="text-error text-sm text-center">{formError}</div>}
            <Button type="submit" className="w-full" loading={loading} loadingText="Signing in...">
              Sign In
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account? <Link href="/register" className="underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
} 