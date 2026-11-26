import {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import Cropper, {Area} from "react-easy-crop";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import {deleteObject, getDownloadURL, ref, uploadBytesResumable} from "firebase/storage";
import {storage} from "../App";
import {getProductIdFromURL} from "../utils";
import {Asset, DB_STORAGE} from "./baby-journal-settings";
import "./image-asset-upload.css";

type ImageAssetUploadShape = "circle" | "square";
type ImageAssetUploadFit = "cover" | "contain";

type ImageAssetUploadProps = {
    value: Asset[];
    onChange: (assets: Asset[]) => void;
    storageFolder: DB_STORAGE;
    storagePath?: string;
    shape?: ImageAssetUploadShape;
    fit?: ImageAssetUploadFit;
    label: string;
    emptyText?: string;
    className?: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ImageAssetUpload({
    value,
    onChange,
    storageFolder,
    storagePath,
    shape = "circle",
    fit,
    label,
    emptyText = "Drop image or browse",
    className,
}: ImageAssetUploadProps) {
    const resolvedFit = fit || (shape === "square" ? "contain" : "cover");
    const productId = getProductIdFromURL();
    const inputRef = useRef<HTMLInputElement>(null);
    const [draftUrl, setDraftUrl] = useState("");
    const [draftFile, setDraftFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [status, setStatus] = useState<"idle" | "cropping" | "uploading" | "removing" | "error">("idle");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const assets = value || [];
    const currentAsset = assets[0];
    const previewUrl = draftUrl || currentAsset?.url || "";
    const hasImage = Boolean(previewUrl);
    const uploadClassName = [
        "image-asset-upload",
        `image-asset-upload-${shape}`,
        `image-asset-upload-fit-${resolvedFit}`,
        status === "cropping" ? "is-cropping" : "",
        hasImage ? "has-image" : "is-empty",
        className || "",
    ].filter(Boolean).join(" ");

    useEffect(() => {
        return () => {
            if (draftUrl) URL.revokeObjectURL(draftUrl);
        };
    }, [draftUrl]);

    const helperText = useMemo(() => {
        if (status === "uploading") return `Uploading ${progress}%`;
        if (status === "removing") return "Removing image";
        if (status === "cropping") return resolvedFit === "contain" ? "Preview and save your image" : "Crop and save your image";
        if (currentAsset?.url) return "Ready · Replace";
        return "JPG or PNG · max 5 MB";
    }, [currentAsset?.url, progress, resolvedFit, status]);

    const openPicker = () => {
        if (status === "uploading" || status === "removing") return;
        inputRef.current?.click();
    };

    const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        setError("");

        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Choose a JPG or PNG image.");
            setStatus("error");
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setError("Choose an image under 5 MB.");
            setStatus("error");
            return;
        }

        if (draftUrl) URL.revokeObjectURL(draftUrl);
        setDraftFile(file);
        setDraftUrl(URL.createObjectURL(file));
        setCrop({x: 0, y: 0});
        setZoom(1);
        setCroppedArea(null);
        setStatus("cropping");
    };

    const cancelCrop = () => {
        if (draftUrl) URL.revokeObjectURL(draftUrl);
        setDraftUrl("");
        setDraftFile(null);
        setCroppedArea(null);
        setStatus("idle");
        setError("");
    };

    const uploadCroppedImage = async () => {
        if (!draftFile || !draftUrl || (resolvedFit === "cover" && !croppedArea)) return;

        setStatus("uploading");
        setProgress(0);
        setError("");

        try {
            const blob = resolvedFit === "contain"
                ? await getContainedImageBlob(draftUrl)
                : await getCroppedImageBlob(draftUrl, croppedArea!, draftFile.type);
            const objectPath = storagePath || `${storageFolder}/${productId}/${draftFile.name}`;
            const uploadRef = ref(storage, objectPath);
            const task = uploadBytesResumable(uploadRef, blob, {contentType: blob.type});

            await new Promise<void>((resolve, reject) => {
                task.on(
                    "state_changed",
                    (snapshot) => {
                        const nextProgress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setProgress(nextProgress);
                    },
                    reject,
                    () => resolve(),
                );
            });

            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            onChange([{name: draftFile.name, url: downloadUrl}]);
            cancelCrop();
        } catch {
            setError("Image upload failed. Try again.");
            setStatus("error");
        }
    };

    const removeImage = async () => {
        const assetToRemove = currentAsset;
        if (!assetToRemove?.url && !storagePath) return;

        setStatus("removing");
        setError("");
        try {
            await deleteObject(ref(storage, storagePath || assetToRemove.url));
            onChange([]);
            setStatus("idle");
        } catch {
            setError("Image could not be removed. Try again.");
            setStatus("error");
        }
    };

    return (
        <div className={uploadClassName}>
            <input ref={inputRef} type="file" accept="image/*" onChange={selectFile}/>
            <div className="image-asset-upload-stage" aria-label={label}>
                {draftUrl && status === "cropping" && resolvedFit === "cover" ? (
                    <Cropper
                        image={draftUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape={shape === "circle" ? "round" : "rect"}
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
                    />
                ) : previewUrl ? (
                    <img src={previewUrl} alt={label}/>
                ) : (
                    <button type="button" className="image-asset-upload-empty" onClick={openPicker}>
                        <AddPhotoAlternateRoundedIcon aria-hidden="true"/>
                        <span>{emptyText}</span>
                    </button>
                )}
            </div>

            {status === "cropping" && (
                <div className="image-asset-crop-controls">
                    {resolvedFit === "cover" && (
                        <label>
                            <span>Zoom</span>
                            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))}/>
                        </label>
                    )}
                    <div>
                        <button type="button" onClick={cancelCrop}>Cancel</button>
                        <button type="button" onClick={uploadCroppedImage}>Save image</button>
                    </div>
                </div>
            )}

            {status === "uploading" && (
                <div className="image-asset-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <span style={{transform: `scaleX(${progress / 100})`}}/>
                </div>
            )}

            {status !== "cropping" && (
                <div className="image-asset-actions">
                    <button type="button" onClick={openPicker} disabled={status === "uploading" || status === "removing"}>
                        {currentAsset?.url ? <RestartAltRoundedIcon aria-hidden="true"/> : <PhotoCameraRoundedIcon aria-hidden="true"/>}
                        {currentAsset?.url ? "Replace" : "Browse"}
                    </button>
                    {currentAsset?.url && (
                        <button type="button" onClick={removeImage} disabled={status === "uploading" || status === "removing"}>
                            <DeleteOutlineRoundedIcon aria-hidden="true"/>
                            Remove
                        </button>
                    )}
                </div>
            )}

            <small>{error || helperText}</small>
        </div>
    );
}

async function getCroppedImageBlob(imageSrc: string, crop: Area, sourceType: string): Promise<Blob> {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const size = Math.min(crop.width, crop.height);
    const outputSize = 720;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");

    ctx.drawImage(
        image,
        crop.x,
        crop.y,
        size,
        size,
        0,
        0,
        outputSize,
        outputSize,
    );

    const outputType = sourceType === "image/png" ? "image/png" : "image/jpeg";
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Could not crop image."));
        }, outputType, 0.92);
    });
}

async function getContainedImageBlob(imageSrc: string): Promise<Blob> {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const outputSize = 720;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");

    ctx.clearRect(0, 0, outputSize, outputSize);
    const scale = Math.min(outputSize / image.width, outputSize / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (outputSize - width) / 2;
    const y = (outputSize - height) / 2;
    ctx.drawImage(image, x, y, width, height);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Could not export image."));
        }, "image/png");
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}
