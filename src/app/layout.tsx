import "../globals.css";
import { AuthProvider } from "@/lib/supabase/auth-provider";
import { ConditionalLayout } from "@/components/ConditionalLayout";

export const metadata = {
  title: {
    default: "Landie - Your AI Landing Page Generator",
    template: "%s | Landie",
  },
  description: "Turn followers into clients with Landie's no-code landing-page builder—built-in SEO, AI wizard, responsive templates.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://tvggbhlivlvzciacdhmy.supabase.co" />
        <link rel="dns-prefetch" href="https://tvggbhlivlvzciacdhmy.supabase.co" />
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
