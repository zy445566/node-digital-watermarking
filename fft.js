'use strict';

function isPowerOfTwo(value) {
    return value > 0 && (value & (value - 1)) === 0;
}

function nextPowerOfTwo(value) {
    let result = 1;
    while (result < value) {
        result *= 2;
    }
    return result;
}

class Radix2Plan {
    constructor(size) {
        if (!isPowerOfTwo(size)) {
            throw new Error('Radix-2 FFT size must be a power of two');
        }

        this.size = size;
        this.reverse = new Uint32Array(size);
        this.cos = new Float64Array(size / 2);
        this.sin = new Float64Array(size / 2);

        const bits = Math.round(Math.log2(size));
        for (let i = 0; i < size; i += 1) {
            let source = i;
            let reversed = 0;
            for (let bit = 0; bit < bits; bit += 1) {
                reversed = (reversed * 2) + (source & 1);
                source = Math.floor(source / 2);
            }
            this.reverse[i] = reversed;
        }

        for (let i = 0; i < size / 2; i += 1) {
            const angle = -2 * Math.PI * i / size;
            this.cos[i] = Math.cos(angle);
            this.sin[i] = Math.sin(angle);
        }
    }

    transform(real, imag, inverse) {
        const size = this.size;
        if (real.length !== size || imag.length !== size) {
            throw new Error('FFT input length does not match its plan');
        }

        for (let i = 0; i < size; i += 1) {
            const reversed = this.reverse[i];
            if (reversed > i) {
                let value = real[i];
                real[i] = real[reversed];
                real[reversed] = value;

                value = imag[i];
                imag[i] = imag[reversed];
                imag[reversed] = value;
            }
        }

        for (let blockSize = 2; blockSize <= size; blockSize *= 2) {
            const half = blockSize / 2;
            const tableStep = size / blockSize;
            for (let start = 0; start < size; start += blockSize) {
                for (let offset = 0; offset < half; offset += 1) {
                    const tableIndex = offset * tableStep;
                    const wr = this.cos[tableIndex];
                    const wi = inverse ? -this.sin[tableIndex] : this.sin[tableIndex];
                    const even = start + offset;
                    const odd = even + half;
                    const tr = (wr * real[odd]) - (wi * imag[odd]);
                    const ti = (wr * imag[odd]) + (wi * real[odd]);

                    real[odd] = real[even] - tr;
                    imag[odd] = imag[even] - ti;
                    real[even] += tr;
                    imag[even] += ti;
                }
            }
        }

        if (inverse) {
            for (let i = 0; i < size; i += 1) {
                real[i] /= size;
                imag[i] /= size;
            }
        }
    }
}

class BluesteinPlan {
    constructor(size) {
        this.size = size;
        this.convolutionSize = nextPowerOfTwo((2 * size) - 1);
        this.radix2 = new Radix2Plan(this.convolutionSize);
        this.chirpCos = new Float64Array(size);
        this.chirpSin = new Float64Array(size);
        this.kernelReal = new Float64Array(this.convolutionSize);
        this.kernelImag = new Float64Array(this.convolutionSize);
        this.workReal = new Float64Array(this.convolutionSize);
        this.workImag = new Float64Array(this.convolutionSize);

        for (let i = 0; i < size; i += 1) {
            // Reducing i^2 modulo 2N keeps the angle accurate for large images.
            const angle = Math.PI * ((i * i) % (2 * size)) / size;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            this.chirpCos[i] = cosine;
            this.chirpSin[i] = sine;
            this.kernelReal[i] = cosine;
            this.kernelImag[i] = sine;
            if (i !== 0) {
                this.kernelReal[this.convolutionSize - i] = cosine;
                this.kernelImag[this.convolutionSize - i] = sine;
            }
        }

        this.radix2.transform(this.kernelReal, this.kernelImag, false);
    }

