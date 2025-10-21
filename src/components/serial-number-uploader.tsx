import React, { useState } from "react";
import {
    collection,
    addDoc,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import { db } from "../App";
import { DB_COLLECTIONS } from "./baby-journal-settings";
import { Preview, random_hex_code } from "../Pages/admin";
import { defaultPermissions } from "./usePermission";

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
            // =================== FLOW DEFAULT ===================
            let skipped = 0, uploaded = 0, error = 0;
            for (let i = 0; i < serials.length; i++) {
                const serial = serials[i];
                try {
                    const serialRef = doc(db, DB_COLLECTIONS.SERIAL_NUMBERS, serial);
                    const serialSnap = await getDoc(serialRef);

                    if (serialSnap.exists()) {
                        skipped++;
                    } else {
                        const hexCode = random_hex_code();
                        const productRef = await addDoc(collection(db, DB_COLLECTIONS.PRODUCTS), {
                            activated: false,
                            unlockCode: hexCode,
                            name: "New Product",
                            preview: Preview.BUSINESS_CARD,
                            processed: false,
                        });

                        setProducts((prev: any) => [
                            ...prev,
                            {
                                id: productRef.id,
                                activated: false,
                                unlockCode: hexCode,
                                name: "New Product",
                                preview: Preview.BUSINESS_CARD,
                                processed: false,
                            },
                        ]);

                        await setDoc(doc(db, DB_COLLECTIONS.PERMISSIONS, productRef.id), defaultPermissions);
                        await setDoc(doc(db, DB_COLLECTIONS.SERIAL_NUMBERS, serial), {
                            productID: productRef.id,
                            type: "default",
                            createdAt: serverTimestamp(),
                        });

                        uploaded++;
                    }
                } catch (err) {
                    console.error(`Error with ${serial}:`, err);
                    error++;
                }
                setProgress(Math.round(((i + 1) / serials.length) * 100));
            }
            alert(`✅ Upload complete! Created: ${uploaded}, Skipped: ${skipped}, Errors: ${error}`);
        } else {
            // =================== FLOW SANITAS ===================
            try {
                const batchSize = 400;
                for (let i = 0; i < serials.length; i += batchSize) {
                    const chunk = serials.slice(i, i + batchSize);
                    const batch = writeBatch(db);

                    chunk.forEach((row) => {
                        if (!row.serialNumber || !row.productID) return;
                        const ref = doc(db, DB_COLLECTIONS.SERIAL_NUMBERS, row.serialNumber.trim());
                        batch.set(ref, {
                            productID: row.productID.trim(),
                            type: "sanitas-payment-ring",
                            createdAt: serverTimestamp(),
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
        <div style={{ padding: 20 }}>
            <h2>Upload Serial Numbers</h2>

            {/* dropdown pentru tip */}
            <label>
                Upload type:{" "}
                <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as UploadType)}
                    disabled={loading}
                >
                    <option value="default">Default Products (generate)</option>
                    <option value="sanitas">Sanitas Payment Ring (CSV with productID)</option>
                </select>
            </label>

            <br /><br />

            <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                disabled={loading}
            />

            {fileName && (
                <p>
                    Loaded file: <strong>{fileName}</strong>
                </p>
            )}

            {serials.length > 0 && (
                <p>
                    Detected {serials.length} rows for <strong>{uploadType}</strong> upload.
                </p>
            )}

            <button
                onClick={handleUpload}
                disabled={loading || serials.length === 0}
                style={{
                    marginTop: 10,
                    padding: "8px 16px",
                    cursor: loading ? "not-allowed" : "pointer",
                }}
            >
                {loading ? "Uploading..." : "Upload to Firebase"}
            </button>

            {loading && (
                <div style={{ marginTop: 10, width: "100%", backgroundColor: "#eee", borderRadius: 4 }}>
                    <div
                        style={{
                            height: 10,
                            width: `${progress}%`,
                            backgroundColor: "#4caf50",
                            borderRadius: 4,
                            transition: "width 0.2s ease",
                        }}
                    />
                    <div style={{ marginTop: 5, fontSize: 12 }}>{progress}%</div>
                </div>
            )}
        </div>
    );
};

export default SerialUploader;
