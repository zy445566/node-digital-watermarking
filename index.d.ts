import Jimp = require('jimp');

declare class DigitalWatermarking {
    /** Retained for source compatibility; configuration is no longer required. */
    static getConfig(): Record<string, never>;
    static setConfig(config?: Record<string, unknown>): Record<string, never>;

    static transformImageWithText(
        srcFileName: string,
        watermarkText: string,
        fontSize: number,
        enCodeFileName: string
    ): Promise<Jimp>;
    static transformImageBufferWithText(
        srcBuffer: Buffer,
        watermarkText: string,
        fontSize: number
    ): Promise<Jimp>;
    static getTextFormImage(
        enCodeFileName: string,
        deCodeFileName: string
    ): Promise<Jimp>;
    static getTextFormImageBuffer(enCodeBuffer: Buffer): Promise<Jimp>;
}

export = DigitalWatermarking;
