// @ts-check
'use strict';

/**
 * Codificador y decodificador PNG mínimos (RGB/RGBA de 8 bits, sin
 * entrelazado) sin dependencias. Los usan el generador del icono y las capturas
 * del README.
 */

const zlib = require('node:zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** @param {Buffer} buf */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {string} type @param {Buffer} data */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * @param {number} width @param {number} height
 * @param {Uint8Array} rgba width*height*4 bytes
 */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // sin filtro
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Lee un PNG de 8 bits por canal (RGB o RGBA, sin entrelazado), como los que
 * guardan System.Drawing y Chromium.
 * @param {Buffer} buf
 * @returns {{width: number, height: number, rgba: Uint8Array}}
 */
function decodePng(buf) {
  let p = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  /** @type {Buffer[]} */
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0 || (data[9] !== 2 && data[9] !== 6)) throw new Error('PNG no soportado (solo RGB/RGBA de 8 bits sin entrelazado)');
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      rgba[o] = line[x * channels];
      rgba[o + 1] = line[x * channels + 1];
      rgba[o + 2] = line[x * channels + 2];
      rgba[o + 3] = channels === 4 ? line[x * channels + 3] : 255;
    }
    prev = line;
  }
  return { width, height, rgba };
}

/**
 * Recorta una imagen RGBA.
 * @param {{width: number, height: number, rgba: Uint8Array}} img
 * @param {number} x @param {number} y @param {number} w @param {number} h
 */
function cropRgba(img, x, y, w, h) {
  const rgba = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) rgba.set(img.rgba.subarray(((y + j) * img.width + x) * 4, ((y + j) * img.width + x + w) * 4), j * w * 4);
  return { width: w, height: h, rgba };
}

/**
 * La mitad de ancho y de alto, con la media de cada bloque de 2 × 2 píxeles.
 * @param {{width: number, height: number, rgba: Uint8Array}} img
 */
function halveRgba(img) {
  const width = img.width >> 1;
  const height = img.height >> 1;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = ((2 * y) * img.width + 2 * x) * 4;
      const b = a + img.width * 4;
      for (let c = 0; c < 4; c++) rgba[(y * width + x) * 4 + c] = (img.rgba[a + c] + img.rgba[a + 4 + c] + img.rgba[b + c] + img.rgba[b + 4 + c] + 2) >> 2;
    }
  }
  return { width, height, rgba };
}

/**
 * Pinta un borde de `size` píxeles por dentro de la imagen (la cambia).
 * @param {{width: number, height: number, rgba: Uint8Array}} img
 * @param {[number, number, number]} rgb @param {number} size
 */
function edgeRgba(img, rgb, size) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (x >= size && y >= size && x < img.width - size && y < img.height - size) continue;
      img.rgba.set([...rgb, 255], (y * img.width + x) * 4);
    }
  }
  return img;
}

module.exports = { encodePng, decodePng, cropRgba, halveRgba, edgeRgba, crc32 };
