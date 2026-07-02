'use client';

import { useEffect, useRef, type RefObject } from 'react';
import {
  clearTrailsScrollPosition,
  readTrailsScrollPosition,
} from '@/components/feature-components/trails/trails-list-state';

type ScrollLoadingOptions = {
  isInitialLoading: boolean;
  trailsLength: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  fetchNextPage: () => Promise<unknown>;
};

export function useTrailsScrollLoading({
  isInitialLoading,
  trailsLength,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  fetchNextPage,
}: ScrollLoadingOptions): RefObject<HTMLDivElement> {
  const didRestoreScroll = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (didRestoreScroll.current || isInitialLoading) return;
    const savedY = readTrailsScrollPosition();
    if (savedY === null) {
      didRestoreScroll.current = true;
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const restore = () => {
      if (cancelled) return;
      attempts += 1;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScrollY >= savedY || attempts >= 12 || !hasNextPage) {
        window.scrollTo({ top: Math.min(savedY, Math.max(0, maxScrollY)), behavior: 'auto' });
        clearTrailsScrollPosition();
        didRestoreScroll.current = true;
        return;
      }
      window.setTimeout(() => {
        void fetchNextPage();
        requestAnimationFrame(restore);
      }, 80);
    };

    requestAnimationFrame(restore);
    return () => {
      cancelled = true;
    };
  }, [fetchNextPage, hasNextPage, isInitialLoading, trailsLength]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || !didRestoreScroll.current) return;
        if (!hasNextPage || isFetchingNextPage || isLoading) return;
        void fetchNextPage();
      },
      { root: null, rootMargin: '300px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, trailsLength]);

  return loadMoreRef;
}

export function usePageShowReset(reset: () => void) {
  useEffect(() => {
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, [reset]);
}

export function useSyncOpenFilters(open: boolean, sync: () => void) {
  useEffect(() => {
    if (open) sync();
  }, [open, sync]);
}
