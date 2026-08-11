import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {LoadingPanel} from "../components/design-system";
import {createFirestoreBatch} from "../firestore/repositories/batches";
import {getSerialNumberDocsByProductID, updateSerialNumberInBatch} from "../firestore/repositories/serialNumbers";

type MigrationStatus = "updated" | "not-found" | "invalid" | "error";

interface MigrationRow {
    rowNumber: number;
    sourceLink: string;
    oldProductID: string;
    newProductID: string;
}

interface MigrationResult {
    rowNumber: number;
    oldProductID: string;
    newProductID: string;
    status: MigrationStatus;
    updatedDocs: number;
    message: string;
}

interface MigrationSummary {
    totalRows: number;
    updatedRows: number;
    notFoundRows: number;
    invalidRows: number;
    errorRows: number;
    updatedDocuments: number;
}

const extractProductIdFromLink = (link: string): string => {
    const trimmed = link.trim();
    if (!trimmed) return "";

    try {
        const url = new URL(trimmed);
        return url.searchParams.get("product_id")?.trim() || "";
    } catch {
        const match = trimmed.match(/[?&]product_id=([^&#]+)/);
        return match?.[1]?.trim() || "";
    }
};

const parseMigrationCsv = (text: string): MigrationRow[] => {
    return text
        .split(/\r?\n/)
        .map((line) => line.replace(/\uFEFF/g, "").trim())
        .filter((line) => line.length > 0)
        .map((line, index) => {
            const commaIndex = line.indexOf(",");
            const sourceLink = commaIndex >= 0 ? line.slice(0, commaIndex).trim() : line.trim();
            const newProductID = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : "";
            const oldProductID = extractProductIdFromLink(sourceLink);

            return {
                rowNumber: index + 1,
                sourceLink,
                oldProductID,
                newProductID,
            };
        });
};

export function SerialProductMigrationPage() {
    const navigate = useNavigate();

    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingPermissions, setCheckingPermissions] = useState(true);

    const [fileName, setFileName] = useState<string>("");
    const [rows, setRows] = useState<MigrationRow[]>([]);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<MigrationResult[]>([]);
    const [summary, setSummary] = useState<MigrationSummary | null>(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setIsAdmin(false);
                setCheckingPermissions(false);
                return;
            }

            user
                .getIdTokenResult()
                .then((idTokenResult) => {
                    setIsAdmin(Boolean(idTokenResult.claims.admin));
                })
                .catch(() => {
                    setIsAdmin(false);
                })
                .finally(() => {
                    setCheckingPermissions(false);
                });
        });

        return () => unsubscribe();
    }, []);

    const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

    const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const parsed = parseMigrationCsv(text);

        setFileName(file.name);
        setRows(parsed);
        setResults([]);
        setSummary(null);
        setProgress(0);
    };

    const runMigration = async () => {
        if (rows.length === 0) {
            alert("No data loaded.");
            return;
        }

        setRunning(true);
        setProgress(0);
        setResults([]);
        setSummary(null);

        const migrationResults: MigrationResult[] = [];
        let updatedRows = 0;
        let notFoundRows = 0;
        let invalidRows = 0;
        let errorRows = 0;
        let updatedDocuments = 0;

        try {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                if (!row.oldProductID || !row.newProductID) {
                    invalidRows++;
                    migrationResults.push({
                        rowNumber: row.rowNumber,
                        oldProductID: row.oldProductID,
                        newProductID: row.newProductID,
                        status: "invalid",
                        updatedDocs: 0,
                        message: "Invalid row: missing product_id in link or missing new product ID.",
                    });
                    setProgress(Math.round(((i + 1) / rows.length) * 100));
                    continue;
                }

                try {
                    const docs = await getSerialNumberDocsByProductID(row.oldProductID);

                    if (docs.length === 0) {
                        notFoundRows++;
                        migrationResults.push({
                            rowNumber: row.rowNumber,
                            oldProductID: row.oldProductID,
                            newProductID: row.newProductID,
                            status: "not-found",
                            updatedDocs: 0,
                            message: "No serial_numbers documents found for this productID.",
                        });
                    } else {
                        const writeBatchSize = 400;

                        for (let start = 0; start < docs.length; start += writeBatchSize) {
                            const chunk = docs.slice(start, start + writeBatchSize);
                            const batch = createFirestoreBatch();

                            chunk.forEach((serialDoc) => {
                                updateSerialNumberInBatch(batch, serialDoc, {
                                    productID: row.newProductID,
                                    type: "sanitas-payment-ring",
                                });
                            });

                            await batch.commit();
                        }

                        updatedRows++;
                        updatedDocuments += docs.length;

                        migrationResults.push({
                            rowNumber: row.rowNumber,
                            oldProductID: row.oldProductID,
                            newProductID: row.newProductID,
                            status: "updated",
                            updatedDocs: docs.length,
                            message: `Updated ${docs.length} document(s).`,
                        });
                    }
                } catch (error) {
                    errorRows++;
                    migrationResults.push({
                        rowNumber: row.rowNumber,
                        oldProductID: row.oldProductID,
                        newProductID: row.newProductID,
                        status: "error",
                        updatedDocs: 0,
                        message: `Error: ${error instanceof Error ? error.message : "unknown error"}`,
                    });
                }

                setProgress(Math.round(((i + 1) / rows.length) * 100));
            }
        } finally {
            setRunning(false);
        }

        setResults(migrationResults);
        setSummary({
            totalRows: rows.length,
            updatedRows,
            notFoundRows,
            invalidRows,
            errorRows,
            updatedDocuments,
        });
    };

    if (checkingPermissions) {
        return <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><LoadingPanel text="Loading migration tools"/></div>;
    }

    if (!isAdmin) {
        return <div style={{ padding: 24 }}>You do not have admin permissions.</div>;
    }

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "left" }}>
            <h1>Serial Product Migration</h1>
            <p>
                Upload CSV rows in this format:
                <br />
                <code>https://flexpayz.com/app?product_id=OLD_ID,NEW_ID</code>
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <Button variant="outlined" onClick={() => navigate("/admin")} disabled={running}>
                    Back to Admin
                </Button>
            </div>

            <input type="file" accept=".csv,.txt" onChange={onFileUpload} disabled={running} />

            {fileName && (
                <p>
                    Loaded file: <strong>{fileName}</strong> ({rows.length} rows)
                </p>
            )}

            {previewRows.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <strong>Preview (first {previewRows.length} rows):</strong>
                    {previewRows.map((row) => (
                        <div key={`preview-row-${row.rowNumber}`} style={{ fontSize: 13 }}>
                            Row {row.rowNumber}: {row.oldProductID || "(invalid old ID)"} -&gt;{" "}
                            {row.newProductID || "(missing new ID)"}
                        </div>
                    ))}
                </div>
            )}

            <Button variant="contained" onClick={runMigration} disabled={running || rows.length === 0}>
                {running ? "Running..." : "Run Migration"}
            </Button>

            {running && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ width: "100%", height: 10, background: "#eee", borderRadius: 4 }}>
                        <div
                            style={{
                                width: `${progress}%`,
                                height: 10,
                                background: "#2e7d32",
                                borderRadius: 4,
                                transition: "width 0.2s ease",
                            }}
                        />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>{progress}%</div>
                </div>
            )}

            {summary && (
                <div style={{ marginTop: 20 }}>
                    <h3>Summary</h3>
                    <div>Total rows: {summary.totalRows}</div>
                    <div>Rows updated: {summary.updatedRows}</div>
                    <div>Updated documents: {summary.updatedDocuments}</div>
                    <div>Rows not found: {summary.notFoundRows}</div>
                    <div>Rows invalid: {summary.invalidRows}</div>
                    <div>Rows with errors: {summary.errorRows}</div>
                </div>
            )}

            {results.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <h3>Results</h3>
                    <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #ddd", padding: 12 }}>
                        {results.map((result) => (
                            <div key={`result-row-${result.rowNumber}`} style={{ marginBottom: 8, fontSize: 13 }}>
                                Row {result.rowNumber} | {result.status} | old: {result.oldProductID || "-"} | new:{" "}
                                {result.newProductID || "-"} | docs: {result.updatedDocs} | {result.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
