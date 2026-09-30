import { cn } from '../../lib/cn.js';

/** Static placeholder block. A slow pulse only; no shimmer sweep. */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-sm bg-subtle', className)} aria-hidden />;
}
