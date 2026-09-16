'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Extra delay in ms, for staggering siblings. */
  delay?: number;
}

/**
 * Fades content up once it scrolls into view. State lives on a data attribute,
 * so there is no re-render, and `motion-reduce:` variants make it a no-op for
 * people who prefer reduced motion.
 */
export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.shown = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.shown = 'true';
          observer.disconnect();
        }
      },
      // threshold 0 so sections taller than a phone viewport still fire as soon as they enter.
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`translate-y-6 opacity-0 transition-[opacity,transform] duration-700 ease-out data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${className}`}
    >
      {children}
    </div>
  );
}
