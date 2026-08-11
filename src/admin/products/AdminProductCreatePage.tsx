import {ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState} from "react";
import type {RefObject} from "react";
import {useNavigate} from "react-router-dom";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import Papa from "papaparse";
import {QRCodeCanvas} from "qrcode.react";
import {jsPDF} from "jspdf";
import {Box, LinearProgress, Stack} from "@mui/material";
import {AppButton, LoadingPanel, Surface} from "../../components/design-system";
import {
    AdminProductCreationBackendUnavailableError,
    requestAdminProductCreation,
} from "../../firestore/repositories/adminProductCreation";
import {
    CapabilityId,
    draftToCreationRequest,
    emptyProductCreationDraft,
    getCapabilityLabels,
    getDefaultProductName,
    MAX_PRODUCT_CREATION_QUANTITY,
    normalizeProductCreationDraft,
    PRODUCT_CAPABILITIES,
    PRODUCT_TYPE_LABELS,
    ProductCreationDraft,
    ProductCreationResultItem,
    ProductCreationValidationError,
    requiredAuxiliaryCollections,
    validateProductCreationDraft,
    productCreationResultsToCsvRows,
} from "./productCreationModel";

type Step = "configure" | "review" | "create" | "results";

const STEPS: Array<{id: Step; label: string}> = [
    {id: "configure", label: "Configure"},
    {id: "review", label: "Review"},
    {id: "create", label: "Create"},
    {id: "results", label: "Results"},
];

