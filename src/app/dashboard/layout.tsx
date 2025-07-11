import { AuthProvider } from "@/lib/supabase/auth-provider";

export const metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Dashboard - Landie",
  },
  description: "Manage your landing page content and settings.",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}