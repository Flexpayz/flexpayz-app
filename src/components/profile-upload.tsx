import {Asset, DB_STORAGE} from "./baby-journal-settings";
import {ImageAssetUpload} from "./image-asset-upload";

type ProfileUploadProps = {
    value: Asset[];
    onChange: (assets: Asset[]) => void;
    multiple?: boolean;
    maxFiles?: number;
    storageFolder: DB_STORAGE;
    storagePath?: string;
    shape?: "circle" | "square";
    fit?: "cover" | "contain";
    className?: string;
    label?: string;
    emptyText?: string;
};

export function ProfileUpload({
    value,
    onChange,
    storageFolder,
    storagePath,
    shape = "circle",
    fit,
    className,
    label,
    emptyText,
}: ProfileUploadProps) {
    return (
        <ImageAssetUpload
            value={value}
            onChange={onChange}
            storageFolder={storageFolder}
            storagePath={storagePath}
            shape={shape}
            fit={fit}
            className={className}
            label={label || (shape === "circle" ? "Profile photo" : "Image asset")}
            emptyText={emptyText}
        />
    );
}