export function AdminProductCreatePage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>("configure");
    const [draft, setDraft] = useState<ProductCreationDraft>(emptyProductCreationDraft);
    const [errors, setErrors] = useState<ProductCreationValidationError[]>([]);
    const [creating, setCreating] = useState(false);
    const [results, setResults] = useState<ProductCreationResultItem[]>([]);
    const [downloadedResults, setDownloadedResults] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const errorSummaryRef = useRef<HTMLDivElement>(null);

    const normalizedDraft = useMemo(() => normalizeProductCreationDraft(draft), [draft]);
    const auxiliaryCollections = useMemo(() => requiredAuxiliaryCollections(normalizedDraft.capabilities), [normalizedDraft.capabilities]);
    const successfulResults = results.filter((result) => result.status === "created");
    const failedResults = results.filter((result) => result.status === "failed");

    useEffect(() => {
        headingRef.current?.focus();
    }, [step]);

    useEffect(() => {
        const handler = (event: BeforeUnloadEvent) => {
            if (!creating && (results.length === 0 || downloadedResults)) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [creating, downloadedResults, results.length]);

    const updateDraft = <K extends keyof ProductCreationDraft>(key: K, value: ProductCreationDraft[K]) => {
        setDraft((current) => {
            const next = {...current, [key]: value};
            if (key === "mode" && value === "single") next.quantity = 1;
            return next;
        });
        setErrors((current) => current.filter((error) => error.field !== key && error.field !== "form"));
    };

    const toggleCapability = (capability: CapabilityId) => {
        updateDraft("capabilities", draft.capabilities.includes(capability)
            ? draft.capabilities.filter((selected) => selected !== capability)
            : [...draft.capabilities, capability]);
    };

    const goReview = (event: FormEvent) => {
        event.preventDefault();
        const nextDraft = normalizeProductCreationDraft(draft);
        const validationErrors = validateProductCreationDraft(nextDraft);
        setDraft(nextDraft);
        setErrors(validationErrors);
        if (validationErrors.length > 0) {
            window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
            return;
        }
        setStep("review");
    };

    const createProducts = async () => {
        const validationErrors = validateProductCreationDraft(normalizedDraft);
        setErrors(validationErrors);
        if (validationErrors.length > 0) {
            setStep("configure");
            window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
            return;
        }

        setCreating(true);
        setDownloadedResults(false);
        setResults([]);
        setStep("create");
        const request = draftToCreationRequest(normalizedDraft, createClientRequestId());
        try {
            const response = await requestAdminProductCreation(request);
            setResults(response.results);
        } catch (error) {
            setResults(buildFailedResults(normalizedDraft, error));
        } finally {
            setCreating(false);
            setStep("results");
        }
    };

    const retryFailed = async () => {
        if (failedResults.length === 0 || creating) return;
        const retryDraft: ProductCreationDraft = {
            ...normalizedDraft,
            mode: failedResults.length === 1 ? "single" : "multiple",
            quantity: failedResults.length,
        };
        setDraft(retryDraft);
        setResults([]);
        setDownloadedResults(false);
        setCreating(true);
        setStep("create");
        try {
            const response = await requestAdminProductCreation(draftToCreationRequest(retryDraft, createClientRequestId()));
            setResults(response.results);
        } catch (error) {
            setResults(buildFailedResults(retryDraft, error));
        } finally {
            setCreating(false);
            setStep("results");
        }
    };

    const resetFlow = () => {
        if (!confirmDiscardResults()) return;
        setStep("configure");
        setDraft(emptyProductCreationDraft);
        setErrors([]);
        setResults([]);
        setDownloadedResults(false);
    };

    const confirmDiscardResults = () => {
        if (results.length === 0 || downloadedResults) return true;
        return window.confirm("Creation results are only kept in this page session and include unlock codes. Continue without downloading them?");
    };

    return (
        <Stack spacing={4} className="admin-product-create">
            <Surface className="admin-product-create-header">
                <Stack spacing={3}>
                    <Box>
                        <Box component="p" className="fp-typography-eyebrow">Products</Box>
                        <Box component="h2" className="fp-typography-heading" tabIndex={-1} ref={headingRef}>
                            Create products
                        </Box>
                        <Box component="p" className="admin-muted">
                            Configure unowned, active inventory without serial numbers. Secure creation requires the trusted backend function.
                        </Box>
                    </Box>
                    <StepIndicator activeStep={step}/>
                </Stack>
            </Surface>

            {step === "configure" && (
                <ConfigureStep
                    draft={draft}
                    errors={errors}
                    errorSummaryRef={errorSummaryRef}
                    creating={creating}
                    onSubmit={goReview}
                    onDraftChange={updateDraft}
                    onToggleCapability={toggleCapability}
                />
            )}

            {step === "review" && (
                <ReviewStep
                    draft={normalizedDraft}
                    auxiliaryCount={auxiliaryCollections.length}
                    onBack={() => setStep("configure")}
                    onCreate={createProducts}
                    creating={creating}
                />
            )}

            {step === "create" && (
                <Surface aria-live="polite">
                    <Stack spacing={3}>
                        <LoadingPanel text="Creating products through the trusted backend"/>
                        <LinearProgress/>
                        <Box className="admin-muted">
                            Do not close this page while the creation request is running. Precise progress will appear when the backend exposes progress events.
                        </Box>
                    </Stack>
                </Surface>
            )}

            {step === "results" && (
                <ResultsStep
                    results={results}
                    successfulResults={successfulResults}
                    failedResults={failedResults}
                    downloadedResults={downloadedResults}
                    onDownload={(rows, filename) => {
                        downloadCsv(rows, filename);
                        setDownloadedResults(true);
                    }}
                    onRetryFailed={retryFailed}
                    onReturnToProducts={() => {
                        if (confirmDiscardResults()) navigate("/admin/products");
                    }}
                    onCreateMore={resetFlow}
                />
            )}
        </Stack>
    );
}

function ConfigureStep({
    draft,
    errors,
    errorSummaryRef,
    creating,
    onSubmit,
    onDraftChange,
    onToggleCapability,
}: {
    draft: ProductCreationDraft;
    errors: ProductCreationValidationError[];
    errorSummaryRef: RefObject<HTMLDivElement>;
    creating: boolean;
    onSubmit: (event: FormEvent) => void;
    onDraftChange: <K extends keyof ProductCreationDraft>(key: K, value: ProductCreationDraft[K]) => void;
    onToggleCapability: (capability: CapabilityId) => void;
}) {
    return (
        <Surface>
            <form className="admin-create-form" onSubmit={onSubmit} noValidate>
                {errors.length > 0 && (
                    <Box className="admin-error-summary" role="alert" tabIndex={-1} ref={errorSummaryRef}>
                        <strong>Review the creation settings</strong>
                        <ul>{errors.map((error) => <li key={`${error.field}-${error.message}`}>{error.message}</li>)}</ul>
                    </Box>
                )}

                <Box className="admin-create-grid">
                    <fieldset className="admin-fieldset" disabled={creating}>
                        <legend>Creation mode</legend>
                        <label className="admin-radio-card">
                            <input
                                type="radio"
                                name="creationMode"
                                value="single"
                                checked={draft.mode === "single"}
                                onChange={() => onDraftChange("mode", "single")}
                            />
                            <span><strong>Single product</strong><small>Create one product with an optional custom name.</small></span>
                        </label>
                        <label className="admin-radio-card">
                            <input
                                type="radio"
                                name="creationMode"
                                value="multiple"
                                checked={draft.mode === "multiple"}
                                onChange={() => onDraftChange("mode", "multiple")}
                            />
                            <span><strong>Multiple products</strong><small>Create a quantity-based batch without a persistent batch record.</small></span>
                        </label>
                    </fieldset>

                    <fieldset className="admin-fieldset" disabled={creating}>
                        <legend>Product details</legend>
                        <label className="admin-form-control">
                            <span>Product type</span>
                            <select
                                value={draft.productType}
                                onChange={(event) => onDraftChange("productType", event.target.value as ProductCreationDraft["productType"])}
                            >
                                {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>
                        {draft.mode === "multiple" && (
                            <label className="admin-form-control">
                                <span>Quantity</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={MAX_PRODUCT_CREATION_QUANTITY}
                                    value={draft.quantity}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => onDraftChange("quantity", Number(event.target.value))}
                                />
                                <small>Maximum {MAX_PRODUCT_CREATION_QUANTITY}. This conservative limit keeps the future backend inside Firestore batch limits.</small>
                            </label>
                        )}
                        <label className="admin-form-control">
                            <span>{draft.mode === "single" ? "Product name" : "Shared product name"}</span>
                            <input
                                type="text"
                                value={draft.name}
                                placeholder={PRODUCT_TYPE_LABELS[draft.productType]}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => onDraftChange("name", event.target.value)}
                            />
                            <small>Optional. If blank, products use the selected product-type label.</small>
                        </label>
                    </fieldset>
                </Box>

                <fieldset className="admin-fieldset admin-capability-fieldset" disabled={creating}>
                    <legend>Content capabilities</legend>
                    <p className="admin-muted">Select at least one capability. Nothing is preselected and no capability is enabled from product type automatically.</p>
                    <Box className="admin-capability-grid">
                        {PRODUCT_CAPABILITIES.map((capability) => {
                            const checked = draft.capabilities.includes(capability.id);
                            return (
                                <label key={capability.id} className={`admin-capability-card${checked ? " admin-capability-card-selected" : ""}`}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggleCapability(capability.id)}
                                    />
                                    <span>
                                        <strong>{capability.label}</strong>
                                        <small>{capability.description}</small>
                                    </span>
                                </label>
                            );
                        })}
                    </Box>
                </fieldset>

                <Box className="admin-detail-actions">
                    <AppButton type="submit" variant="contained" disabled={creating}>Review creation</AppButton>
                    <AppButton type="button" variant="outlined" onClick={() => window.history.back()} disabled={creating}>Cancel</AppButton>
                </Box>
            </form>
        </Surface>
    );
}

