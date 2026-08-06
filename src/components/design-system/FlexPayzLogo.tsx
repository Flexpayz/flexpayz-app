import flexPayzLogo from "../../assets/flexpayz-logo-premium-v1.png";

type FlexPayzLogoProps = {
  className?: string;
};

export function FlexPayzLogo({
  className,
}: FlexPayzLogoProps) {
  const logoClassName = className
    ? `flexpayz-logo-image ${className}`
    : "flexpayz-logo-image flexpayz-logo-default";

  return (
    <img
      src={flexPayzLogo}
      alt="FlexPayz"
      className={logoClassName}
      style={{ display: "block", height: "auto", maxWidth: "40vw", objectFit: "contain" }}
    />
  );
}