    forward(real, imag) {
        const size = this.size;
        const workReal = this.workReal;
        const workImag = this.workImag;
        workReal.fill(0);
        workImag.fill(0);

        for (let i = 0; i < size; i += 1) {
            const cosine = this.chirpCos[i];
            const sine = this.chirpSin[i];
            workReal[i] = (real[i] * cosine) + (imag[i] * sine);
            workImag[i] = (imag[i] * cosine) - (real[i] * sine);
        }

        this.radix2.transform(workReal, workImag, false);
        for (let i = 0; i < this.convolutionSize; i += 1) {
            const productReal = (workReal[i] * this.kernelReal[i]) -
                (workImag[i] * this.kernelImag[i]);
            const productImag = (workReal[i] * this.kernelImag[i]) +
                (workImag[i] * this.kernelReal[i]);
            workReal[i] = productReal;
            workImag[i] = productImag;
        }
        this.radix2.transform(workReal, workImag, true);

        for (let i = 0; i < size; i += 1) {
            const cosine = this.chirpCos[i];
            const sine = this.chirpSin[i];
            real[i] = (workReal[i] * cosine) + (workImag[i] * sine);
            imag[i] = (workImag[i] * cosine) - (workReal[i] * sine);
        }
    }

    transform(real, imag, inverse) {
        if (real.length !== this.size || imag.length !== this.size) {
            throw new Error('FFT input length does not match its plan');
        }

        if (!inverse) {
            this.forward(real, imag);
            return;
        }

        for (let i = 0; i < this.size; i += 1) {
            imag[i] = -imag[i];
        }
        this.forward(real, imag);
        for (let i = 0; i < this.size; i += 1) {
            real[i] /= this.size;
            imag[i] = -imag[i] / this.size;
        }
    }
}

class FFTPlan {
    constructor(size) {
        if (!Number.isSafeInteger(size) || size < 1) {
            throw new Error('FFT size must be a positive integer');
        }
        this.plan = isPowerOfTwo(size) ? new Radix2Plan(size) : new BluesteinPlan(size);
    }

    transform(real, imag, inverse) {
        this.plan.transform(real, imag, Boolean(inverse));
    }
}

class FFT2D {
    constructor(width, height) {
        if (!Number.isSafeInteger(width) || width < 1 ||
            !Number.isSafeInteger(height) || height < 1) {
            throw new Error('Image dimensions must be positive integers');
        }

        this.width = width;
        this.height = height;
        this.rowPlan = new FFTPlan(width);
        this.columnPlan = new FFTPlan(height);
        this.rowReal = new Float64Array(width);
        this.rowImag = new Float64Array(width);
        this.columnReal = new Float64Array(height);
        this.columnImag = new Float64Array(height);
    }

    transform(real, imag, inverse) {
        const { width, height } = this;
        const expectedLength = width * height;
        if (real.length !== expectedLength || imag.length !== expectedLength) {
            throw new Error('2D FFT input dimensions do not match its plan');
        }

        for (let y = 0; y < height; y += 1) {
            const rowStart = y * width;
            for (let x = 0; x < width; x += 1) {
                this.rowReal[x] = real[rowStart + x];
                this.rowImag[x] = imag[rowStart + x];
            }
            this.rowPlan.transform(this.rowReal, this.rowImag, inverse);
            real.set(this.rowReal, rowStart);
            imag.set(this.rowImag, rowStart);
        }

        for (let x = 0; x < width; x += 1) {
            for (let y = 0; y < height; y += 1) {
                const index = (y * width) + x;
                this.columnReal[y] = real[index];
                this.columnImag[y] = imag[index];
            }
            this.columnPlan.transform(this.columnReal, this.columnImag, inverse);
            for (let y = 0; y < height; y += 1) {
                const index = (y * width) + x;
                real[index] = this.columnReal[y];
                imag[index] = this.columnImag[y];
            }
        }
    }
}

module.exports = {
    FFTPlan,
    FFT2D
};
