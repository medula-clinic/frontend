import { useEffect, useRef } from "react";

type ReadyCallback = (
  root: HTMLDivElement
) => void | (() => void);

export const useStaticHtml = (
  html: string,
  onReady?: ReadyCallback
) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    root.innerHTML = doc.body?.innerHTML ?? html;

    let cleanup: void | (() => void);
    if (onReady) {
      cleanup = onReady(root);
    }

    return () => {
      root.innerHTML = "";
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [html, onReady]);

  return containerRef;
};
