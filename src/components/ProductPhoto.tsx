'use client';

import { useState } from 'react';

const PLACEHOLDER = '/placeholder-pneu.svg';

export function ProductPhoto({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className: string;
}) {
  const source = src?.trim() || PLACEHOLDER;
  const [failure, setFailure] = useState<{ source: string; phase: 'fallback' | 'failed' } | null>(null);
  const useFallback = failure?.source === source && failure.phase === 'fallback';
  const fallbackFailed = failure?.source === source && failure.phase === 'failed';
  const resolvedSource = useFallback ? PLACEHOLDER : source;

  if (fallbackFailed) return null;

  return (
    <img
      src={resolvedSource}
      alt={alt}
      className={className}
      onError={() => setFailure({ source, phase: resolvedSource === PLACEHOLDER ? 'failed' : 'fallback' })}
    />
  );
}

export function BrandLogo({
  src,
  name,
  className,
  fallbackClassName,
  fallbackLabel,
}: {
  src?: string | null;
  name: string;
  className: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
}) {
  const source = src?.trim() || '';
  const [failedSource, setFailedSource] = useState('');
  const showImage = Boolean(source && failedSource !== source);

  if (!showImage) {
    return (
      <span className={fallbackClassName || 'text-xs font-bold text-gray-700 uppercase'}>
        {fallbackLabel || name || 'Marque'}
      </span>
    );
  }

  return (
    <img
      src={source}
      alt={name || 'Marque'}
      className={className}
      onError={() => setFailedSource(source)}
    />
  );
}
