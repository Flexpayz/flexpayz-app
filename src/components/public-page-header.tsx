import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import {BackButton, FlexPayzLogo} from "./design-system";
import {PUBLIC_LANGUAGES, usePublicLanguage, withPublicLanguageParam} from "../public-i18n";
import {Languages} from "../languages";

type PublicPageHeaderProps = {
    productId: string;
    fromDashboard?: boolean;
    shareTitle?: string;
    onShareMessage?: (message: string) => void;
};

export function PublicPageHeader({
    productId,
    fromDashboard = false,
    shareTitle = "FlexPayz public page",
    onShareMessage,
}: PublicPageHeaderProps) {
    const {language, t} = usePublicLanguage();

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
            onShareMessage?.(t("public.share.copied"));
        } catch {
            onShareMessage?.(t("public.share.copyUrl"));
        }
    };

    return (
        <header className="business-public-topbar public-page-header">
            <FlexPayzLogo className="business-public-logo"/>
            <div>
                {fromDashboard && <BackButton aria-label={t("public.back.dashboard")} href={withPublicLanguageParam(`/show-product?product_id=${encodeURIComponent(productId)}`, language)}/>}
                <PublicLanguagePicker/>
                <button type="button" onClick={sharePage} className="business-public-link public-share-icon-button" aria-label={t("public.header.share")}>
                    <IosShareRoundedIcon fontSize="small"/>
                </button>
            </div>
        </header>
    );
}

export function PublicLanguagePicker() {
    const {language, setLanguage, t} = usePublicLanguage();

    return (
        <label className="public-language-picker">
            <span>{PUBLIC_LANGUAGES[language].shortLabel}</span>
            <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Languages)}
                aria-label={t("public.header.language")}
            >
                {Object.values(Languages).map((option) => (
                    <option key={option} value={option}>{PUBLIC_LANGUAGES[option].shortLabel}</option>
                ))}
            </select>
        </label>
    );
}
