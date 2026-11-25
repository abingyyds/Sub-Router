import React, { useEffect, useMemo, useRef, useState } from 'react';

const TURNSTILE_ONLOAD_CALLBACK = 'cf__distSubrouterTurnstileOnLoad';
const TURNSTILE_SCRIPT_SRC = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${TURNSTILE_ONLOAD_CALLBACK}&render=explicit`;

let turnstileLoadPromise = null;

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires a browser environment'));
  }
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (turnstileLoadPromise) {
    return turnstileLoadPromise;
  }
  turnstileLoadPromise = new Promise((resolve, reject) => {
    window[TURNSTILE_ONLOAD_CALLBACK] = () => {
      delete window[TURNSTILE_ONLOAD_CALLBACK];
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        turnstileLoadPromise = null;
        reject(new Error('Turnstile API unavailable after script load'));
      }
    };

    const existing = document.querySelector(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    if (existing) {
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('error', () => {
      delete window[TURNSTILE_ONLOAD_CALLBACK];
      turnstileLoadPromise = null;
      script.remove();
      reject(new Error('Failed to load Cloudflare Turnstile script'));
    });
    document.head.appendChild(script);
  });
  return turnstileLoadPromise;
}

export default function TurnstileWidget({
  siteKey,
  embedUrl = '',
  onVerify,
  onExpire,
  onError,
  resetKey = 0,
  theme = 'auto',
  className = '',
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const iframeRef = useRef(null);
  const iframeReadyRef = useRef(false);
  const [iframeNonce, setIframeNonce] = useState(0);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  const embedMeta = useMemo(() => {
    if (!embedUrl || typeof window === 'undefined') {
      return null;
    }
    try {
      const target = new URL(embedUrl, window.location.origin);
      target.searchParams.set('origin', window.location.origin);
      target.searchParams.set('theme', theme);
      return {
        origin: target.origin,
        src: target.toString(),
      };
    } catch {
      return null;
    }
  }, [embedUrl, theme]);

  // Direct Turnstile mode (for *.subrouter.ai subdomain distributor sites)
  useEffect(() => {
    if (embedMeta || !siteKey) {
      return undefined;
    }
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then((api) => {
        if (cancelled || !containerRef.current) {
          return;
        }
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => callbacksRef.current.onVerify?.(token),
          'expired-callback': () => callbacksRef.current.onExpire?.(),
          'error-callback': (code) => callbacksRef.current.onError?.(code),
        });
      })
      .catch((err) => {
        if (!cancelled) {
          callbacksRef.current.onError?.(err);
        }
      });

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // Ignore unmount cleanup errors.
        }
      }
    };
  }, [embedMeta, siteKey, theme]);

  // Cross-origin main-domain bridge mode (for custom-domain distributor sites)
  useEffect(() => {
    if (!embedMeta) {
      return undefined;
    }
    iframeReadyRef.current = false;

    const handleMessage = (event) => {
      if (
        event.origin !== embedMeta.origin ||
        event.source !== iframeRef.current?.contentWindow
      ) {
        return;
      }
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      if (data.type === 'subrouter:turnstile:ready') {
        iframeReadyRef.current = true;
      } else if (data.type === 'subrouter:turnstile:verify') {
        callbacksRef.current.onVerify?.(String(data.token || ''));
      } else if (data.type === 'subrouter:turnstile:expire') {
        callbacksRef.current.onExpire?.();
      } else if (data.type === 'subrouter:turnstile:error') {
        callbacksRef.current.onError?.(data.code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [embedMeta, iframeNonce]);

  // Reset single-use Turnstile token when parent increments resetKey
  useEffect(() => {
    if (!resetKey) {
      return;
    }
    if (embedMeta) {
      if (iframeReadyRef.current && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'subrouter:turnstile:reset' },
          embedMeta.origin,
        );
      } else {
        setIframeNonce((n) => n + 1);
      }
      return;
    }
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // Ignore reset failure on stale widget.
      }
    }
  }, [resetKey, embedMeta]);

  if (!siteKey) {
    return null;
  }

  if (embedMeta) {
    return (
      <div className={`flex justify-center ${className}`.trim()}>
        <iframe
          key={iframeNonce}
          ref={iframeRef}
          src={embedMeta.src}
          title="Cloudflare Turnstile"
          className="block h-[72px] w-[308px] max-w-full overflow-hidden border-0 bg-transparent"
          scrolling="no"
        />
      </div>
    );
  }

  return (
    <div className={`flex justify-center ${className}`.trim()}>
      <div ref={containerRef} />
    </div>
  );
}