function ReviewStep({
    draft,
    auxiliaryCount,
    onBack,
    onCreate,
    creating,
}: {
    draft: ProductCreationDraft;
    auxiliaryCount: number;
    onBack: () => void;
    onCreate: () => void;
    creating: boolean;
}) {
    const relatedDocumentsPerProduct = 1 + auxiliaryCount;
    const totalRelatedDocuments = draft.quantity * relatedDocumentsPerProduct;
    const productName = getDefaultProductName(draft.productType, draft.name);

    return (
        <Stack spacing={4}>
            <Surface>
                <Stack spacing={3}>
                    <Box className="admin-section-heading">
                        <Box>
                            <h3>Review creation</h3>
                            <p>Nothing is written until you confirm this step.</p>
                        </Box>
                    </Box>
                    <dl className="admin-definition-list">
                        <div><dt>Creation mode</dt><dd>{draft.mode === "single" ? "Single product" : "Multiple products"}</dd></div>
                        <div><dt>Product type</dt><dd>{PRODUCT_TYPE_LABELS[draft.productType]}</dd></div>
                        <div><dt>Quantity</dt><dd>{String(draft.quantity)}</dd></div>
                        <div><dt>Product name</dt><dd>{productName}</dd></div>
                        <div><dt>Capabilities</dt><dd>{getCapabilityLabels(draft.capabilities).join(", ")}</dd></div>
                        <div><dt>Product documents</dt><dd>{String(draft.quantity)}</dd></div>
                        <div><dt>Related documents</dt><dd>{String(totalRelatedDocuments)} permissions/content document writes</dd></div>
                        <div><dt>Serial numbers</dt><dd>No serial numbers will be generated or assigned.</dd></div>
                        <div><dt>Ownership</dt><dd>Products will be available and unowned.</dd></div>
                        <div><dt>Results</dt><dd>CSV download is available after creation. No persistent batch record is created.</dd></div>
                    </dl>
                    {draft.quantity > 100 && (
                        <Box className="admin-products-warning">
                            Large creation requests may take time and can complete partially if an operational error occurs.
                        </Box>
                    )}
                    <Box className="admin-detail-actions">
                        <AppButton variant="outlined" onClick={onBack} disabled={creating}>Back</AppButton>
                        <AppButton variant="contained" onClick={onCreate} disabled={creating}>
                            {draft.quantity === 1 ? "Create product" : `Create ${draft.quantity} products`}
                        </AppButton>
                    </Box>
                </Stack>
            </Surface>
            <Surface tone="soft">
                <strong>Backend required</strong>
                <p className="admin-muted">
                    This action calls the trusted `createAdminProducts` callable function. If it is not deployed, the request will fail without creating browser-side products.
                </p>
            </Surface>
        </Stack>
    );
}

