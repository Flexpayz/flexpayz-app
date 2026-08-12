import {CircularProgress} from "@mui/material";

type LoadingPanelProps = {
  text: string;
  className?: string;
};

export function LoadingPanel({text, className}: LoadingPanelProps) {
  const panelClassName = className
    ? `fp-loading-panel ${className}`
    : "fp-loading-panel";

  return (
    <div className={panelClassName} role="status" aria-live="polite">
      <CircularProgress size={44} color="inherit" aria-label={text}/>
      <strong>{text}</strong>
    </div>
  );
}
