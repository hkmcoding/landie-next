'use client';

interface AboutSectionProps {
  bio: string;
}

export function AboutSection({ bio }: AboutSectionProps) {
  if (!bio) {
    return null;
  }

  return (
    <section className="py-6 md:py-12 px-4">
      <div className="mx-auto max-w-md md:max-w-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="heading-5 mb-2 text-slate-800">
            About Me
          </h2>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-200">
          <p className="paragraph text-slate-700 whitespace-pre-wrap">
            {bio}
          </p>
        </div>
      </div>
    </section>
  );
}