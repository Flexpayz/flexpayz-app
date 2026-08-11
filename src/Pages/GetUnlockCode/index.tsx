import React, { useState } from "react";
import { jsPDF } from "jspdf";
import {getProduct} from "../../firestore/repositories/products";
import {getSerialNumber} from "../../firestore/repositories/serialNumbers";

const UnlockCodeLookup: React.FC = () => {
    const [url, setUrl] = useState("");
    const [redirectUrl, setRedirectUrl] = useState("");
    const [productId, setProductId] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [unlockCode, setUnlockCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // === Handle lookup by product_id link ===
    const handleCheckProduct = async () => {
        try {
            setError(null);
            setUnlockCode(null);
            setLoading(true);

            const match = url.match(/product_id=([^&]+)/);
            if (!match) {
                setError("❌ Invalid link, no product_id found.");
                setLoading(false);
                return;
            }

            const id = match[1];
            setProductId(id);

            const product = await getProduct(id);
            if (!product) {
                setError("❌ Product not found.");
            } else {
                setUnlockCode(product.unlockCode || "⚠️ No unlockCode field");
            }
        } catch (err: any) {
            console.error(err);
            setError("❌ Error fetching product.");
        } finally {
            setLoading(false);
        }
    };

    // === Handle lookup by redirect link (serial number) ===
    const handleCheckSerial = async () => {
        try {
            setError(null);
            setUnlockCode(null);
            setLoading(true);

            const match = redirectUrl.match(/i=([^&]+)/);
            if (!match) {
                setError("❌ Invalid redirect link, no serial number found.");
                setLoading(false);
                return;
            }

            const serial = match[1];
            setSerialNumber(serial);

            // 1️⃣ Find serial document
            const serialDoc = await getSerialNumber(serial);
            if (!serialDoc) {
                setError("❌ Serial number not found in SERIAL_NUMBERS collection.");
                setLoading(false);
                return;
            }

            const productID = serialDoc.data.productID;

            if (!productID) {
                setError("⚠️ Serial found, but missing productID field.");
                setLoading(false);
                return;
            }

            setProductId(productID);

            // 2️⃣ Fetch unlock code from product
            const product = await getProduct(productID);
            if (!product) {
                setError("❌ Product not found for this serial number.");
            } else {
                setUnlockCode(product.unlockCode || "⚠️ No unlockCode field");
            }
        } catch (err: any) {
            console.error(err);
            setError("❌ Error fetching serial/product.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (unlockCode) {
            await navigator.clipboard.writeText(unlockCode);
            alert("✅ Unlock code copied!");
        }
    };

    // ================= PDF CREATOR =================
    const createUnlockCodePDF = () => {
        if (!unlockCode) return null;

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [30, 15], // exact sticker size
        });

        // title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text("UNLOCK CODE", 15, 4, { align: "center" });

        // code
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(18);
        pdf.text(unlockCode, 15, 11, { align: "center" });

        return pdf;
    };

    const handleDownloadPDF = () => {
        const pdf = createUnlockCodePDF();
        if (!pdf) return;
        pdf.save(`unlock_code_${productId}.pdf`);
    };

    const handlePrintPDF = () => {
        const pdf = createUnlockCodePDF();
        if (!pdf) return;

        const blob = pdf.output("blob");
        const pdfUrl = URL.createObjectURL(blob);
        const printWindow = window.open(pdfUrl);
        if (printWindow) {
            printWindow.addEventListener("load", () => {
                printWindow.focus();
                printWindow.print();
            });
        }
    };

    return (
        <div style={{ padding: 20, maxWidth: 600 }}>
            <h2>Unlock Code Lookup</h2>

            <h4>🔹 Search by Product Link</h4>
            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://flexpayz.com/app?product_id=XXXX"
                style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 10,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                }}
            />
            <button onClick={handleCheckProduct} disabled={loading || !url}>
                {loading ? "Checking..." : "Get Unlock Code by Product ID"}
            </button>

            <hr style={{ margin: "20px 0" }} />

            <h4>🔹 Search by Redirect Link (Serial Number)</h4>
            <input
                type="text"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="http://dgsq.uk/redirect?i=SERIALNUMBER&c=XXXX"
                style={{
                    width: "100%",
                    padding: 8,
                    marginBottom: 10,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                }}
            />
            <button onClick={handleCheckSerial} disabled={loading || !redirectUrl}>
                {loading ? "Checking..." : "Get Unlock Code by Serial Number"}
            </button>

            {serialNumber && (
                <p>
                    <strong>Serial Number:</strong> {serialNumber}
                </p>
            )}
            {productId && (
                <p>
                    <strong>Product ID:</strong> {productId}
                </p>
            )}

            {unlockCode && (
                <div>
                    <p style={{ color: "green" }}>
                        ✅ <strong>Unlock Code:</strong> {unlockCode}
                    </p>
                    <button onClick={handleCopy}>📋 Copy</button>
                    <button onClick={handleDownloadPDF} style={{ marginLeft: 10 }}>
                        ⬇️ Download PDF
                    </button>
                    <button onClick={handlePrintPDF} style={{ marginLeft: 10 }}>
                        🖨️ Print
                    </button>
                </div>
            )}

            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default UnlockCodeLookup;
