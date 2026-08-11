import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import {Product} from "../control-state";
import {getCustomLinkDisplayLabel, parseCustomLink} from "../custom-link";
import {BackButton} from "./design-system";
import {PublicPageHeader} from "./public-page-header";
import {usePublicLanguage, withPublicLanguageParam} from "../public-i18n";

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
    const {language, t} = usePublicLanguage();
    const destinationName = parsedLink.isValid ? getCustomLinkDisplayLabel(parsedLink) : t("customLink.destinationFallback");

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
            window.location.href = withPublicLanguageParam(`/show-product?product_id=${encodeURIComponent(productId)}`, language);
            return;
        }
        window.history.back();
    };

    if (!parsedLink.isValid) {
        return (
            <div className="custom-link-public-page custom-link-public-error">
                <DecorativePublicCircles/>
                <PublicPageHeader productId={productId} fromDashboard={fromDashboard} shareTitle={t("customLink.shareTitle", {name: product.name || "FlexPayz"})}/>
                <main className="custom-link-public-error-card" role="alert">
                    <p className="custom-link-public-kicker">{t("customLink.error.kicker")}</p>
                    <h1>{t("customLink.error.title")}</h1>
                    <p>{t("customLink.error.message")}</p>
                    <div className="custom-link-public-warning">
                        <span aria-hidden="true">!</span>
                        <div>
                            <strong>{t("customLink.error.summary")}</strong>
                            <small>{t("customLink.error.detail")}</small>
                        </div>
                    </div>
                    <div className="custom-link-public-actions">
                        <button type="button" className="custom-link-public-primary" onClick={redirectNow} disabled={!parsedLink.normalizedUrl}>
                            {t("customLink.tryAgain")} <ReplayRoundedIcon fontSize="small"/>
                        </button>
                        <button type="button" className="custom-link-public-secondary" onClick={copyDestination} disabled={!parsedLink.normalizedUrl}>
                            {copied ? t("customLink.destinationCopied") : t("customLink.copyDestination")} <ContentCopyRoundedIcon fontSize="small"/>
                        </button>
                    </div>
                    {fromDashboard && (
                        <BackButton aria-label={t("public.back.dashboard")} className="custom-link-public-back" onClick={goBackToContent}/>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="custom-link-public-page">
            <DecorativePublicCircles/>
            <PublicPageHeader productId={productId} fromDashboard={fromDashboard} shareTitle={t("customLink.shareTitle", {name: product.name || "FlexPayz"})}/>
            <main className="custom-link-public-layout" aria-live="polite">
                <section className="custom-link-public-hero">
                    <span className="custom-link-public-icon" aria-hidden="true">↗</span>
                    <p className="custom-link-public-kicker">{t("customLink.opening")}</p>
                    <h1>
                        <span className="custom-link-public-desktop-heading">{t("customLink.desktopTitle")}</span>
                        <span className="custom-link-public-mobile-heading">{t("customLink.mobileTitle", {name: destinationName})}</span>
                    </h1>
                    <p>{t("customLink.description")}</p>
                    <strong className="custom-link-public-chip">{parsedLink.displayHostname}</strong>
                    <div className="custom-link-public-progress" aria-label={t("customLink.redirectingLabel")}>
                        <span/>
                    </div>
                    <small>{t("customLink.redirecting")}</small>
                </section>

                <section className="custom-link-public-card" aria-label="Destination details">
                    <p className="custom-link-public-kicker">{t("customLink.destination")}</p>
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
                    <strong>{t("customLink.openingBrowser")}</strong>
                    <p>{t("customLink.external")}</p>
                    <button type="button" className="custom-link-public-primary" onClick={redirectNow}>
                        {t("customLink.openNow")} <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                    <small>{t("customLink.fallback")}</small>
                </section>
            </main>
            <footer className="custom-link-public-footer">
                <span>{t("public.footer.secure")}</span>
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
