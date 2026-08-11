import {useEffect, useMemo, useState} from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import CircularProgress from "@mui/material/CircularProgress";
import {getMetadata, ref} from "firebase/storage";
import {storage} from "../App";
import {Product} from "../control-state";
import {downloadPublicDocument, sharePublicDocument} from "../public-documents";
import {
    UPLOAD_FILE_SLOTS,
    UploadFileMetadataState,
    UploadFilePublicDocument,
    UploadFileSlotId,
    getReadyUploadFileDocuments,
    getUploadFileStoragePath,
} from "../upload-files";
import {LoadingPanel} from "./design-system";
import {PublicPageHeader} from "./public-page-header";
import {TranslatePublicCopy, usePublicLanguage} from "../public-i18n";

type MetadataBySlot = Record<UploadFileSlotId, UploadFileMetadataState>;
type DocumentActionStatus = Record<string, string>;

const emptyMetadata: MetadataBySlot = {
    file1: {exists: false},
    file2: {exists: false},
    file3: {exists: false},
};

export function UploadFilesPublicPage({product, productId, fromDashboard = false}: {product: Product; productId: string; fromDashboard?: boolean}) {
    const [metadataBySlot, setMetadataBySlot] = useState<MetadataBySlot>(emptyMetadata);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [actionStatus, setActionStatus] = useState<DocumentActionStatus>({});
    const [pageShareStatus, setPageShareStatus] = useState("");
    const {t} = usePublicLanguage();

    useEffect(() => {
        let active = true;

        async function loadMetadata() {
            if (!productId) {
                setStatus("error");
                return;
            }
            const entries = await Promise.all(
                UPLOAD_FILE_SLOTS.map(async (slot) => {
                    try {
                        const metadata = await getMetadata(ref(storage, getUploadFileStoragePath(productId, slot)));
                        return [slot.id, {exists: true, metadata}] as const;
                    } catch (error: any) {
                        return [slot.id, {exists: false, error: error?.code === "storage/object-not-found" ? "missing" : "unavailable"}] as const;
                    }
                }),
            );
            if (!active) return;
            setMetadataBySlot(entries.reduce<MetadataBySlot>((next, [slotId, metadata]) => ({...next, [slotId]: metadata}), emptyMetadata));
            setStatus("ready");
        }

        loadMetadata();
        return () => {
            active = false;
        };
    }, [productId]);

    const documents = useMemo(() => getReadyUploadFileDocuments(product, productId, metadataBySlot), [metadataBySlot, product, productId]);

    const runDocumentAction = async (document: UploadFilePublicDocument, action: "download" | "share") => {
        const key = `${document.slot.id}-${action}`;
        setActionStatus((prev) => ({...prev, [key]: action === "download" ? t("files.downloading") : t("files.preparingShare")}));
        const result = action === "download" ? await downloadPublicDocument(document) : await sharePublicDocument(document);
        if (result.status === "cancelled") {
            setActionStatus((prev) => ({...prev, [key]: t("files.shareCancelled")}));
            return;
        }
        setActionStatus((prev) => ({
            ...prev,
            [key]: result.status === "success"
                ? action === "download" ? t("files.downloadReady") : t("files.shared")
                : result.message,
        }));
    };

    return (
        <div className="upload-files-public-page">
            <div className="upload-files-public-circles" aria-hidden="true"><span/><span/></div>
            <PublicPageHeader productId={productId} fromDashboard={fromDashboard} shareTitle={t("files.shareTitle", {name: product.name || "FlexPayz"})} onShareMessage={setPageShareStatus}/>

            <main className="upload-files-public-main">
                <section className="upload-files-public-hero">
                    <p className="business-kicker">{product.name || t("files.kickerFallback")}</p>
                    <h1>{t("files.title")}</h1>
                    <p>{t("files.description")}</p>
                    <span>{documents.length === 1 ? t("files.count.one") : t("files.count.other", {count: documents.length})}</span>
                </section>

                <section className="upload-files-public-panel" aria-label={t("files.panelLabel")}>
                    {status === "loading" && <UploadFilesPublicSkeleton t={t}/>}
                    {status === "error" && <UploadFilesPublicEmpty title={t("files.error.title")} text={t("files.error.message")}/>}
                    {status === "ready" && documents.length === 0 && <UploadFilesPublicEmpty title={t("files.empty.title")} text={t("files.empty.message")}/>}
                    {status === "ready" && documents.length > 0 && (
                        <ul className="upload-files-public-list">
                            {documents.map((document) => (
                                <li key={document.slot.id}>
                                    <DocumentRow
                                        document={document}
                                        downloadStatus={actionStatus[`${document.slot.id}-download`]}
                                        shareStatus={actionStatus[`${document.slot.id}-share`]}
                                        onDownload={() => runDocumentAction(document, "download")}
                                        onShare={() => runDocumentAction(document, "share")}
                                        t={t}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>

            <footer className="upload-files-public-footer" aria-live="polite">
                <span>{pageShareStatus || t("public.footer.secure")}</span>
            </footer>
        </div>
    );
}

function DocumentRow({
    document,
    downloadStatus,
    shareStatus,
    onDownload,
    onShare,
    t,
}: {
    document: UploadFilePublicDocument;
    downloadStatus?: string;
    shareStatus?: string;
    onDownload(): void;
    onShare(): void;
    t: TranslatePublicCopy;
}) {
    const downloading = downloadStatus === t("files.downloading");
    const sharing = shareStatus === t("files.preparingShare");

    return (
        <article className="upload-files-public-document">
            <span className="upload-files-public-pdf" aria-hidden="true"><DescriptionRoundedIcon/></span>
            <div>
                <p>{t("files.document", {number: document.slot.number})}</p>
                <h2>{document.displayName}</h2>
                <small>{document.originalName} · PDF · {document.sizeLabel}</small>
                {(downloadStatus || shareStatus) && <em aria-live="polite">{downloadStatus || shareStatus}</em>}
            </div>
            <div>
                <button type="button" onClick={onDownload} disabled={downloading} aria-label={`Download ${document.displayName}`}>
                    {downloading ? <CircularProgress size={16} color="inherit"/> : <DownloadRoundedIcon fontSize="small"/>}
                    {t("files.download")}
                </button>
                <button type="button" onClick={onShare} disabled={sharing} aria-label={`Share ${document.displayName}`}>
                    {sharing ? <CircularProgress size={16} color="inherit"/> : <IosShareRoundedIcon fontSize="small"/>}
                    {t("files.share")}
                </button>
            </div>
        </article>
    );
}

function UploadFilesPublicSkeleton({t}: {t: TranslatePublicCopy}) {
    return (
        <div className="upload-files-public-skeleton">
            <LoadingPanel text={t("files.loading")}/>
        </div>
    );
}

function UploadFilesPublicEmpty({title, text}: {title: string; text: string}) {
    return (
        <div className="upload-files-public-empty">
            <span aria-hidden="true"><ContentCopyRoundedIcon/></span>
            <h2>{title}</h2>
            <p>{text}</p>
        </div>
    );
}
