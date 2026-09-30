import { Swords } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/** The product mark: crossed swords on the primary green. One source for every placement. */
export function BrandMark({ size = 'md', className }) {
  const sizes = { sm: 'size-8 [&>svg]:size-4', md: 'size-10 [&>svg]:size-5', lg: 'size-12 [&>svg]:size-6' };
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-light', sizes[size], className)}>
      <Swords aria-hidden strokeWidth={2} />
    </span>
  );
}
