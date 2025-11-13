import { useEffect } from "react";

export const useBodyClass = (classes: string | string[]) => {
  const normalized = Array.isArray(classes) ? classes : [classes];
  const key = normalized.join(" ");

  useEffect(() => {
    normalized
      .filter(Boolean)
      .forEach((cls) => document.body.classList.add(cls));

    return () => {
      normalized
        .filter(Boolean)
        .forEach((cls) => document.body.classList.remove(cls));
    };
  }, [key]);
};
