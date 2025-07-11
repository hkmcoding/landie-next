import "../../../typography.css";

export default function TypographyTestPage() {
  // Only show when SHOW_COMPONENTS is set to 'true'
  if (process.env.SHOW_COMPONENTS !== 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="heading-2">Page Not Found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="heading-1">Typography Test Page</h1>
          <p className="text-description">Testing typography utility classes</p>
        </div>
        <div className="space-y-6">
          <div>
            <div className="heading-1">Heading 1</div>
            <div className="heading-2">Heading 2</div>
            <div className="heading-3">Heading 3</div>
          </div>
          <div>
            <div className="subtitle-1">Subtitle 1</div>
            <div className="subtitle-2">Subtitle 2</div>
          </div>
          <div>
            <div className="paragraph">This is a paragraph using the <code>.paragraph</code> class. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
            <div className="paragraph-md">This is a medium paragraph using the <code>.paragraph-md</code> class.</div>
          </div>
          <div>
            <div className="caption">This is a caption using the <code>.caption</code> class.</div>
            <div className="caption-sm">This is a small caption using the <code>.caption-sm</code> class.</div>
          </div>
          <div>
            <span className="label">Label Example</span>
          </div>
        </div>
      </div>
    </div>
  );
}
