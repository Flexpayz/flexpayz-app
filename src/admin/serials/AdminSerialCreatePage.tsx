import {useState} from "react";
import {Stack} from "@mui/material";
import {Surface} from "../../components/design-system";
import SerialUploader from "../../components/serial-number-uploader";
import type {FirestoreDocument} from "../../firestore/schema/primitives";
import type {Product} from "../../control-state";

export function AdminSerialCreatePage() {
    const [, setProducts] = useState<FirestoreDocument<Product>[]>([]);

    return (
        <Stack spacing={4}>
            <Surface>
                <p className="admin-muted">
                    Choose a CSV or TXT file to see the number of loaded rows, then select Upload to Firebase to proceed.
                    Default uploads create one product per new serial; existing serials are skipped.
                </p>
                <SerialUploader setProducts={setProducts}/>
            </Surface>
        </Stack>
    );
}
