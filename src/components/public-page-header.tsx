import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import {BackButton, FlexPayzLogo} from "./design-system";

type PublicPageHeaderProps = {
    productId: string;
    fromDashboard?: boolean;
    language?: string;
    shareTitle?: string;
    onShareMessage?: (message: string) => void;
};

export function PublicPageHeader({
    productId,
    fromDashboard = false,
    language = "EN",
    shareTitle = "FlexPayz public page",
    onShareMessage,
}: PublicPageHeaderProps) {
    const sharePage = async () => {
        const url = window.location.href;
        onShareMessage?.("");

        if (navigator.share) {
            try {
                await navigator.share({title: shareTitle, url});
                return;
            } catch (error: any) {
                if (error?.name === "AbortError") return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            onShareMessage?.("Page link copied.");
        } catch {
            onShareMessage?.("Copy the page URL from your browser.");
        }
    };

    return (
        <header className="business-public-topbar public-page-header">
            <FlexPayzLogo className="business-public-logo"/>
            <div>
                {fromDashboard && <BackButton aria-label="Back to content dashboard" href={`/show-product?product_id=${encodeURIComponent(productId)}`}/>}
                <span>{language}</span>
                <button type="button" onClick={sharePage} className="business-public-link">
                    Share page <ArrowOutwardRoundedIcon fontSize="small"/>
                </button>
            </div>
        </header>
    );
}
