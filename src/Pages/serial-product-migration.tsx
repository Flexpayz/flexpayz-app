import {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import Papa from "papaparse";
import {Box, LinearProgress, Stack} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {AppButton, LoadingPanel, Surface} from "../components/design-system";
import {
    dryRunSerialMigration,
    executeSerialMigration,
} from "../firestore/repositories/adminSerialMigration";
import {
    SerialMigrationDryRunResponse,
    SerialMigrationInputRow,
    SerialMigrationMode,
    SerialMigrationResultRow,
    SerialMigrationValidationRow,
    createInputChecksum,
    createOperationId,
    getTemplate,
    parseSerialMigrationText,
    resultFailureRows,
    validationErrorRows,
} from "../admin/serials/serialMigrationModel";

type Step = "mode" | "upload" | "validate" | "review" | "confirm" | "execute" | "results";
type ReviewFilter = "all" | "ready" | "warnings" | "blocked";

const STEPS: Array<{id: Step; label: string}> = [
    {id: "mode", label: "Select mode"},
    {id: "upload", label: "Upload"},
    {id: "validate", label: "Validate"},
    {id: "review", label: "Review"},
    {id: "confirm", label: "Confirm"},
    {id: "execute", label: "Execute"},
    {id: "results", label: "Results"},
];

export function SerialProductMigrationPage() {
    const [step, setStep] = useState<Step>("mode");
    const [mode, setMode] = useState<SerialMigrationMode | null>(null);
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState<SerialMigrationInputRow[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [operationId, setOperationId] = useState(createOperationId());
    const [dryRun, setDryRun] = useState<SerialMigrationDryRunResponse | null>(null);
    const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
    const [reason, setReason] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<SerialMigrationResultRow[]>([]);
    const [error, setError] = useState("");
    const headingRef = useRef<HTMLHeadingElement>(null);

    const readyRows = dryRun?.rows.filter((row) => row.executable) || [];
    const expectedPhrase = `MIGRATE ${readyRows.length} SERIALS`;
    const filteredRows = useMemo(() => {
        const currentRows = dryRun?.rows || [];
        if (reviewFilter === "ready") return currentRows.filter((row) => row.executable);
        if (reviewFilter === "warnings") return currentRows.filter((row) => row.warnings.length > 0);
        if (reviewFilter === "blocked") return currentRows.filter((row) => row.status === "blocked");
        return currentRows;
    }, [dryRun, reviewFilter]);

    useEffect(() => {
        headingRef.current?.focus();
    }, [step]);

    useEffect(() => {
        const handler = (event: BeforeUnloadEvent) => {
            if (!running) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [running]);

    const resetLoadedFile = () => {
        setFileName("");
        setRows([]);
        setParseErrors([]);
        setDryRun(null);
        setResults([]);
        setReason("");
        setAcknowledged(false);
        setConfirmation("");
        setError("");
    };

    const chooseMode = (nextMode: SerialMigrationMode) => {
        if (mode && mode !== nextMode && rows.length > 0 && !window.confirm("Changing mode clears the loaded file and validation results. Continue?")) {
            return;
        }
        setMode(nextMode);
        resetLoadedFile();
        setOperationId(createOperationId());
        setStep("upload");
    };

    const onFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const parsed = parseSerialMigrationText(text);
        setFileName(file.name);
        setRows(parsed.rows);
        setParseErrors(parsed.errors);
        setDryRun(null);
        setResults([]);
        setError("");
    };

    const runValidation = async () => {
        if (!mode) return;
        if (rows.length === 0) {
            setError("Upload a migration file before validation.");
            return;
        }
        if (parseErrors.length > 0) {
            setError("Fix file parsing errors before server validation.");
            return;
        }
        setRunning(true);
        setError("");
        setStep("validate");
        try {
            const response = await dryRunSerialMigration({operationId, mode, rows});
            setDryRun(response);
            setStep("review");
        } catch (validationError) {
            setError(validationError instanceof Error ? validationError.message : "Server validation failed.");
            setStep("upload");
        } finally {
            setRunning(false);
        }
    };

    const execute = async () => {
        if (!mode || !dryRun) return;
        if (!acknowledged || confirmation !== expectedPhrase || !reason.trim()) {
            setError("Complete the acknowledgement, confirmation phrase and migration reason.");
            return;
        }
        setRunning(true);
        setError("");
        setStep("execute");
        try {
            const response = await executeSerialMigration({
                operationId,
                mode,
                rows,
                validationToken: dryRun.validationToken,
                reason,
                confirmationPhrase: confirmation,
                acknowledgedPermanentDeletion: acknowledged,
                inputChecksum: createInputChecksum(rows),
            });
            setResults(response.results);
            setStep("results");
        } catch (executeError) {
            setError(executeError instanceof Error ? executeError.message : "Execution failed.");
            setStep("confirm");
        } finally {
            setRunning(false);
        }
    };

    const startAnother = () => {
        resetLoadedFile();
        setOperationId(createOperationId());
        setStep("mode");
    };

    return (
        <Stack spacing={4} className="admin-serial-migration">
            <Surface>
                <Stack spacing={3}>
                    <Box>
                        <Box component="p" className="fp-typography-eyebrow">Serial numbers</Box>
                        <Box component="h2" className="fp-typography-heading" tabIndex={-1} ref={headingRef}>Serial migration</Box>
                        <Box component="p" className="admin-muted">
                            Destructive migration tool. Validation and execution run through trusted Cloud Functions in Europe.
                        </Box>
                    </Box>
                    <StepIndicator step={step}/>
                </Stack>
            </Surface>

            {error && <Surface className="admin-error-summary" role="alert"><strong>{error}</strong></Surface>}

            {step === "mode" && <ModeStep selectedMode={mode} onSelect={chooseMode}/>}
            {step === "upload" && mode && (
                <UploadStep
                    mode={mode}
                    fileName={fileName}
                    rows={rows}
                    parseErrors={parseErrors}
                    onFileUpload={onFileUpload}
                    onClear={resetLoadedFile}
                    onBack={() => setStep("mode")}
                    onValidate={runValidation}
                />
            )}
            {step === "validate" && <ProgressStep text="Validating migration rows against current Firestore state"/>}
            {step === "review" && dryRun && (
                <ReviewStep
                    dryRun={dryRun}
                    rows={filteredRows}
                    filter={reviewFilter}
                    onFilter={setReviewFilter}
                    onBack={() => setStep("upload")}
                    onConfirm={() => setStep("confirm")}
                />
            )}
            {step === "confirm" && dryRun && (
                <ConfirmStep
                    mode={dryRun.mode}
                    readyCount={readyRows.length}
                    expectedPhrase={expectedPhrase}
                    reason={reason}
                    confirmation={confirmation}
                    acknowledged={acknowledged}
                    onReason={setReason}
                    onConfirmation={setConfirmation}
                    onAcknowledged={setAcknowledged}
                    onBack={() => setStep("review")}
                    onExecute={execute}
                />
            )}
            {step === "execute" && <ProgressStep text="Executing migration. Do not close this page."/>}
            {step === "results" && dryRun && (
                <ResultsStep
                    operationId={operationId}
                    results={results}
                    onStartAnother={startAnother}
                />
            )}
        </Stack>
    );
}

function ModeStep({selectedMode, onSelect}: {selectedMode: SerialMigrationMode | null; onSelect: (mode: SerialMigrationMode) => void}) {
    return (
        <Box className="admin-migration-mode-grid">
            <button type="button" className={`admin-migration-mode-card${selectedMode === "generic" ? " admin-capability-card-selected" : ""}`} onClick={() => onSelect("generic")}>
                <strong>Generic FlexPayz migration</strong>
                <span>Move a serial from one FlexPayz product to another unowned FlexPayz target. Ownership transfers only from source to target; personal content is reset, not copied.</span>
            </button>
            <button type="button" className={`admin-migration-mode-card${selectedMode === "sanitas" ? " admin-capability-card-selected" : ""}`} onClick={() => onSelect("sanitas")}>
                <strong>Sanitas migration</strong>
                <span>Move a FlexPayz serial to an external Sanitas product ID. No local target product or ownership is created.</span>
            </button>
        </Box>
    );
}

function UploadStep({
    mode,
    fileName,
    rows,
    parseErrors,
    onFileUpload,
    onClear,
    onBack,
    onValidate,
}: {
    mode: SerialMigrationMode;
    fileName: string;
    rows: SerialMigrationInputRow[];
    parseErrors: string[];
    onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    onBack: () => void;
    onValidate: () => void;
}) {
    return (
        <Surface>
            <Stack spacing={4}>
                <Box className="admin-section-heading">
                    <Box>
                        <h3>Upload migration file</h3>
                        <p>Accepted formats: CSV or TXT. Supported columns: oldProductId,newProductId. Legacy rows like URL,NEW_ID still work.</p>
                    </Box>
                    <AppButton variant="outlined" startIcon={<DownloadRoundedIcon/>} onClick={() => downloadText(getTemplate(mode), `${mode}-serial-migration-template.csv`)}>
                        Download template
                    </AppButton>
                </Box>
                <label className="admin-upload-dropzone">
                    <UploadFileRoundedIcon aria-hidden="true"/>
                    <span>{fileName || "Choose CSV or TXT file"}</span>
                    <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFileUpload}/>
                </label>
                {fileName && <Box className="admin-muted">Loaded {fileName}: {rows.length} parsed row(s)</Box>}
                {parseErrors.length > 0 && (
                    <Box className="admin-error-summary" role="alert">
                        <strong>File errors</strong>
                        <ul>{parseErrors.map((parseError) => <li key={parseError}>{parseError}</li>)}</ul>
                    </Box>
                )}
                {rows.length > 0 && (
                    <Box className="admin-product-table-wrap">
                        <table className="admin-product-table">
                            <thead><tr><th>Row</th><th>Source</th><th>Target</th></tr></thead>
                            <tbody>{rows.slice(0, 8).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.sourceProductId}</td><td>{row.targetId}</td></tr>)}</tbody>
                        </table>
                    </Box>
                )}
                <Box className="admin-detail-actions">
                    <AppButton variant="outlined" onClick={onBack}>Back</AppButton>
                    <AppButton variant="outlined" onClick={onClear} disabled={!fileName}>Clear file</AppButton>
                    <AppButton variant="contained" onClick={onValidate} disabled={rows.length === 0 || parseErrors.length > 0}>Validate on server</AppButton>
                </Box>
            </Stack>
        </Surface>
    );
}

