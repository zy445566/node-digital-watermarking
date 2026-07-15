'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Jimp = require('jimp');
const DigitalWatermarking = require('../index');
const { FFTPlan, FFT2D } = require('../fft');

function assertClose(actual, expected, tolerance, message) {
    assert(Math.abs(actual - expected) <= tolerance,
        `${message}: expected ${expected}, received ${actual}`);
}

function testFft() {
    // Prime lengths exercise Bluestein's algorithm; powers of two use radix-2.
    for (const size of [1, 2, 3, 5, 8, 11, 17]) {
        const sourceReal = Float64Array.from({ length: size }, (_, i) => Math.sin(i * 0.7) + i);
        const sourceImag = Float64Array.from({ length: size }, (_, i) => Math.cos(i * 0.3));
        const real = sourceReal.slice();
        const imag = sourceImag.slice();
        const fft = new FFTPlan(size);
        fft.transform(real, imag, false);
        fft.transform(real, imag, true);

        for (let i = 0; i < size; i += 1) {
            assertClose(real[i], sourceReal[i], 1e-9, `real FFT round trip at ${size}:${i}`);
            assertClose(imag[i], sourceImag[i], 1e-9, `imaginary FFT round trip at ${size}:${i}`);
        }
    }

    const width = 5;
    const height = 3;
    const real = Float64Array.from({ length: width * height }, (_, i) => i % 7);
    const source = real.slice();
    const imag = new Float64Array(real.length);
    const fft = new FFT2D(width, height);
    fft.transform(real, imag, false);
    fft.transform(real, imag, true);
    for (let i = 0; i < real.length; i += 1) {
        assertClose(real[i], source[i], 1e-9, `2D FFT round trip at ${i}`);
        assertClose(imag[i], 0, 1e-9, `2D FFT imaginary residue at ${i}`);
    }
}

function assertOnlyFirstChannelChanged(source, encoded) {
    let changedPixels = 0;
    for (let offset = 0; offset < source.bitmap.data.length; offset += 4) {
        if (source.bitmap.data[offset] !== encoded.bitmap.data[offset]) {
            changedPixels += 1;
        }
        assert.strictEqual(encoded.bitmap.data[offset + 1], source.bitmap.data[offset + 1]);
        assert.strictEqual(encoded.bitmap.data[offset + 2], source.bitmap.data[offset + 2]);
        assert.strictEqual(encoded.bitmap.data[offset + 3], source.bitmap.data[offset + 3]);
    }
    assert(changedPixels > 0, 'watermark should modify the first color channel');
}

function assertGrayscale(image) {
    let minimum = 255;
    let maximum = 0;
    for (let offset = 0; offset < image.bitmap.data.length; offset += 4) {
        const value = image.bitmap.data[offset];
        assert.strictEqual(image.bitmap.data[offset + 1], value);
        assert.strictEqual(image.bitmap.data[offset + 2], value);
        assert.strictEqual(image.bitmap.data[offset + 3], 255);
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
    }
    assert(maximum > minimum, 'decoded spectrum should contain a visible intensity range');
}

async function testPublicApi() {
    const sourcePath = path.join(__dirname, 'srcImg.png');
    const sourceBuffer = fs.readFileSync(sourcePath);
    const source = await Jimp.read(sourceBuffer);
    const text = 'github.com/zy445566';

    assert.deepStrictEqual(DigitalWatermarking.setConfig({ legacy: '/not/used' }), {});
    const encoded = await DigitalWatermarking.transformImageBufferWithText(sourceBuffer, text, 1.1);
    assert(encoded instanceof Jimp);
    assert.strictEqual(encoded.bitmap.width, source.bitmap.width);
    assert.strictEqual(encoded.bitmap.height, source.bitmap.height);
    assertOnlyFirstChannelChanged(source, encoded);

    const encodedBuffer = await encoded.getBufferAsync(Jimp.MIME_PNG);
    const decoded = await DigitalWatermarking.getTextFormImageBuffer(encodedBuffer);
    assert(decoded instanceof Jimp);
    assert.strictEqual(decoded.bitmap.width, source.bitmap.width);
    assert.strictEqual(decoded.bitmap.height, source.bitmap.height);
    assertGrayscale(decoded);
    const encodedPath = path.join(__dirname, 'enCode.png');
    const decodedPath = path.join(__dirname, 'deCode.png');
    try {
        await DigitalWatermarking.transformImageWithText(sourcePath, text, 1.1, encodedPath);
        await DigitalWatermarking.getTextFormImage(encodedPath, decodedPath);
        assert(fs.statSync(encodedPath).size > 0);
        assert(fs.statSync(decodedPath).size > 0);
    } finally {
        // if (fs.existsSync(encodedPath)) fs.unlinkSync(encodedPath);
        // if (fs.existsSync(decodedPath)) fs.unlinkSync(decodedPath);
    }
}

async function run() {
    testFft();
    await testPublicApi();
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
