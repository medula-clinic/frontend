import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  BRAND_DARK_LOGO,
  BRAND_LIGHT_LOGO,
} from "@/branding/brandAssets";

type LogoVariant = "auto" | "light" | "dark";

interface BrandLogoProps {
  className?: string;
  variant?: LogoVariant;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  variant = "auto",
  alt = "Medula",
}) => {
  const { theme } = useTheme();
  const resolvedVariant: Exclude<LogoVariant, "auto"> =
    variant === "auto" ? (theme === "dark" ? "dark" : "light") : variant;

  const src = resolvedVariant === "dark" ? BRAND_DARK_LOGO : BRAND_LIGHT_LOGO;

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "h-8 w-auto object-contain select-none pointer-events-none",
        className,
      )}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
};

export default BrandLogo;
