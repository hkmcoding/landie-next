'use client';

import { Highlight } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface HighlightsSectionProps {
  highlights: Highlight[];
}

export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-12 px-4">
      <div className="mx-auto max-w-md md:max-w-2xl">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="heading-5 mb-2 text-slate-800">
            Highlights
          </h2>
        </div>

        <div className="space-y-3 md:space-y-4">
          {highlights.map((highlight) => (
            <HighlightCard key={highlight.id} highlight={highlight} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HighlightCard({ highlight }: { highlight: Highlight }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:bg-blue-50/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 shrink-0">
          <Icons.star className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="subtitle-4 text-slate-800">
            {highlight.header}
          </h3>
          {highlight.content && (
            <p className="caption text-slate-600 mt-1">
              {highlight.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}