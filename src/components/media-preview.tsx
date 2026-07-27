import React, { useEffect, useState } from 'react';
import {
  FilePond,
  registerPlugin,
//   FilePondFile,
//   FilePondServerConfigProps
} from 'react-filepond';

import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

import { storage } from '../App';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata
} from 'firebase/storage';
import { Asset } from './baby-journal-settings';
import { getProductIdFromURL } from '../utils';

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFilePoster,
  FilePondPluginFileValidateType
);

interface MediaPreviewProps {
  value: Asset[];
  multiple?: boolean;
  maxFiles?: number;
}

export function MediaPreview({
  value,
  multiple = true,
  maxFiles = 3
}: MediaPreviewProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [downloadList, setDownloadList] = useState<Asset[]>([]);

  // 1. La montare, pregătim FilePond să afișeze fișierele existente
  useEffect(() => {
    async function fetchFiles() {
      const items = await Promise.all(
        value.map(async asset => {
          const meta = await getMetadata(ref(storage, asset.url));
          return {
            source: asset.url,
            options: {
              type: 'local',
              file: {
                name: asset.name,
                size: meta.size,
                type: meta.contentType
              },
              metadata: { poster: asset.url }
            }
          };
        })
      );
      setFiles(items as any);
      setDownloadList(value);
    }
    fetchFiles();
  }, [value]);

  // 2. Configurăm upload și ștergere pentru Firebase
  const server: any['server'] = {
    //@ts-ignore
    // 2.0. FilePond apelează această funcție când un fișier e încărcat
    process: (fieldName, file, metadata, load, error, progress, abort) => {
      const productId = getProductIdFromURL();
      const storageRef = ref(storage, `uploads/${productId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        snap => {
          progress(true, snap.bytesTransferred, snap.totalBytes);
        },
        err => error(err.message),
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then(url => {
              // 2.1. raportează URL-ul în FilePond (nu mai folosim createObjectURL)
              load(url);
              // 2.2. adaugă în lista noastră de download
              setDownloadList(list => [
                ...list,
                { name: file.name, url }
              ]);
            })
            .catch(err => error(err.message));
        }
      );

      return {
        abort: () => {
          uploadTask.cancel();
          abort();
        }
      };
    },

    // revert e apelat când un fișier e „undo”-at în UI
    //@ts-ignore
  };

  return (
    <div style={{ width: '100%' }}>
      <FilePond
        files={files}
        allowMultiple={multiple}
        onupdatefiles={setFiles}
        acceptedFileTypes={['image/*', 'application/pdf']}
        allowImagePreview
        allowRemove={false}
        server={server}
        name="file"
        labelIdle='See files'
      />

      {/* 3. Lista de link-uri native pentru download */}
      <div style={{ marginTop: '1rem' }}>
        {downloadList.map(asset => (
          <a
            key={asset.url}
            href={asset.url}
            download={asset.name}
            style={{ display: 'block', margin: '0.25rem 0' }}
          >
            ⬇️ Descarcă {asset.name}
          </a>
        ))}
      </div>
    </div>
  );
}
