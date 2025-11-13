import { useEffect } from "react";

type LinkDescriptor = {
  rel: HTMLLinkElement["rel"];
  href: string;
  crossOrigin?: HTMLLinkElement["crossOrigin"];
};

let consumers = 0;
let appendedNodes: HTMLLinkElement[] = [];

const descriptors: LinkDescriptor[] = [
  {
    rel: "preconnect",
    href: "https://fonts.googleapis.com",
  },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&display=swap",
  },
  {
    rel: "stylesheet",
    href: "/landing/assets/css/style.css",
  },
];

const ensureAssets = () => {
  if (appendedNodes.length > 0) {
    return;
  }

  appendedNodes = descriptors.map((descriptor) => {
    const link = document.createElement("link");
    link.rel = descriptor.rel;
    link.href = descriptor.href;
    if (descriptor.crossOrigin) {
      link.crossOrigin = descriptor.crossOrigin;
    }
    link.dataset.landingAsset = descriptor.href;
    document.head.appendChild(link);
    return link;
  });

  const win = window as Window & { dataLayer?: unknown[] };
  if (!Array.isArray(win.dataLayer)) {
    win.dataLayer = [];
  }
};

const removeAssets = () => {
  appendedNodes.forEach((node) => node.remove());
  appendedNodes = [];
};

export const useLandingAssets = () => {
  useEffect(() => {
    consumers += 1;
    if (consumers === 1) {
      ensureAssets();
    }

    return () => {
      consumers = Math.max(0, consumers - 1);
      if (consumers === 0) {
        removeAssets();
      }
    };
  }, []);
};
