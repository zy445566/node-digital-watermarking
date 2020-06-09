const lib = require('./lib.js');
const path = require('path');
const fs = require('fs');
class DigitalWatermarking{
    static getAbsoluteFilePath(filePath)
    {
        return path.isAbsolute(filePath)?filePath:path.join(process.cwd(),filePath);
    }

    static existsFilePath(filePath)
    {
        if(!fs.existsSync(filePath)){throw new Error(`not file in ${filePath}`);}
    }
    static isBuffer(fileBuf)
    {
        if((!(fileBuf instanceof Buffer))) {
            throw new Error(`input not Buffer`);
        }
    }

    static async transformImageWithText(srcFileName,watermarkText,fontSize,enCodeFileName)
    {
        const srcFilePath = DigitalWatermarking.getAbsoluteFilePath(srcFileName);
        DigitalWatermarking.existsFilePath(srcFilePath);
        return await lib.transformImageWithText(
            srcFilePath,
            watermarkText,fontSize,
            DigitalWatermarking.getAbsoluteFilePath(enCodeFileName)
        );
    }

    static async transformImageBufferWithText(srcBuffer,watermarkText,fontSize)
    {
        DigitalWatermarking.isBuffer(srcBuffer);
        return await lib.transformImageWithText(
            srcBuffer,
            watermarkText,fontSize,
        );
    }

    static async getTextFormImage(enCodeFileName,deCodeFileName)
    {
        const enCodeFilePath = DigitalWatermarking.getAbsoluteFilePath(enCodeFileName);
        DigitalWatermarking.existsFilePath(enCodeFilePath);
        return await lib.getTextFormImage(
            enCodeFileName,
            DigitalWatermarking.getAbsoluteFilePath(deCodeFileName)
        );
    }
    static async getTextFormImageBuffer(enCodeBuffer) {
        DigitalWatermarking.isBuffer(enCodeBuffer);
        return await lib.getTextFormImage(
            enCodeBuffer
        );
    }
}
module.exports = DigitalWatermarking;