"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function NewsletterFrame({ html, title }: { html: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  const resize = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;

    const nextHeight = Math.max(
      doc.body.scrollHeight,
      doc.body.offsetHeight,
      doc.documentElement.scrollHeight,
      doc.documentElement.offsetHeight,
    );
    setHeight(nextHeight);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(doc.documentElement);
    if (doc.body) observer.observe(doc.body);

    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [html, resize]);

  return (
    <iframe
      ref={frameRef}
      className="newsletter-frame"
      title={title}
      srcDoc={html}
      scrolling="no"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      style={{ height: height ? `${height}px` : undefined }}
      onLoad={resize}
    />
  );
}
