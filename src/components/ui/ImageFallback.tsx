import { User } from 'lucide-react';
import clsx from 'clsx';

interface ImageFallbackProps {
  size: number;
  rounded?: 'full' | 'md' | 'none';
  className?: string;
}

export function ImageFallback({ size, rounded = 'md', className }: ImageFallbackProps) {
  const classNames = clsx(
    'flex items-center justify-center bg-muted text-muted-foreground',
    rounded === 'full' && 'rounded-full',
    rounded === 'md' && 'rounded-md',
    className
  );

  return (
    <div
      className={classNames}
      style={{ width: size, height: size }}
    >
      <User className="h-1/2 w-1/2" />
    </div>
  );
}