import React, { useState } from "react";
import {LinearProgress, Stack, Typography} from "@mui/material";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import {AppButton, AppTextField} from "./design-system";
import "./serial-number-uploader.css";
import { Preview, random_hex_code } from "../Pages/admin";
import { defaultPermissions } from "./usePermission";
import {createFirestoreBatch} from "../firestore/repositories/batches";
import {getProduct, createProductDocumentReference, setProductInBatch} from "../firestore/repositories/products";
import {setPermissionsInBatch} from "../firestore/repositories/permissions";
import {getSerialNumber, setSerialNumberInBatch} from "../firestore/repositories/serialNumbers";
import {normalizeProduct} from "../firestore/schema/products";

type UploadType = "default" | "sanitas";

const SerialUploader = ({ setProducts }: { setProducts: any }) => {
    const [serials, setSerials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState<string | null>(null);
    const [uploadType, setUploadType] = useState<UploadType>("default");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const text = await file.text();
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "");

        if (uploadType === "default") {
            // doar lista de serial numbers
            setSerials(lines);
            console.log("Loaded serial numbers:", lines);
        } else {
            // CSV cu header: serialNumber,productID
            const rows = lines.slice(1).map((line) => {
                const [serial, product] = line.split(",");
                return { serialNumber: serial, productID: product };
            });
            setSerials(rows);
            console.log("Loaded mapping:", rows);
        }
    };

    const handleUpload = async () => {
        if (serials.length === 0) {
            alert("No data loaded.");
            return;
        }

        setLoading(true);
        setProgress(0);

        if (uploadType === "default") {
            // =================== FLOW DEFAULT cu batch și chunk-uri ===================
            let skipped = 0,
                uploaded = 0,
                error = 0,
                misscreated = 0;

            const results: {
                serialNumber: string;
                productID: string;
                unlockCode: string;
                status: "created" | "skipped" | "misscreated" | "error";
            }[] = [];

            try {
                const batchSize = 400;

                for (let i = 0; i < serials.length; i += batchSize) {
                    const chunk = serials.slice(i, i + batchSize);

                    // verificăm ce seriale există deja
                    const existingSerials = await Promise.all(chunk.map((serial) => getSerialNumber(serial)));

                    const batch = createFirestoreBatch();

                    for (let j = 0; j < chunk.length; j++) {
                        const serial = chunk[j];
                        const serialDoc = existingSerials[j];

                        if (serialDoc) {
                            const productID = serialDoc.data.productID || "";
                            let unlockCode = "";
                            let status: "skipped" | "misscreated" = "skipped";

                            if (productID) {
                                const product = await getProduct(productID);
                                if (!product) {
                                    status = "misscreated";
                                    misscreated++;
                                } else {
                                    skipped++;
                                    unlockCode = product.unlockCode || "";
                                }
                            } else {
                                status = "misscreated";
                                misscreated++;
                            }

                            results.push({
                                serialNumber: serial,
                                productID,
                                unlockCode,
                                status,
                            });
                        } else {
                            // create new product
                            const hexCode = random_hex_code();
                            const productRef = createProductDocumentReference();
                            const productInput = {
                                activated: false,
                                unlockCode: hexCode,
                                name: "New Product",
                                preview: Preview.BUSINESS_CARD,
                            };

                            setProductInBatch(batch, productRef, productInput);

                            setPermissionsInBatch(batch, productRef.id, defaultPermissions);

                            setSerialNumberInBatch(batch, serial, {
                                productID: productRef.id,
                                type: "default",
                            });

                            results.push({
                                serialNumber: serial,
                                productID: productRef.id,
                                unlockCode: hexCode,
                                status: "created",
                            });

                            setProducts((prev: any) => [
                                ...prev,
                                {
                                    id: productRef.id,
                                    data: normalizeProduct(productInput),
                                },
                            ]);

                            uploaded++;
                        }

                        setProgress(Math.round(((i + j + 1) / serials.length) * 100));
                    }

                    await batch.commit();
                }

                // ==== CSV Export ====
                if (results.length > 0) {
                    const csvHeader = "serialNumber,productID,unlockCode,status\n";
                    const csvRows = results
                        .map((r) => `${r.serialNumber},${r.productID},${r.unlockCode},${r.status}`)
                        .join("\n");
                    const csvContent = csvHeader + csvRows;

                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute(
                        "download",
                        `serials_export_${new Date().toISOString().slice(0, 10)}.csv`
                    );
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }

                alert(
                    `✅ Upload complete! Created: ${uploaded}, Skipped: ${skipped}, Misscreated: ${misscreated}, Errors: ${error}`
                );
            } catch (err) {
                console.error("Batch error:", err);
                alert("❌ Error during batch upload.");
            }
        } else {
            // =================== FLOW SANITAS (nemodificat) ===================
            try {
                const batchSize = 400;
                for (let i = 0; i < serials.length; i += batchSize) {
                    const chunk = serials.slice(i, i + batchSize);
                    const batch = createFirestoreBatch();

                    chunk.forEach((row) => {
                        if (!row.serialNumber || !row.productID) return;
                        setSerialNumberInBatch(batch, row.serialNumber.trim(), {
                            productID: row.productID.trim(),
                            type: "sanitas-payment-ring",
                        });
                    });

                    await batch.commit();
                    setProgress(Math.round(((i + chunk.length) / serials.length) * 100));
                }
                alert(`✅ Upload complete! Added ${serials.length} serial mappings for Sanitas Payment Ring.`);
            } catch (err) {
                console.error(err);
                alert("❌ Error during Sanitas upload.");
            }
        }

        setLoading(false);
    };



    return (
        <Stack spacing={4} className="serial-number-uploader">
            <Typography variant="h3">Upload Serial Numbers</Typography>

            <AppTextField
                select
                fullWidth
                label="Upload type"
                SelectProps={{native: true}}
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as UploadType)}
                disabled={loading}
            >
                <option value="default">Default Products (generate)</option>
                <option value="sanitas">Sanitas Payment Ring (CSV with productID)</option>
            </AppTextField>

            <Stack spacing={2}>
                <Typography component="label" htmlFor="serial-upload-file" variant="body2">
                    Serial numbers file
                </Typography>
                <input
                    id="serial-upload-file"
                    className="serial-number-uploader-file"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    disabled={loading}
                    aria-describedby="serial-upload-formats"
                />
                <Typography id="serial-upload-formats" variant="body2" color="text.secondary">
                    CSV or TXT
                </Typography>
            </Stack>

            <Stack spacing={1} aria-live="polite" className="serial-number-uploader-summary">
                {fileName && (
                    <Typography variant="body2">
                        Loaded file: <strong>{fileName}</strong>
                    </Typography>
                )}
                {serials.length > 0 && (
                    <Typography variant="body2">
                        Detected {serials.length} rows for <strong>{uploadType}</strong> upload.
                    </Typography>
                )}
            </Stack>

            <AppButton
                variant="contained"
                startIcon={<UploadRoundedIcon/>}
                onClick={handleUpload}
                disabled={loading || serials.length === 0}
                sx={{alignSelf: {xs: "stretch", sm: "flex-start"}}}
            >
                {loading ? "Uploading..." : "Upload to Firebase"}
            </AppButton>

            {loading && (
                <Stack spacing={2}>
                    <LinearProgress variant="determinate" value={progress} aria-label="Serial upload progress"/>
                    <Typography variant="body2" color="text.secondary">{progress}%</Typography>
                </Stack>
            )}
        </Stack>
    );
};

export default SerialUploader;
