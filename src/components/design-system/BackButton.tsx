import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

type BackButtonProps = {
  "aria-label": string;
  className?: string;
  href?: string;
  onClick?: () => void;
};

export function BackButton({
  "aria-label": ariaLabel,
  className,
  href,
  onClick,
}: BackButtonProps) {
  const buttonClassName = className
    ? `fp-back-button ${className}`
    : "fp-back-button";

  if (href) {
    return (
      <a
        className={buttonClassName}
        aria-label={ariaLabel}
        href={href}
      >
        <ArrowBackRoundedIcon fontSize="small" aria-hidden="true"/>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={buttonClassName}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <ArrowBackRoundedIcon fontSize="small" aria-hidden="true"/>
    </button>
  );
}
