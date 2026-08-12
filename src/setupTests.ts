import '@testing-library/jest-dom';
import {TextDecoder, TextEncoder} from 'util';
import {ReadableStream, TransformStream, WritableStream} from 'stream/web';

Object.assign(global, {ReadableStream, TextDecoder, TextEncoder, TransformStream, WritableStream});

function readBlob(blob: Blob, method: "readAsArrayBuffer"): Promise<ArrayBuffer>;
function readBlob(blob: Blob, method: "readAsText"): Promise<string>;
function readBlob(blob: Blob, method: "readAsArrayBuffer" | "readAsText") {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result);
        reader[method](blob);
    });
}

if (typeof Blob !== "undefined" && !Blob.prototype.text) {
    Object.defineProperty(Blob.prototype, "text", {
        value() {
            return readBlob(this, "readAsText");
        },
    });
}

if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
    Object.defineProperty(Blob.prototype, "arrayBuffer", {
        value() {
            return readBlob(this, "readAsArrayBuffer");
        },
    });
}
