import './ErrorBanner.css';

export interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="cb-error-banner" role="alert">
      <p className="cb-error-banner__message">{message}</p>
    </div>
  );
}
