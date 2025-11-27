import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "../App";
import { DB_COLLECTIONS } from "../components/baby-journal-settings";

type SerialNumberType = "default" | "sanitas-payment-ring";

type SerialNumberDoc = {
    productID?: string;
    type?: SerialNumberType;
    redirectUrl?: string;
};

const SANITAS_URL_TEMPLATE = (productID: string) =>
    `https://app.sanitas.org.ro/show/dashboard?product_id=${productID}`;

export function SerialNumberRedirect() {
    const navigate = useNavigate();
    const [state, setState] = useState<
        { status: "loading" } |
        { status: "error"; message: string }
    >({ status: "loading" });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const serialNumber = urlParams.get("serialNumber") || "";

        if (!serialNumber) {
            setState({ status: "error", message: "Nu ai introdus un număr serial." });
            return;
        }

        (async () => {
            try {
                const ref = doc(db, DB_COLLECTIONS.SERIAL_NUMBERS, serialNumber);
                const snap = await getDoc(ref);

                if (!snap.exists()) {
                    setState({
                        status: "error",
                        message: "Număr serial invalid. Te rugăm contactează suportul.",
                    });
                    return;
                }

                const data = snap.data() as SerialNumberDoc;
                const productID = data.productID;

                if (!productID) {
                    setState({
                        status: "error",
                        message: "Produs indisponibil momentan. Încearcă mai târziu.",
                    });
                    return;
                }

                const type = (data.type ?? "default") as SerialNumberType;

                if (type === "sanitas-payment-ring") {
                    const target =
                        data.redirectUrl?.replace("{productID}", encodeURIComponent(productID)) ||
                        SANITAS_URL_TEMPLATE(productID);

                    window.location.replace(target);
                    return;
                }

                // fallback default
                navigate(`/show-product?product_id=${encodeURIComponent(productID)}`, { replace: true });
            } catch (e) {
                console.error(e);
                setState({
                    status: "error",
                    message: "A apărut o eroare la încărcare. Încearcă din nou.",
                });
            }
        })();
    }, [navigate]);

    // UI de fallback
    if (state.status === "loading") {
        return <div style={{ padding: "2rem", textAlign: "center" }}>Se redirecționează…</div>;
    }

    if (state.status === "error") {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
                <p>{state.message}</p>
                <a href="mailto:support@exemplu.com">Contactează suportul</a>
            </div>
        );
    }

    return null;
}
