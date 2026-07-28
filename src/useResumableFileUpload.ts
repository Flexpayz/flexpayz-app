import {useCallback, useEffect, useRef, useState} from "react";
import {FullMetadata, StorageError, UploadMetadata, UploadTask, getMetadata, ref, uploadBytesResumable} from "firebase/storage";
import {storage} from "./App";

export type UploadStatus =
    | "idle"
    | "validating"
    | "ready"
    | "uploading"
    | "paused"
    | "success"
    | "error"
    | "cancelled";

export type ResumableUploadState = {
    status: UploadStatus;
    bytesTransferred: number;
    totalBytes: number;
    progress: number;
    errorMessage: string;
    fileName: string;
    fileSize: number;
    metadata?: FullMetadata;
};

type UseResumableFileUploadOptions = {
    storagePath: string;
    validateFile?: (file: File) => Promise<string | null> | string | null;
};

const initialState: ResumableUploadState = {
    status: "idle",
    bytesTransferred: 0,
    totalBytes: 0,
    progress: 0,
    errorMessage: "",
    fileName: "",
    fileSize: 0,
};

export function useResumableFileUpload({storagePath, validateFile}: UseResumableFileUploadOptions) {
    const [state, setState] = useState<ResumableUploadState>(initialState);
    const taskRef = useRef<UploadTask | null>(null);
    const unsubscribeRef = useRef<(() => void) | undefined>();
    const selectedFileRef = useRef<File | null>(null);
    const selectedMetadataRef = useRef<UploadMetadata | undefined>();
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            unsubscribeRef.current?.();
        };
    }, []);

    const upload = useCallback(async (file: File, metadata?: UploadMetadata): Promise<FullMetadata | null> => {
        if (taskRef.current && state.status === "uploading") return null;

        selectedFileRef.current = file;
        selectedMetadataRef.current = metadata;
        setState({
            ...initialState,
            status: "validating",
            fileName: file.name,
            fileSize: file.size,
            totalBytes: file.size,
        });

        const validationError = validateFile ? await validateFile(file) : null;
        if (validationError) {
            if (mountedRef.current) {
                setState((prev) => ({...prev, status: "error", errorMessage: validationError}));
            }
            return null;
        }

        const storageRef = ref(storage, storagePath);
        const task = uploadBytesResumable(storageRef, file, metadata);
        taskRef.current = task;

        return new Promise((resolve) => {
            unsubscribeRef.current = task.on(
                "state_changed",
                (snapshot) => {
                    if (!mountedRef.current) return;
                    const progress = snapshot.totalBytes > 0
                        ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                        : 0;
                    setState((prev) => ({
                        ...prev,
                        status: snapshot.state === "paused" ? "paused" : "uploading",
                        bytesTransferred: snapshot.bytesTransferred,
                        totalBytes: snapshot.totalBytes,
                        progress,
                    }));
                },
                (error) => {
                    taskRef.current = null;
                    if (mountedRef.current) {
                        setState((prev) => ({
                            ...prev,
                            status: error.code === "storage/canceled" ? "cancelled" : "error",
                            errorMessage: mapUploadError(error),
                        }));
                    }
                    resolve(null);
                },
                async () => {
                    taskRef.current = null;
                    try {
                        const finalMetadata = await getMetadata(storageRef);
                        if (mountedRef.current) {
                            setState((prev) => ({
                                ...prev,
                                status: "success",
                                progress: 100,
                                bytesTransferred: prev.totalBytes || file.size,
                                totalBytes: prev.totalBytes || file.size,
                                metadata: finalMetadata,
                                errorMessage: "",
                            }));
                        }
                        resolve(finalMetadata);
                    } catch {
                        if (mountedRef.current) {
                            setState((prev) => ({
                                ...prev,
                                status: "error",
                                errorMessage: "The upload finished, but we could not verify the document. Refresh and try again.",
                            }));
                        }
                        resolve(null);
                    }
                },
            );
        });
    }, [state.status, storagePath, validateFile]);

    const cancel = useCallback(() => {
        taskRef.current?.cancel();
    }, []);

    const retry = useCallback(() => {
        if (!selectedFileRef.current) return Promise.resolve(null);
        return upload(selectedFileRef.current, selectedMetadataRef.current);
    }, [upload]);

    const reset = useCallback(() => {
        unsubscribeRef.current?.();
        taskRef.current = null;
        selectedFileRef.current = null;
        selectedMetadataRef.current = undefined;
        setState(initialState);
    }, []);

    return {state, upload, cancel, retry, reset};
}

export function mapUploadError(error: StorageError | Error) {
    const code = "code" in error ? error.code : "";
    if (code === "storage/canceled") return "Upload cancelled.";
    if (code === "storage/retry-limit-exceeded") return "Upload interrupted. Check your connection and retry.";
    if (code === "storage/unauthorized") return "You do not have permission to upload this document.";
    if (code === "storage/quota-exceeded") return "Storage quota was exceeded. Contact support before retrying.";
    return "Upload failed. Your current document was not changed.";
}
