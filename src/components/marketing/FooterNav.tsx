export default function FooterNav() {
  return (
    <footer className="bg-primary py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center space-y-4">
        <nav className="flex justify-center space-x-6">
          {[
            { label: "Features", href: "#features" },
            { label: "AI Wizard", href: "#wizard" },
            { label: "SEO", href: "#seo" },
            { label: "Pricing", href: "#pricing" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="paragraph text-primary-foreground hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
        <p className="caption text-primary-foreground/80">
          © {new Date().getFullYear()} Landie. All rights reserved.
        </p>
      </div>
    </footer>
  );
} 