function ResultsStep({
    results,
    successfulResults,
    failedResults,
    downloadedResults,
    onDownload,
    onRetryFailed,
    onReturnToProducts,
    onCreateMore,
}: {
    results: ProductCreationResultItem[];
    successfulResults: ProductCreationResultItem[];
    failedResults: ProductCreationResultItem[];
    downloadedResults: boolean;
    onDownload: (rows: ProductCreationResultItem[], filename: string) => void;
    onRetryFailed: () => void;
    onReturnToProducts: () => void;
    onCreateMore: () => void;
}) {
    const singleSuccess = results.length === 1 && results[0].status === "created" ? results[0] : null;

    return (
        <Stack spacing={4}>
            <Surface>
                <Stack spacing={3}>
                    <Box className="admin-section-heading">
                        <Box>
                            <h3>{failedResults.length === 0 ? "Creation results" : "Creation needs attention"}</h3>
                            <p>{successfulResults.length} created, {failedResults.length} failed. Download results before leaving this page.</p>
                        </Box>
                    </Box>
                    {!downloadedResults && results.length > 0 && (
                        <Box className="admin-products-warning">These results are only kept in this page session and include unlock codes.</Box>
                    )}
                    {singleSuccess && <SingleSuccessAssets result={singleSuccess}/>}
                    <ResultsTable results={results}/>
                    <Box className="admin-detail-actions">
                        <AppButton variant="contained" onClick={() => onDownload(results, "product_creation_results.csv")} startIcon={<DownloadRoundedIcon/>} disabled={results.length === 0}>
                            Download results CSV
                        </AppButton>
                        <AppButton variant="outlined" onClick={() => onDownload(failedResults, "product_creation_failed_rows.csv")} disabled={failedResults.length === 0}>
                            Download failed rows CSV
                        </AppButton>
                        <AppButton variant="outlined" onClick={onRetryFailed} startIcon={<ReplayRoundedIcon/>} disabled={failedResults.length === 0}>
                            Retry failed products
                        </AppButton>
                        <AppButton variant="outlined" onClick={onReturnToProducts}>Return to Products</AppButton>
                        <AppButton variant="outlined" onClick={onCreateMore}>Create more products</AppButton>
                    </Box>
                </Stack>
            </Surface>
        </Stack>
    );
}

