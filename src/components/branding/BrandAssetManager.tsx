import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import {
  BRAND_DARK_HEX,
  BRAND_FAVICON,
  BRAND_PRIMARY_HEX,
} from "@/branding/brandAssets";

const BrandAssetManager = () => {
  const { theme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const ensureFavicon = () => {
      if (typeof document === "undefined") return;
      let favicon = document.head.querySelector<HTMLLinkElement>(
        "link[rel='icon'][data-global-favicon]",
      );
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/png";
        favicon.dataset.globalFavicon = "true";
        document.head.appendChild(favicon);
      }
      favicon.href = BRAND_FAVICON;
    };

    ensureFavicon();
  }, [location.pathname]);

  useEffect(() => {
    const updateThemeColorMeta = () => {
      if (typeof document === "undefined") return;
      let meta = document.head.querySelector<HTMLMetaElement>(
        "meta[name='theme-color']",
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = theme === "dark" ? BRAND_DARK_HEX : BRAND_PRIMARY_HEX;
    };

    updateThemeColorMeta();
  }, [theme]);

  return null;
};

export default BrandAssetManager;
