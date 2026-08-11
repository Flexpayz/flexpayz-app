import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {Box, Stack} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import {QRCodeCanvas} from "qrcode.react";
import {jsPDF} from "jspdf";
import {AppButton, LoadingPanel, Surface} from "../../components/design-system";
import {getAdminProduct} from "../../firestore/repositories/adminProducts";
import {Preview} from "../../preview";
import {
    AdminProduct,
    CONTENT_LABELS,
    getContentLabels,
    getDisplayStatusLabel,
} from "./adminProductModel";

type DetailsState =
    | {status: "loading"}
    | {status: "loaded"; product: AdminProduct}
    | {status: "missing"}
    | {status: "error"; message: string};

type DetailsTab = "overview" | "access" | "ownership" | "activity";

const TABS: Array<{id: DetailsTab; label: string}> = [
    {id: "overview", label: "Overview"},
    {id: "access", label: "Access"},
    {id: "ownership", label: "Ownership & serial"},
    {id: "activity", label: "Activity"},
];

export function AdminProductDetailsPage() {
    const {productId = ""} = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState<DetailsState>({status: "loading"});
    const activeTab = normalizeTab(searchParams.get("tab"));

    const loadProduct = async () => {
        if (!productId) {
            setState({status: "missing"});
            return;
        }
        setState({status: "loading"});
        try {
            const product = await getAdminProduct(productId);
            setState(product ? {status: "loaded", product} : {status: "missing"});
        } catch (error) {
            setState({status: "error", message: error instanceof Error ? error.message : "Product could not be loaded."});
        }
    };

    useEffect(() => {
        loadProduct();
    }, [productId]);

    const setTab = (tab: DetailsTab) => {
        const next = new URLSearchParams(searchParams);
        next.set("tab", tab);
        setSearchParams(next);
    };

    if (state.status === "loading") return <LoadingPanel text="Loading product details"/>;
    if (state.status === "missing") {
        return (
            <Surface className="admin-products-state">
                <strong>Product not found</strong>
                <p>The product may have been deleted or the ID is incorrect.</p>
                <AppButton variant="contained" onClick={() => navigate("/admin/products")}>Back to products</AppButton>
            </Surface>
        );
    }
    if (state.status === "error") {
        return (
            <Surface className="admin-products-state" role="alert">
                <strong>Could not load product</strong>
                <p>{state.message}</p>
                <AppButton variant="contained" onClick={loadProduct}>Retry</AppButton>
            </Surface>
        );
    }

    const product = state.product;

    return (
        <Stack spacing={4} className="admin-product-details">
            <Surface className="admin-product-detail-header">
                <Stack spacing={3}>
                    <Box className="admin-product-detail-title">
                        <Box>
                            <Box component="p" className="fp-typography-eyebrow">{product.productType || "Unknown product type"}</Box>
                            <Box component="h2" className="fp-typography-heading">{product.name}</Box>
                            <Box component="p" className="admin-muted">{product.id}</Box>
                        </Box>
                        <span className={`admin-status-pill admin-status-${product.displayStatus}`}>{getDisplayStatusLabel(product.displayStatus)}</span>
                    </Box>

                    <Box className="admin-detail-summary-grid">
                        <SummaryItem label="Owner" value={formatOwner(product)}/>
                        <SummaryItem label="Serial" value={product.serials[0]?.serialNumber || "Not assigned"}/>
                        <SummaryItem label="Unlock code" value={product.unlockCode || "Unknown"}/>
                        <SummaryItem label="Updated" value={formatDate(product.updatedAt)}/>
                    </Box>

                    <Box className="admin-detail-actions">
                        {product.displayStatus === "suspended" || product.displayStatus === "archived" ? (
                            <AppButton variant="outlined" disabled>Public page unavailable</AppButton>
                        ) : (
                            <AppButton variant="contained" onClick={() => window.open(product.publicUrl, "_blank", "noopener,noreferrer")} endIcon={<OpenInNewRoundedIcon/>}>
                                Open public page
                            </AppButton>
                        )}
                        <AppButton variant="outlined" onClick={() => copyText(product.publicUrl)} startIcon={<ContentCopyRoundedIcon/>}>Copy public link</AppButton>
                        <AppButton variant="outlined" onClick={() => setTab("overview")} startIcon={<PrintRoundedIcon/>}>Print assets</AppButton>
                    </Box>
                </Stack>
            </Surface>

            {product.dataHealth.length > 0 && (
                <Surface className="admin-health-panel">
                    <strong>Data health</strong>
                    <ul>
                        {product.dataHealth.map((issue) => (
                            <li key={`${issue.code}-${issue.message}`}><span>{issue.severity}</span>{issue.message}</li>
                        ))}
                    </ul>
                </Surface>
            )}

            <Box className="admin-tabs" role="tablist" aria-label="Product details tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        className={activeTab === tab.id ? "admin-tab admin-tab-active" : "admin-tab"}
                        onClick={() => setTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </Box>

            {activeTab === "overview" && <OverviewTab product={product}/>}
            {activeTab === "access" && <AccessTab product={product}/>}
            {activeTab === "ownership" && <OwnershipTab product={product}/>}
            {activeTab === "activity" && <ActivityTab/>}
        </Stack>
    );
}

function OverviewTab({product}: {product: AdminProduct}) {
    return (
        <Box className="admin-detail-grid">
            <Surface>
                <h3>Product identity</h3>
                <DefinitionList items={[
                    ["Name", product.name],
                    ["Product type", product.productType || "Unknown product type"],
                    ["Product ID", product.id],
                    ["Created", formatDate(product.createdAt)],
                    ["Updated", formatDate(product.updatedAt)],
                ]}/>
            </Surface>
            <Surface>
                <h3>Public experience</h3>
                <DefinitionList items={[
                    ["Public URL", product.publicUrl],
                    ["Public-page status", getDisplayStatusLabel(product.displayStatus)],
                    ["Selected content", getContentLabels(product.selectedContent).join(", ")],
                    ["Effective access", product.dataHealth.length ? `${product.dataHealth.length} issue(s)` : "Allowed by capabilities"],
                ]}/>
            </Surface>
            <Surface>
                <h3>Ownership</h3>
                <DefinitionList items={[
                    ["Owner", formatOwner(product)],
                    ["Owner UID", product.ownership.ownerId || "Unassigned"],
                    ["Owner email", product.owner?.email || "Unknown"],
                    ["Transfer", product.transferInvitation?.status || "No pending transfer"],
                ]}/>
            </Surface>
            <Surface>
                <h3>Serial and activation</h3>
                <DefinitionList items={[
                    ["Serial", product.serials[0]?.serialNumber || "Not assigned"],
                    ["Unlock code", product.unlockCode || "Unknown"],
                    ["Redirect type", product.serials[0]?.type || "Unknown"],
                    ["Mapping health", product.serialState === "conflict" ? "Conflict" : "Valid"],
                ]}/>
            </Surface>
            <PrintableAssets product={product}/>
        </Box>
    );
}

function AccessTab({product}: {product: AdminProduct}) {
    const rows = Object.entries(CONTENT_LABELS).map(([preview, label]) => {
        const key = permissionKey(preview as Preview);
        const enabled = key ? product.capabilities.permissions[key] : false;
        const selected = product.selectedContent.includes(preview as Preview);
        const entitlement = "Unknown";
        const effective = enabled && selected;
        return {preview, label, enabled, selected, entitlement, effective};
    });

    return (
        <Surface className="admin-access-tab">
            <Box className="admin-section-heading">
                <h3>Product capabilities</h3>
                <p>System admins edit product capabilities. Subscription entitlements are not implemented yet, so they are shown as unknown.</p>
            </Box>
            <table className="admin-product-table">
                <thead><tr><th>Capability</th><th>Enabled</th><th>User selected</th><th>Subscription</th><th>Effective</th><th>Reason</th></tr></thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={row.preview}>
                        <td><strong>{row.label}</strong></td>
                        <td>{row.enabled ? "Enabled" : "Disabled"}</td>
                        <td>{row.selected ? "Selected" : "Not selected"}</td>
                        <td>{row.entitlement}</td>
                        <td>{row.effective ? "Available" : "Unavailable"}</td>
                        <td>{row.effective ? "Enabled and selected" : "Capability disabled, not selected or entitlement unknown"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            <DisabledMutation label="Capability editing requires a trusted backend mutation with audit logging."/>
        </Surface>
    );
}

function OwnershipTab({product}: {product: AdminProduct}) {
    return (
        <Stack spacing={4}>
            <Surface>
                <h3>Current ownership</h3>
                <DefinitionList items={[
                    ["Display name", product.owner?.displayName || "Unknown"],
                    ["Email", product.owner?.email || "Unknown"],
                    ["UID", product.ownership.ownerId || "Unassigned"],
                    ["Activation date", "Unknown"],
                ]}/>
                <Box className="admin-detail-actions">
                    <DisabledMutation label="Transfer ownership requires backend reset, user assignment and audit infrastructure."/>
                    <DisabledMutation label="Unlink ownership requires backend content cleanup, Storage cleanup and audit infrastructure."/>
                </Box>
            </Surface>
            <Surface>
                <h3>Serial management</h3>
                <DefinitionList items={[
                    ["Serial", product.serials[0]?.serialNumber || "Not assigned"],
                    ["Mapping", product.serialState === "conflict" ? "Conflict" : "Valid"],
                    ["Type", product.serials[0]?.type || "Unknown"],
                ]}/>
                <DisabledMutation label="Serial assignment and reassignment require an atomic trusted backend mutation."/>
            </Surface>
            <Surface>
                <h3>Lifecycle</h3>
                <DefinitionList items={[
                    ["Administrative status", product.administrativeStatus],
                    ["Public access", product.displayStatus === "suspended" || product.displayStatus === "archived" ? "Unavailable" : "Available when active content is permitted"],
                ]}/>
                <Box className="admin-detail-actions">
                    <DisabledMutation label="Suspend and resume require a trusted backend mutation with a reason and audit entry."/>
                    <DisabledMutation label="Archive and restore require a trusted backend mutation with confirmation and audit entry."/>
                </Box>
            </Surface>
        </Stack>
    );
}

function ActivityTab() {
    return (
        <Surface>
            <h3>Activity</h3>
            <p className="admin-muted">No audit collection is present in this repository yet. Activity will appear here after trusted backend mutations record safe audit entries.</p>
        </Surface>
    );
}

function PrintableAssets({product}: {product: AdminProduct}) {
    const qrRef = useRef<HTMLCanvasElement>(null);
    const canPrint = product.displayStatus !== "archived";

    const downloadQr = () => {
        const canvas = qrRef.current;
        if (!canvas) return;
        downloadUrl(canvas.toDataURL("image/png"), `qr-code-${product.id}.png`);
    };

    const printQr = () => {
        const canvas = qrRef.current;
        if (!canvas) return;
        const image = canvas.toDataURL("image/png");
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`<img src="${image}" alt="QR code" style="width:30mm;height:30mm;" />`);
        printWindow.document.close();
        printWindow.print();
    };

    const createUnlockCodePdf = () => {
        const pdf = new jsPDF({orientation: "landscape", unit: "mm", format: [30, 15]});
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text("UNLOCK CODE", 15, 4, {align: "center"});
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(18);
        pdf.text(product.unlockCode || "UNKNOWN", 15, 11, {align: "center"});
        return pdf;
    };

    return (
        <Surface>
            <h3>Printable assets</h3>
            <Box className="admin-print-grid">
                <QRCodeCanvas value={product.publicUrl} size={144} ref={qrRef}/>
                <Stack spacing={2}>
                    <AppButton variant="outlined" onClick={() => copyText(product.publicUrl)} startIcon={<ContentCopyRoundedIcon/>}>Copy public link</AppButton>
                    <AppButton variant="outlined" onClick={downloadQr} startIcon={<DownloadRoundedIcon/>} disabled={!canPrint}>Download QR</AppButton>
                    <AppButton variant="outlined" onClick={printQr} startIcon={<PrintRoundedIcon/>} disabled={!canPrint}>Print QR label</AppButton>
                    <AppButton variant="outlined" onClick={() => createUnlockCodePdf().save(`unlock_code_${product.id}.pdf`)} startIcon={<DownloadRoundedIcon/>}>Download unlock-code PDF</AppButton>
                    <AppButton variant="outlined" onClick={() => createUnlockCodePdf().autoPrint().output("dataurlnewwindow")} startIcon={<PrintRoundedIcon/>}>Print unlock-code label</AppButton>
                </Stack>
            </Box>
        </Surface>
    );
}

function SummaryItem({label, value}: {label: string; value: string}) {
    return <div><span>{label}</span><strong>{value}</strong></div>;
}

function DefinitionList({items}: {items: Array<[string, string]>}) {
    return (
        <dl className="admin-definition-list">
            {items.map(([label, value]) => (
                <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function DisabledMutation({label}: {label: string}) {
    return <Box className="admin-disabled-mutation">{label}</Box>;
}

function permissionKey(preview: Preview): keyof AdminProduct["capabilities"]["permissions"] | null {
    const map: Record<Preview, keyof AdminProduct["capabilities"]["permissions"]> = {
        [Preview.BUSINESS_CARD]: "business_card",
        [Preview.CUSTOM_LINK]: "custom_link",
        [Preview.UPLOAD_FILE]: "upload_files",
        [Preview.UPLOAD_VIDEO]: "upload_video",
        [Preview.UPLOAD_SONGS]: "upload_songs",
        [Preview.BABY_JOURNAL]: "baby_journal",
        [Preview.ADULT_JOURNAL]: "adult_journal",
        [Preview.ANIMAL_TAG]: "animal_tag",
    };
    return map[preview] || null;
}

function formatOwner(product: AdminProduct) {
    if (product.ownershipState === "available") return "Available";
    if (product.ownershipState === "legacy-unresolved") return "Legacy owner unresolved";
    return product.owner?.email || product.owner?.displayName || product.ownership.ownerId || "Unknown owner";
}

function formatDate(value: Date | null) {
    return value ? new Intl.DateTimeFormat("en", {dateStyle: "medium", timeStyle: "short"}).format(value) : "Unknown";
}

function copyText(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
}

function downloadUrl(url: string, filename: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function normalizeTab(value: string | null): DetailsTab {
    return TABS.some((tab) => tab.id === value) ? value as DetailsTab : "overview";
}