function ResultsTable({results}: {results: ProductCreationResultItem[]}) {
    if (results.length === 0) {
        return <Box className="admin-muted">No result rows were returned.</Box>;
    }

    return (
        <Box className="admin-product-table-wrap">
            <table className="admin-product-table">
                <thead>
                <tr>
                    <th>Result</th>
                    <th>Product ID</th>
                    <th>Unlock code</th>
                    <th>Product type</th>
                    <th>Capabilities</th>
                    <th>Error</th>
                    <th>Action</th>
                </tr>
                </thead>
                <tbody>
                {results.map((result) => (
                    <tr key={result.requestItemId}>
                        <td>{result.status === "created" ? "Created" : "Failed"}</td>
                        <td>{result.productId || "Not created"}</td>
                        <td>{result.unlockCode || "Unavailable"}</td>
                        <td>{PRODUCT_TYPE_LABELS[result.productType]}</td>
                        <td>{getCapabilityLabels(result.capabilities).join(", ")}</td>
                        <td>{result.error || ""}</td>
                        <td>
                            {result.productId ? (
                                <AppButton variant="outlined" href={`/admin/products/${result.productId}`} endIcon={<OpenInNewRoundedIcon/>}>
                                    Details
                                </AppButton>
                            ) : "Unavailable"}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </Box>
    );
}

function SingleSuccessAssets({result}: {result: ProductCreationResultItem}) {
    const qrRef = useRef<HTMLCanvasElement>(null);
    const publicUrl = result.productId ? `https://flexpayz.com/show-product?product_id=${result.productId}` : "";

    const downloadQr = () => {
        const canvas = qrRef.current;
        if (!canvas || !result.productId) return;
        downloadUrl(canvas.toDataURL("image/png"), `qr-code-${result.productId}.png`);
    };

    const createUnlockCodePdf = () => {
        const pdf = new jsPDF({orientation: "landscape", unit: "mm", format: [30, 15]});
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text("UNLOCK CODE", 15, 4, {align: "center"});
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(18);
        pdf.text(result.unlockCode || "UNKNOWN", 15, 11, {align: "center"});
        return pdf;
    };

    return (
        <Surface tone="soft">
            <Stack spacing={3}>
                <h3>Single product created</h3>
                <dl className="admin-definition-list">
                    <div><dt>Product ID</dt><dd>{result.productId}</dd></div>
                    <div><dt>Unlock code</dt><dd>{result.unlockCode}</dd></div>
                    <div><dt>Product type</dt><dd>{PRODUCT_TYPE_LABELS[result.productType]}</dd></div>
                    <div><dt>Capabilities</dt><dd>{getCapabilityLabels(result.capabilities).join(", ")}</dd></div>
                </dl>
                {publicUrl && (
                    <Box className="admin-print-grid">
                        <QRCodeCanvas value={publicUrl} size={144} ref={qrRef}/>
                        <Stack spacing={2}>
                            <AppButton variant="outlined" onClick={() => copyText(result.productId || "")} startIcon={<ContentCopyRoundedIcon/>}>Copy product ID</AppButton>
                            <AppButton variant="outlined" onClick={() => copyText(publicUrl)} startIcon={<ContentCopyRoundedIcon/>}>Copy public link</AppButton>
                            <AppButton variant="outlined" onClick={downloadQr} startIcon={<DownloadRoundedIcon/>}>Download QR</AppButton>
                            <AppButton variant="outlined" onClick={() => createUnlockCodePdf().save(`unlock_code_${result.productId}.pdf`)} startIcon={<DownloadRoundedIcon/>}>Download unlock-code PDF</AppButton>
                            <AppButton variant="outlined" onClick={() => createUnlockCodePdf().autoPrint().output("dataurlnewwindow")} startIcon={<PrintRoundedIcon/>}>Print unlock-code label</AppButton>
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Surface>
    );
}

function StepIndicator({activeStep}: {activeStep: Step}) {
    const activeIndex = STEPS.findIndex((step) => step.id === activeStep);
    return (
        <ol className="admin-step-indicator" aria-label="Product creation steps">
            {STEPS.map((step, index) => (
                <li key={step.id} aria-current={step.id === activeStep ? "step" : undefined} className={index <= activeIndex ? "admin-step-active" : ""}>
                    <span>{index + 1}</span>{step.label}
                </li>
            ))}
        </ol>
    );
}

function buildFailedResults(draft: ProductCreationDraft, error: unknown): ProductCreationResultItem[] {
    const message = error instanceof AdminProductCreationBackendUnavailableError
        ? "Trusted backend creation function is not deployed. No products were created."
        : error instanceof Error ? error.message : "Product creation failed.";
    return Array.from({length: draft.quantity}).map((_, index) => ({
        requestItemId: `failed-${index + 1}`,
        status: "failed",
        productType: draft.productType,
        name: getDefaultProductName(draft.productType, draft.name),
        capabilities: draft.capabilities,
        error: message,
    }));
}

function createClientRequestId() {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
        throw new Error("Secure browser crypto is required to create an idempotent request ID.");
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function downloadCsv(rows: ProductCreationResultItem[], filename: string) {
    const csv = Papa.unparse(productCreationResultsToCsvRows(rows));
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
    downloadUrl(URL.createObjectURL(blob), filename);
}

function downloadUrl(url: string, filename: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function copyText(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
}
