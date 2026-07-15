'use strict';

const Jimp = require('jimp');
const { FFT2D } = require('./fft');

const WATERMARK_FONT = Jimp.FONT_SANS_32_WHITE;
const ALPHA_THRESHOLD = 128;
let fontPromise;

function getConfig() {
    return {};
}

// Kept as a no-op so applications using the old OpenCV path setting do not break.
function setConfig() {
    return getConfig();
}

function validateTransformArguments(srcFileName, watermarkText, fontSize, outputFileName) {
    if (typeof srcFileName !== 'string' && !Buffer.isBuffer(srcFileName)) {
        throw new TypeError('fileName must be string or Buffer');
    }
    if (typeof watermarkText !== 'string') {
        throw new TypeError('waterMarkText must be string');
    }
    if (typeof fontSize !== 'number' || !Number.isFinite(fontSize) || fontSize <= 0) {
        throw new TypeError('fontSize must be a positive finite number');
    }
    if (typeof outputFileName !== 'string') {
        throw new TypeError('outFileName must be string');
    }
}

function validateDecodeArguments(inputFileName, outputFileName) {
    if (typeof inputFileName !== 'string' && !Buffer.isBuffer(inputFileName)) {
        throw new TypeError('fileName must be string or Buffer');
    }
    if (typeof outputFileName !== 'string') {
        throw new TypeError('backFileName must be string');
    }
}

function getWatermarkFont() {
    if (!fontPromise) {
        fontPromise = Jimp.loadFont(WATERMARK_FONT);
    }
    return fontPromise;
}

async function createTextMask(text, scale) {
    if (text.length === 0) {
        return null;
    }

    const font = await getWatermarkFont();
    const sourceWidth = Jimp.measureText(font, text);
    const sourceHeight = font.common.lineHeight;
    const source = new Jimp(sourceWidth, sourceHeight, 0x00000000);
    source.print(font, 0, 0, text);

    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    if (width !== sourceWidth || height !== sourceHeight) {
        source.resize(width, height, Jimp.RESIZE_NEAREST_NEIGHBOR);
    }

    return {
        data: source.bitmap.data,
        width,
        height,
        baseline: Math.round(font.common.base * scale)
    };
}

function clearSpectrumPixel(real, imag, width, height, x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
        return;
    }
    const index = (y * width) + x;
    real[index] = 0;
    imag[index] = 0;
}

function addTextToSpectrum(real, imag, width, height, mask, pointX, pointY) {
    if (!mask) {
        return;
    }

    const left = Math.trunc(pointX);
    const top = Math.trunc(pointY) - mask.baseline;
    for (let maskY = 0; maskY < mask.height; maskY += 1) {
        for (let maskX = 0; maskX < mask.width; maskX += 1) {
            const alphaIndex = (((maskY * mask.width) + maskX) * 4) + 3;
            if (mask.data[alphaIndex] < ALPHA_THRESHOLD) {
                continue;
            }

            const x = left + maskX;
            const y = top + maskY;
            clearSpectrumPixel(real, imag, width, height, x, y);
            // This mirrors OpenCV's flip(..., -1) sequence used by prior releases.
            clearSpectrumPixel(real, imag, width, height, width - 1 - x, height - 1 - y);
        }
    }
}

function createFrequencyData(bitmap) {
    const { width, height, data } = bitmap;
    const real = new Float64Array(width * height);
    const imag = new Float64Array(width * height);
    for (let i = 0; i < real.length; i += 1) {
        // matFromImageData exposed RGBA, and the previous implementation used channel 0.
        real[i] = data[i * 4];
    }
    return { real, imag };
}

function clampByte(value) {
    if (value <= 0 || Number.isNaN(value)) {
        return 0;
    }
    if (value >= 255) {
        return 255;
    }
    return Math.round(value);
}

async function embedWatermark(bitmap, watermarkText, fontSize) {
    const { width, height } = bitmap;
    const mask = await createTextMask(watermarkText, fontSize);
    const { real, imag } = createFrequencyData(bitmap);
    const fft = new FFT2D(width, height);
    fft.transform(real, imag, false);

    addTextToSpectrum(real, imag, width, height, mask, width / 2, height / 2);
    addTextToSpectrum(real, imag, width, height, mask, 45, 45);
    fft.transform(real, imag, true);

    const output = Buffer.from(bitmap.data);
    for (let i = 0; i < real.length; i += 1) {
        output[i * 4] = clampByte(real[i]);
    }
    return output;
}

function swapMagnitudeQuadrants(magnitude, width, height) {
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    for (let y = 0; y < halfHeight; y += 1) {
        const bottomY = y + halfHeight;
        for (let x = 0; x < halfWidth; x += 1) {
            const rightX = x + halfWidth;
            const topLeft = (y * width) + x;
            const topRight = (y * width) + rightX;
            const bottomLeft = (bottomY * width) + x;
            const bottomRight = (bottomY * width) + rightX;

            let value = magnitude[topLeft];
            magnitude[topLeft] = magnitude[bottomRight];
            magnitude[bottomRight] = value;

            value = magnitude[topRight];
            magnitude[topRight] = magnitude[bottomLeft];
            magnitude[bottomLeft] = value;
        }
    }
}

function spectrumToRgba(real, imag, width, height) {
    const pixelCount = width * height;
    const magnitude = new Float64Array(pixelCount);
    for (let i = 0; i < pixelCount; i += 1) {
        magnitude[i] = Math.log1p(Math.hypot(real[i], imag[i]));
    }
    swapMagnitudeQuadrants(magnitude, width, height);

    // OpenCV converted to 8-bit before min/max normalization, so retain that step.
    const quantized = new Uint8Array(pixelCount);
    let minimum = 255;
    let maximum = 0;
    for (let i = 0; i < pixelCount; i += 1) {
        const value = clampByte(magnitude[i]);
        quantized[i] = value;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
    }

    const output = Buffer.alloc(pixelCount * 4);
    const range = maximum - minimum;
    for (let i = 0; i < pixelCount; i += 1) {
        const value = range === 0 ? 0 : clampByte((quantized[i] - minimum) * 255 / range);
        const offset = i * 4;
        output[offset] = value;
        output[offset + 1] = value;
        output[offset + 2] = value;
        output[offset + 3] = 255;
    }
    return output;
}

async function transformImageWithText(srcFileName, watermarkText, fontSize, enCodeFileName = '') {
    validateTransformArguments(srcFileName, watermarkText, fontSize, enCodeFileName);
    const source = await Jimp.read(srcFileName);
    const data = await embedWatermark(source.bitmap, watermarkText, fontSize);
    const result = new Jimp({
        width: source.bitmap.width,
        height: source.bitmap.height,
        data
    });

    return enCodeFileName ? result.writeAsync(enCodeFileName) : result;
}

async function getTextFormImage(enCodeFileName, deCodeFileName = '') {
    validateDecodeArguments(enCodeFileName, deCodeFileName);
    const source = await Jimp.read(enCodeFileName);
    const { width, height } = source.bitmap;
    const { real, imag } = createFrequencyData(source.bitmap);
    const fft = new FFT2D(width, height);
    fft.transform(real, imag, false);
    const result = new Jimp({
        width,
        height,
        data: spectrumToRgba(real, imag, width, height)
    });

    return deCodeFileName ? result.writeAsync(deCodeFileName) : result;
}

module.exports = {
    transformImageWithText,
    getTextFormImage,
    getConfig,
    setConfig
};
