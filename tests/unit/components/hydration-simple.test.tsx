import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ImageFallback } from '@/components/ui/ImageFallback';

describe('ImageFallback Hydration Tests', () => {
  it('should generate consistent className with clsx', () => {
    const { container } = render(<ImageFallback size={80} rounded="md" />);
    const element = container.firstElementChild as HTMLElement;
    
    // Verify className structure
    expect(element.className).toBe(
      'flex items-center justify-center bg-muted text-muted-foreground rounded-md'
    );
    
    // No leading/trailing spaces
    expect(element.className).not.toMatch(/^\s|\s$/);
    
    // No double spaces
    expect(element.className).not.toMatch(/\s{2,}/);
  });

  it('should generate consistent className with rounded="full"', () => {
    const { container } = render(<ImageFallback size={40} rounded="full" />);
    const element = container.firstElementChild as HTMLElement;
    
    expect(element.className).toBe(
      'flex items-center justify-center bg-muted text-muted-foreground rounded-full'
    );
  });

  it('should generate consistent className with rounded="none"', () => {
    const { container } = render(<ImageFallback size={60} rounded="none" />);
    const element = container.firstElementChild as HTMLElement;
    
    expect(element.className).toBe(
      'flex items-center justify-center bg-muted text-muted-foreground'
    );
  });

  it('should handle custom className properly', () => {
    const { container } = render(
      <ImageFallback size={50} rounded="md" className="border-2" />
    );
    const element = container.firstElementChild as HTMLElement;
    
    expect(element.className).toBe(
      'flex items-center justify-center bg-muted text-muted-foreground rounded-md border-2'
    );
  });

  it('should handle empty className', () => {
    const { container } = render(
      <ImageFallback size={80} rounded="md" className="" />
    );
    const element = container.firstElementChild as HTMLElement;
    
    expect(element.className).toBe(
      'flex items-center justify-center bg-muted text-muted-foreground rounded-md'
    );
  });
});