function ReviewStep({
    dryRun,
    rows,
    filter,
    onFilter,
    onBack,
    onConfirm,
}: {
    dryRun: SerialMigrationDryRunResponse;
    rows: SerialMigrationValidationRow[];
    filter: ReviewFilter;
    onFilter: (filter: ReviewFilter) => void;
    onBack: () => void;
    onConfirm: () => void;
}) {
    return (
        <Stack spacing={4}>
            <Surface>
                <Box className="admin-migration-summary-grid">
                    <SummaryStat label="Total" value={dryRun.summary.total}/>
                    <SummaryStat label="Ready" value={dryRun.summary.ready}/>
                    <SummaryStat label="Blocked" value={dryRun.summary.blocked}/>
                    <SummaryStat label="Warnings" value={dryRun.summary.warnings}/>
                    <SummaryStat label="Owned sources" value={dryRun.summary.ownedSources}/>
                    <SummaryStat label="Unowned sources" value={dryRun.summary.unownedSources}/>
                </Box>
            </Surface>
            <Surface>
                <Stack spacing={3}>
                    <Box className="admin-detail-actions">
                        {(["all", "ready", "warnings", "blocked"] as ReviewFilter[]).map((option) => (
                            <AppButton key={option} variant={filter === option ? "contained" : "outlined"} onClick={() => onFilter(option)}>{option}</AppButton>
                        ))}
                        <AppButton variant="outlined" startIcon={<DownloadRoundedIcon/>} onClick={() => downloadCsv(validationErrorRows(dryRun.rows), "serial_migration_validation_errors.csv")}>
                            Download validation errors
                        </AppButton>
                    </Box>
                    <ValidationTable rows={rows}/>
                    <Box className="admin-detail-actions">
                        <AppButton variant="outlined" onClick={onBack}>Back</AppButton>
                        <AppButton variant="contained" onClick={onConfirm} disabled={dryRun.summary.ready === 0}>Confirm destructive migration</AppButton>
                    </Box>
                </Stack>
            </Surface>
        </Stack>
    );
}

