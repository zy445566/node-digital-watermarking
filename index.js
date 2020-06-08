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

    static async transformImageWithText(srcFileName,watermarkText,fontSize,enCodeFileName)
    {
        srcFileName = DigitalWatermarking.getAbsoluteFilePath(srcFileName);
        DigitalWatermarking.existsFilePath(srcFileName);
        return await lib.transformImageWithText(
            srcFileName,
            watermarkText,fontSize,
            DigitalWatermarking.getAbsoluteFilePath(enCodeFileName)
        );
    }

    static async getTextFormImage(enCodeFileName,deCodeFileName)
    {
        enCodeFileName = DigitalWatermarking.getAbsoluteFilePath(enCodeFileName);
        DigitalWatermarking.existsFilePath(enCodeFileName);
        return await lib.getTextFormImage(
            enCodeFileName,
            DigitalWatermarking.getAbsoluteFilePath(deCodeFileName)
        );
    }
}
module.exports = DigitalWatermarking;