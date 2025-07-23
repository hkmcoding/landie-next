import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SmartImage } from '@/components/ui/SmartImage';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, priority, loading, fill, ...props }: any) => (
    <img 
      src={src} 
      alt={alt} 
      data-priority={priority}
      data-loading={loading}
      data-fill={fill}
      {...props} 
    />
  ),
}));

describe('SmartImage', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders with priority prop without console errors', () => {
    render(
      <SmartImage
        src="/test-image.jpg"
        alt="Test image"
        priority
        size={100}
      />
    );

    // Should not log any errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('renders with loading prop without console errors', () => {
    render(
      <SmartImage
        src="/test-image.jpg"
        alt="Test image"
        loading="lazy"
        size={100}
      />
    );

    // Should not log any errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('renders with loading="eager" without console errors', () => {
    render(
      <SmartImage
        src="/test-image.jpg"
        alt="Test image"
        loading="eager"
        size={100}
      />
    );

    // Should not log any errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('defaults to loading="lazy" when no props specified', () => {
    const { container } = render(
      <SmartImage
        src="/test-image.jpg"
        alt="Test image"
        size={100}
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('data-loading', 'lazy');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('renders fallback when src is null', () => {
    const { container } = render(
      <SmartImage
        src={null}
        alt="Fallback"
        size={50}
      />
    );

    const fallback = container.querySelector('div');
    expect(fallback).toBeTruthy();
    expect(fallback).toHaveStyle({ width: '50px', height: '50px' });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('applies correct rounded classes', () => {
    const { container } = render(
      <SmartImage
        src="/test-image.jpg"
        alt="Test"
        rounded="full"
        size={60}
      />
    );

    const img = container.querySelector('img');
    expect(img?.className).toContain('rounded-full');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // Test that priority takes precedence when both props are passed
  it('prioritizes "priority" over "loading" when both are passed', () => {
    const { container } = render(
      <SmartImage
        src="/test.jpg"
        alt="Test"
        priority={true}
        loading="lazy"
        size={100}
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('data-priority', 'true');
    expect(img).not.toHaveAttribute('data-loading');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // Test that imgRest doesn't interfere with our prop logic
  it('handles imgRest properly without prop conflicts', () => {
    const { container } = render(
      <SmartImage
        src="/test.jpg"
        alt="Test"
        priority={true}
        placeholder="blur"
        sizes="100vw"
        size={100}
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('data-priority', 'true');
    expect(img).not.toHaveAttribute('data-loading');
    expect(img).toHaveAttribute('placeholder', 'blur');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // Test fill prop handling
  it('handles fill prop correctly without width/height', () => {
    const { container } = render(
      <SmartImage
        src="/test.jpg"
        alt="Test"
        fill={true}
        size={100}
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('data-fill', 'true');
    expect(img).not.toHaveAttribute('width');
    expect(img).not.toHaveAttribute('height');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // Test layout="fill" conversion
  it('converts layout="fill" to fill prop correctly', () => {
    const { container } = render(
      <SmartImage
        src="/test.jpg"
        alt="Test"
        layout="fill"
        objectFit="cover"
        size={100}
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('data-fill', 'true');
    expect(img).not.toHaveAttribute('width');
    expect(img).not.toHaveAttribute('height');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});