function ValidationTable({rows}: {rows: SerialMigrationValidationRow[]}) {
    return (
        <Box className="admin-product-table-wrap">
            <table className="admin-product-table">
                <thead>
                <tr><th>Row</th><th>Source</th><th>Owner</th><th>Serial</th><th>Target</th><th>Mode</th><th>Effect</th><th>Status</th><th>Details</th></tr>
                </thead>
                <tbody>
                {rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.sourceProductId}-${row.targetId}`}>
                        <td>{row.rowNumber}</td>
                        <td><strong>{row.sourceProductId}</strong><span>{row.sourceName}</span></td>
                        <td>{row.sourceOwner ? row.sourceOwner.email || row.sourceOwner.uid : "Unowned"}</td>
                        <td>{row.sourceSerial ? `${row.sourceSerial.serialNumber} · ${row.sourceSerial.type}` : `${row.sourceSerialCount} serials`}</td>
                        <td><strong>{row.targetId}</strong><span>{row.targetName}</span></td>
                        <td>{row.mode}</td>
                        <td>{row.mode === "generic" ? "Move serial, reset source, transfer source owner if present" : "Move serial to Sanitas, reset source, remove owner"}</td>
                        <td><span className={`admin-status-pill admin-migration-status-${row.status}`}>{row.status}</span></td>
                        <td>{[...row.warnings, ...row.conflicts].join("; ") || "Ready"}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </Box>
    );
}

function ConfirmStep({
    mode,
    readyCount,
    expectedPhrase,
    reason,
    confirmation,
    acknowledged,
    onReason,
    onConfirmation,
    onAcknowledged,
    onBack,
    onExecute,
}: {
    mode: SerialMigrationMode;
    readyCount: number;
    expectedPhrase: string;
    reason: string;
    confirmation: string;
    acknowledged: boolean;
    onReason: (reason: string) => void;
    onConfirmation: (confirmation: string) => void;
    onAcknowledged: (acknowledged: boolean) => void;
    onBack: () => void;
    onExecute: () => void;
}) {
    return (
        <Surface>
            <Stack spacing={3}>
                <Box className="admin-danger-panel">
                    <WarningAmberRoundedIcon aria-hidden="true"/>
                    <Box>
                        <strong>Permanent destructive migration</strong>
                        <p>Successful rows permanently reset source personal content, delete source Storage files, remove source ownership, regenerate source unlock codes and move serial mappings.</p>
                        <p>{mode === "generic" ? "Generic migrations transfer source ownership to the unowned target without copying personal content." : "Sanitas migrations move the serial to an external target and set redirect type to sanitas-payment-ring."}</p>
                    </Box>
                </Box>
                <label className="admin-form-control">
                    <span>Migration reason/reference</span>
                    <input value={reason} onChange={(event) => onReason(event.target.value)} placeholder="Ticket, order, batch or operator reference"/>
                </label>
                <label className="admin-checkbox-line">
                    <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)}/>
                    <span>I understand source personal content and files will be permanently reset or deleted for successful rows.</span>
                </label>
                <label className="admin-form-control">
                    <span>Type confirmation phrase</span>
                    <input value={confirmation} onChange={(event) => onConfirmation(event.target.value)} placeholder={expectedPhrase}/>
                    <small>Required phrase: {expectedPhrase}</small>
                </label>
                <Box className="admin-muted">Blocked rows will be skipped. Ready rows: {readyCount}.</Box>
                <Box className="admin-detail-actions">
                    <AppButton variant="outlined" onClick={onBack}>Back</AppButton>
                    <AppButton variant="contained" color="error" onClick={onExecute} disabled={!acknowledged || confirmation !== expectedPhrase || !reason.trim()}>Execute migration</AppButton>
                </Box>
            </Stack>
        </Surface>
    );
}

function ResultsStep({operationId, results, onStartAnother}: {operationId: string; results: SerialMigrationResultRow[]; onStartAnother: () => void}) {
    const failures = resultFailureRows(results);
    return (
        <Surface>
            <Stack spacing={3}>
                <Box className="admin-migration-summary-grid">
                    <SummaryStat label="Total" value={results.length}/>
                    <SummaryStat label="Successful" value={results.filter((row) => row.status === "success").length}/>
                    <SummaryStat label="Failed/skipped" value={failures.length}/>
                    <SummaryStat label="Storage warnings" value={results.reduce((count, row) => count + row.storageWarnings.length, 0)}/>
                </Box>
                <Box className="admin-muted">Operation ID: {operationId}</Box>
                <ResultsTable rows={results}/>
                <Box className="admin-detail-actions">
                    <AppButton variant="contained" startIcon={<DownloadRoundedIcon/>} onClick={() => downloadCsv(results, "serial_migration_results.csv")}>Download full results CSV</AppButton>
                    <AppButton variant="outlined" onClick={() => downloadCsv(failures, "serial_migration_failures.csv")} disabled={failures.length === 0}>Download failures CSV</AppButton>
                    <AppButton variant="outlined" href="/admin/products">Return to Products</AppButton>
                    <AppButton variant="outlined" onClick={onStartAnother}>Start another migration</AppButton>
                </Box>
            </Stack>
        </Surface>
    );
}

function ResultsTable({rows}: {rows: SerialMigrationResultRow[]}) {
    return (
        <Box className="admin-product-table-wrap">
            <table className="admin-product-table">
                <thead><tr><th>Row</th><th>Source</th><th>Serial</th><th>Target</th><th>Ownership</th><th>Result</th><th>Message</th><th>Action</th></tr></thead>
                <tbody>{rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.sourceProductId}`}>
                        <td>{row.rowNumber}</td>
                        <td>{row.sourceProductId}</td>
                        <td>{row.serialNumber}</td>
                        <td>{row.targetId}</td>
                        <td>{row.ownership}</td>
                        <td>{row.status}</td>
                        <td>{row.message}{row.storageWarnings.length ? ` · Storage: ${row.storageWarnings.join("; ")}` : ""}</td>
                        <td><AppButton variant="outlined" href={`/admin/products/${row.sourceProductId}`}>Source details</AppButton></td>
                    </tr>
                ))}</tbody>
            </table>
        </Box>
    );
}

function ProgressStep({text}: {text: string}) {
    return (
        <Surface aria-live="polite">
            <Stack spacing={3}>
                <LoadingPanel text={text}/>
                <LinearProgress/>
                <Box className="admin-muted">Progress is reported after the backend operation returns. Do not close this page.</Box>
            </Stack>
        </Surface>
    );
}

function StepIndicator({step}: {step: Step}) {
    const activeIndex = STEPS.findIndex((item) => item.id === step);
    return (
        <ol className="admin-step-indicator" aria-label="Serial migration steps">
            {STEPS.map((item, index) => <li key={item.id} className={index <= activeIndex ? "admin-step-active" : ""} aria-current={item.id === step ? "step" : undefined}><span>{index + 1}</span>{item.label}</li>)}
        </ol>
    );
}

function SummaryStat({label, value}: {label: string; value: number}) {
    return <div className="admin-summary-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function downloadText(text: string, filename: string) {
    const blob = new Blob([text], {type: "text/csv;charset=utf-8"});
    downloadUrl(URL.createObjectURL(blob), filename);
}

function downloadCsv(rows: unknown[], filename: string) {
    const csv = Papa.unparse(rows as Record<string, unknown>[]);
    downloadText(csv, filename);
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

