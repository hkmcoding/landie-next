import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Image from 'next/image';
import { ImageFallback } from '@/components/ui/ImageFallback';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: vi.fn().mockImplementation(({ src, alt, ...props }) => (
    <img src={src} alt={alt} {...props} />
  )),
}));

describe('Image Components - Loading Props Validation', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Next.js Image Component', () => {
    it('should not cause console errors with priority only', () => {
      render(
        <Image
          src="/test-image.jpg"
          alt="Test image"
          width={100}
          height={100}
          priority
          sizes="100px"
        />
      );

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('priority')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('loading')
      );
    });

    it('should not cause console errors with loading="lazy" only', () => {
      render(
        <Image
          src="/test-image.jpg"
          alt="Test image"
          width={100}
          height={100}
          loading="lazy"
          sizes="100px"
        />
      );

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('priority')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('loading')
      );
    });

    it('should not cause console errors with loading="eager"', () => {
      render(
        <Image
          src="/test-image.jpg"
          alt="Test image"
          width={100}
          height={100}
          loading="eager"
          sizes="100px"
        />
      );

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('priority')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('loading')
      );
    });

    it('should not cause console errors with fill layout', () => {
      render(
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <Image
            src="/test-image.jpg"
            alt="Test image"
            fill
            loading="lazy"
            sizes="100px"
          />
        </div>
      );

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('priority')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('loading')
      );
    });
  });

  describe('ImageFallback Component', () => {
    it('should render correctly with default props', () => {
      const { container } = render(<ImageFallback size={80} />);
      
      const fallbackDiv = container.firstChild as HTMLElement;
      expect(fallbackDiv).toBeTruthy();
      expect(fallbackDiv.className).toContain('bg-muted');
      expect(fallbackDiv.className).toContain('rounded-md');
      expect(fallbackDiv.style.width).toBe('80px');
      expect(fallbackDiv.style.height).toBe('80px');
    });

    it('should render with full rounded corners', () => {
      const { container } = render(<ImageFallback size={40} rounded="full" />);
      
      const fallbackDiv = container.firstChild as HTMLElement;
      expect(fallbackDiv.className).toContain('rounded-full');
    });

    it('should render with no rounded corners', () => {
      const { container } = render(<ImageFallback size={60} rounded="none" />);
      
      const fallbackDiv = container.firstChild as HTMLElement;
      expect(fallbackDiv.className).not.toContain('rounded-');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ImageFallback size={50} className="custom-class" />
      );
      
      const fallbackDiv = container.firstChild as HTMLElement;
      expect(fallbackDiv.className).toContain('custom-class');
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle hero image pattern (priority)', () => {
      render(
        <Image
          src="/profile.jpg"
          alt="Profile"
          width={120}
          height={120}
          priority
          className="rounded-full object-cover"
          sizes="120px"
        />
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle avatar pattern (lazy)', () => {
      render(
        <Image
          src="/avatar.jpg"
          alt="Avatar"
          width={40}
          height={40}
          loading="lazy"
          className="rounded-full object-cover"
          sizes="40px"
        />
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle gallery pattern (fill + lazy)', () => {
      render(
        <div style={{ position: 'relative', width: 200, height: 150 }}>
          <Image
            src="/gallery-image.jpg"
            alt="Gallery image"
            fill
            loading="lazy"
            className="object-cover rounded-md"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      );

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});