import { useRef, useEffect, useState } from 'react';

const FadeContent = ({
  children,
  blur = false,
  duration = 800,
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  className = '',
  ...props
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setReducedMotion(event.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion, threshold]);

  const transitionDuration = Math.min(duration, 500);
  const transitionDelay = Math.min(delay, 180);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: reducedMotion || visible ? 1 : initialOpacity,
        filter: blur && !reducedMotion ? (visible ? 'blur(0px)' : 'blur(3px)') : undefined,
        transform: reducedMotion || visible ? 'translateY(0)' : 'translateY(12px)',
        transition: reducedMotion
          ? 'none'
          : `opacity ${transitionDuration}ms ease-out ${transitionDelay}ms, filter ${transitionDuration}ms ease-out ${transitionDelay}ms, transform ${transitionDuration}ms ease-out ${transitionDelay}ms`,
        willChange: reducedMotion || visible ? 'auto' : 'opacity, filter, transform',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default FadeContent;
