import { useCallback, useEffect } from "react";
import termsHtml from "@/landing/terms.html?raw";
import { useLandingAssets } from "@/hooks/useLandingAssets";
import { useStaticHtml } from "@/hooks/useStaticHtml";
import { initLandingInteractions } from "@/utils/landingInteractions";
import { useBodyClass } from "@/hooks/useBodyClass";

const Terms = () => {
  useLandingAssets();
  useBodyClass(["terms-page"]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Medula – Terms of Service";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleReady = useCallback((root: HTMLDivElement) => {
    return initLandingInteractions(root);
  }, []);

  const containerRef = useStaticHtml(termsHtml, handleReady);

  return <div ref={containerRef} className="landing-legal-page" />;
};

export default Terms;
