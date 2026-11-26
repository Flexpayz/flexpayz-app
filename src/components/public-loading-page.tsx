import {LoadingPanel} from "./design-system";
import {usePublicLanguage} from "../public-i18n";
import "./public-loading-page.css";

export function PublicLoadingPage() {
    const {t} = usePublicLanguage();

    return (
        <div className="public-loading-page">
            <LoadingPanel text={t("public.loading")}/>
        </div>
    );
}
