import React, {useEffect, useState} from 'react';
import {getDownloadURL, ref, uploadBytesResumable, listAll, deleteObject, getMetadata} from 'firebase/storage';
import {FilePond, registerPlugin} from 'react-filepond';
// import FilePondPluginGetFile from 'filepond-plugin-get-file';
// import 'filepond-plugin-get-file/dist/filepond-plugin-get-file.min.css';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'

import {storage} from "../App";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import 'filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css'
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import {FilePondFile} from "filepond";
import {getProductIdFromURL} from "../utils";
import {Asset, DB_STORAGE} from "./baby-journal-settings";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginFilePoster)

export const listFilesAndGetURLs = async (folderPath: any) => {
    const listRef = ref(storage, folderPath);
    const files = await listAll(listRef);
    const urls = await Promise.all(
        files.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return {url, name: itemRef.name};
        })
    );
    return urls;
};

export const deleteFile = async (filePath: any) => {
    const fileRef = ref(storage, filePath);
    try {
        await deleteObject(fileRef);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};


interface AssetUpload3Props {
    value: Asset[]
    onChange: (assets: Asset[]) => void
    multiple?: boolean
    maxFiles?: number,
    storageFolder: DB_STORAGE
}

function AssetUpload3({value, onChange, multiple = false, maxFiles = 1, storageFolder}: AssetUpload3Props) {
    const [files, setFiles] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string, source: string }[]>([]);
    const productId = getProductIdFromURL()
    useEffect(() => {
        // Fetch files from Firebase Storage at initialization
        const fetchFiles = async () => {
            const urls = value; // Specify your folder path
            const formattedFiles = await Promise.all(urls.map(async (file) => {
                const assetRef = ref(storage, file.url);
                const metadata = await getMetadata(assetRef)
                return {
                    source: file.url,
                    options: {
                        type: 'local',
                        file: {
                            name: file.name,
                            size: metadata.size,
                            type: metadata.contentType, // Replace with correct file type if known
                        },
                        metadata: {
                            poster: file.url, // For image files
                        },
                    },
                }
            }));
            setFiles(formattedFiles as any);
        };

        fetchFiles();
    }, []);

    const handleUpload = (file: any) => {
        if (!file) return;

        const storageRef = ref(storage, `${storageFolder}/${productId}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            () => {},
            (error) => {
                console.error('Upload failed:', error);
            },
            () => {
                // Upload completed successfully
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    const url = new URL(decodeURIComponent(downloadURL));
                    const fileName = url.pathname.split('/').pop()!
                    setUploadedFiles((prev: any) => [...prev, {name: fileName, source: downloadURL}] as any);
                });
            }
        );
    };

    const handleRemove = async (source: any) => {
        // const url = new URL(source);
        // // const filePath = decodeURIComponent(url.pathname?.split('/').pop()!)
        // // await deleteFile(filePath);
        setFiles((prevFiles) => prevFiles.filter((f: any) => f?.source !== source));
    };

    const onUpdateFiles = (files: FilePondFile[]) => {
        setFiles(files as any)
    }

    useEffect(() => {
        const tempFilesFormat: Asset[] = files.map((file: FilePondFile) => {
            let storageUrl = ""
            if (typeof file.source === "string") {
                storageUrl = file.source
            } else {
                const justDownloadedFile = uploadedFiles.find((downloadedFile: any) => {
                    return decodeURIComponent(downloadedFile.name).startsWith(file.filenameWithoutExtension)
                })
                storageUrl = justDownloadedFile?.source || ""
            }
            return {
                name: file.filename,
                url: storageUrl
            } as Asset
        })
        onChange(tempFilesFormat)
    }, [files, uploadedFiles]);

    return (
        <div style={{width: "90%"}}>
            <FilePond
                allowReplace={true}
                files={files}
                allowMultiple={multiple}
                maxFiles={maxFiles}
                onupdatefiles={onUpdateFiles}
                allowImagePreview
                // allowDownloadByUrl
                acceptedFileTypes={['image/*', 'application/pdf']} // Adjust this according to your needs
                server={{
                    process: (fieldName, file, metadata, load, error, progress, abort) => {
                        handleUpload(file);

                        // Allow FilePond to call the necessary functions
                        load(file.name);
                        return {
                            abort: () => {
                                abort();
                            },
                        };
                    },
                    remove: (source, load, error) => {
                        // Should somehow send `source` to server so server can remove the file with this source
                        handleRemove(source)
                        // load()
                        //
                        // // Can call the error method if something is wrong, should exit after
                        // error('oh my goodness');

                        // Should call the load method when done, no parameters required
                        load();
                    },
                }}
                name="file"
                labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
            />

        </div>

    );
}

export default AssetUpload3;
