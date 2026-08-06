import {useEffect, useMemo, useState} from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import CircularProgress from "@mui/material/CircularProgress";
import {getMetadata, ref} from "firebase/storage";
import {storage} from "../App";
import {Product} from "../control-state";
import {downloadPublicDocument, shareCurrentPublicPage, sharePublicDocument} from "../public-documents";
import {
    UPLOAD_FILE_SLOTS,
    UploadFileMetadataState,
    UploadFilePublicDocument,
    UploadFileSlotId,
    getReadyUploadFileDocuments,
    getUploadFileStoragePath,
} from "../upload-files";
import {FlexPayzLogo, LoadingPanel} from "./design-system";

type MetadataBySlot = Record<UploadFileSlotId, UploadFileMetadataState>;
type DocumentActionStatus = Record<string, string>;

const emptyMetadata: MetadataBySlot = {
    file1: {exists: false},
    file2: {exists: false},
    file3: {exists: false},
};

export function UploadFilesPublicPage({product, productId}: {product: Product; productId: string}) {
    const [metadataBySlot, setMetadataBySlot] = useState<MetadataBySlot>(emptyMetadata);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [actionStatus, setActionStatus] = useState<DocumentActionStatus>({});
    const [pageShareStatus, setPageShareStatus] = useState("");

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
        setActionStatus((prev) => ({...prev, [key]: action === "download" ? "Downloading…" : "Preparing share…"}));
        const result = action === "download" ? await downloadPublicDocument(document) : await sharePublicDocument(document);
        if (result.status === "cancelled") {
            setActionStatus((prev) => ({...prev, [key]: "Share cancelled"}));
            return;
        }
        setActionStatus((prev) => ({
            ...prev,
            [key]: result.status === "success"
                ? action === "download" ? "Download ready" : "Shared"
                : result.message,
        }));
    };

    return (
        <div className="upload-files-public-page">
            <div className="upload-files-public-circles" aria-hidden="true"><span/><span/></div>
            <header className="upload-files-public-header">
                <FlexPayzLogo className="upload-files-public-logo"/>
                <div>
                    <button
                        type="button"
                        className="upload-files-public-language"
                        aria-label={`Profile language ${product.previewLanguage}`}
                    >
                        {product.previewLanguage}
                    </button>
                    <button
                        type="button"
                        className="upload-files-public-share"
                        onClick={async () => setPageShareStatus(await shareCurrentPublicPage())}
                    >
                        Share Page <ArrowOutwardRoundedIcon fontSize="small"/>
                    </button>
                </div>
            </header>

            <main className="upload-files-public-main">
                <section className="upload-files-public-hero">
                    <p className="business-kicker">{product.name || "FlexPayz product"}</p>
                    <h1>Shared documents</h1>
                    <p>Choose a document to download or share.</p>
                    <span>{documents.length === 1 ? "1 document" : `${documents.length} documents`}</span>
                </section>

                <section className="upload-files-public-panel" aria-label="Shared documents">
                    {status === "loading" && <UploadFilesPublicSkeleton/>}
                    {status === "error" && <UploadFilesPublicEmpty title="Documents unavailable" text="We could not load these shared documents."/>}
                    {status === "ready" && documents.length === 0 && <UploadFilesPublicEmpty title="No documents are ready" text="This device does not have public documents available yet."/>}
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
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>

            <footer className="upload-files-public-footer" aria-live="polite">
                <span>Secure · contactless · yours</span>
                <strong>{pageShareStatus || "Powered by FlexPayz"}</strong>
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
}: {
    document: UploadFilePublicDocument;
    downloadStatus?: string;
    shareStatus?: string;
    onDownload(): void;
    onShare(): void;
}) {
    const downloading = downloadStatus === "Downloading…";
    const sharing = shareStatus === "Preparing share…";

    return (
        <article className="upload-files-public-document">
            <span className="upload-files-public-pdf" aria-hidden="true"><DescriptionRoundedIcon/></span>
            <div>
                <p>DOCUMENT {document.slot.number}</p>
                <h2>{document.displayName}</h2>
                <small>{document.originalName} · PDF · {document.sizeLabel}</small>
                {(downloadStatus || shareStatus) && <em aria-live="polite">{downloadStatus || shareStatus}</em>}
            </div>
            <div>
                <button type="button" onClick={onDownload} disabled={downloading} aria-label={`Download ${document.displayName}`}>
                    {downloading ? <CircularProgress size={16} color="inherit"/> : <DownloadRoundedIcon fontSize="small"/>}
                    Download
                </button>
                <button type="button" onClick={onShare} disabled={sharing} aria-label={`Share ${document.displayName}`}>
                    {sharing ? <CircularProgress size={16} color="inherit"/> : <IosShareRoundedIcon fontSize="small"/>}
                    Share
                </button>
            </div>
        </article>
    );
}

function UploadFilesPublicSkeleton() {
    return (
        <div className="upload-files-public-skeleton">
            <LoadingPanel text="Loading shared documents"/>
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
