"use client";

import { useEffect, useRef, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Content is readable before hydration; animation is an optional enhancement. */
export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!el || motion.matches || !window.IntersectionObserver || !el.animate) return;
    // Don't fade out text the user may already be reading on a slow connection.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      if (motion.matches) return;
      animation = el.animate(
        [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 700, delay, easing: 'ease-out' }
      );
    }, { threshold: 0 });
    observer.observe(el);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [delay]);

  return <div ref={ref} data-reveal className={className}>{children}</div>;
}
