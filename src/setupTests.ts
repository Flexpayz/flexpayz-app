import '@testing-library/jest-dom';
import {TextDecoder, TextEncoder} from 'util';
import {ReadableStream, TransformStream, WritableStream} from 'stream/web';

Object.assign(global, {ReadableStream, TextDecoder, TextEncoder, TransformStream, WritableStream});
