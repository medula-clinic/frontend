import { useCallback, useEffect } from "react";
import privacyHtml from "@/landing/privacy.html?raw";
import { useLandingAssets } from "@/hooks/useLandingAssets";
import { useStaticHtml } from "@/hooks/useStaticHtml";
import { initLandingInteractions } from "@/utils/landingInteractions";
import { useBodyClass } from "@/hooks/useBodyClass";

const Privacy = () => {
  useLandingAssets();
  useBodyClass(["terms-page", "privacy-page"]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Medula – Privacy Policy";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleReady = useCallback((root: HTMLDivElement) => {
    return initLandingInteractions(root);
  }, []);

  const containerRef = useStaticHtml(privacyHtml, handleReady);

  return <div ref={containerRef} className="landing-legal-page" />;
};

export default Privacy;
