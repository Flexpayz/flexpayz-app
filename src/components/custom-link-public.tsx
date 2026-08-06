import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import {Product} from "../control-state";
import {getCustomLinkDisplayLabel, parseCustomLink} from "../custom-link";
import {BackButton, FlexPayzLogo} from "./design-system";

type CustomLinkPublicPageProps = {
    product: Product;
    productId: string;
    fromDashboard?: boolean;
};

const REDIRECT_DELAY = 900;

export function CustomLinkPublicPage({product, productId, fromDashboard = false}: CustomLinkPublicPageProps) {
    const parsedLink = useMemo(() => parseCustomLink(product.customLink), [product.customLink]);
    const [copied, setCopied] = useState(false);
    const redirecting = useRef(false);
    const timeoutRef = useRef<number | undefined>();
    const destinationName = parsedLink.isValid ? getCustomLinkDisplayLabel(parsedLink) : "that link";

    const redirectNow = useCallback(() => {
        if (!parsedLink.normalizedUrl || redirecting.current) return;
        redirecting.current = true;
        window.location.replace(parsedLink.normalizedUrl);
    }, [parsedLink.normalizedUrl]);

    useEffect(() => {
        if (!parsedLink.normalizedUrl) return;
        timeoutRef.current = window.setTimeout(redirectNow, REDIRECT_DELAY);
        return () => window.clearTimeout(timeoutRef.current);
    }, [parsedLink.normalizedUrl, redirectNow]);

    const copyDestination = async () => {
        if (!parsedLink.normalizedUrl || !navigator.clipboard?.writeText) return;
        try {
            await navigator.clipboard.writeText(parsedLink.normalizedUrl);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const goBackToContent = () => {
        window.clearTimeout(timeoutRef.current);
        if (fromDashboard && productId) {
            window.location.href = `/show-product?product_id=${encodeURIComponent(productId)}`;
            return;
        }
        window.history.back();
    };

    if (!parsedLink.isValid) {
        return (
            <div className="custom-link-public-page custom-link-public-error">
                <DecorativePublicCircles/>
                <header className="custom-link-public-header">
                    <FlexPayzLogo className="custom-link-public-logo"/>
                </header>
                <main className="custom-link-public-error-card" role="alert">
                    <p className="custom-link-public-kicker">DESTINATION UNAVAILABLE</p>
                    <h1>We couldn’t open that link</h1>
                    <p>The visitor keeps control and never lands on a blank screen.</p>
                    <div className="custom-link-public-warning">
                        <span aria-hidden="true">!</span>
                        <div>
                            <strong>Destination did not respond</strong>
                            <small>The saved destination is missing or no longer valid.</small>
                        </div>
                    </div>
                    <div className="custom-link-public-actions">
                        <button type="button" className="custom-link-public-primary" onClick={redirectNow} disabled={!parsedLink.normalizedUrl}>
                            Try again <ReplayRoundedIcon fontSize="small"/>
                        </button>
                        <button type="button" className="custom-link-public-secondary" onClick={copyDestination} disabled={!parsedLink.normalizedUrl}>
                            {copied ? "Destination copied" : "Copy destination"} <ContentCopyRoundedIcon fontSize="small"/>
                        </button>
                    </div>
                    {fromDashboard && (
                        <BackButton aria-label="Back to content dashboard" className="custom-link-public-back" onClick={goBackToContent}/>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="custom-link-public-page">
            <DecorativePublicCircles/>
            <header className="custom-link-public-header">
                <FlexPayzLogo className="custom-link-public-logo"/>
                <span>EXTERNAL LINK <ArrowOutwardRoundedIcon fontSize="small"/></span>
            </header>
            <main className="custom-link-public-layout" aria-live="polite">
                <section className="custom-link-public-hero">
                    <span className="custom-link-public-icon" aria-hidden="true">↗</span>
                    <p className="custom-link-public-kicker">OPENING EXTERNAL LINK</p>
                    <h1>
                        <span className="custom-link-public-desktop-heading">A polished handoff, then you’re on your way.</span>
                        <span className="custom-link-public-mobile-heading">Taking you to {destinationName}</span>
                    </h1>
                    <p>FlexPayz confirms the destination while the browser opens the selected external website.</p>
                    <strong className="custom-link-public-chip">{parsedLink.displayHostname}</strong>
                    <div className="custom-link-public-progress" aria-label="Redirecting securely">
                        <span/>
                    </div>
                    <small>Redirecting securely…</small>
                </section>

                <section className="custom-link-public-card" aria-label="Destination details">
                    <p className="custom-link-public-kicker">DESTINATION</p>
                    <div className="custom-link-public-destination">
                        <span aria-hidden="true">↗</span>
                        <div>
                            <h2>{destinationName}</h2>
                            <strong>{parsedLink.displayHostname}</strong>
                            {parsedLink.path && <small>{parsedLink.path}</small>}
                        </div>
                        <em>{parsedLink.isSecure ? "HTTPS" : "HTTP"}</em>
                    </div>
                    <hr/>
                    <strong>Opening in this browser</strong>
                    <p>The destination is an external website.</p>
                    <button type="button" className="custom-link-public-primary" onClick={redirectNow}>
                        Open destination now <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                    <small>Fallback action appears if redirect is delayed.</small>
                </section>
            </main>
            <footer className="custom-link-public-footer">
                <span>Secure · contactless · yours</span>
                <strong>Powered by FlexPayz</strong>
            </footer>
        </div>
    );
}

function DecorativePublicCircles() {
    return (
        <div className="custom-link-public-circles" aria-hidden="true">
            <span/>
            <span/>
        </div>
    );
}
