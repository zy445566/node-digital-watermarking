const addon = require('./build/Release/addon');
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

    static transformImageWithText(srcFileName,watermarkText,fontSize,enCodeFileName)
    {
        srcFileName = DigitalWatermarking.getAbsoluteFilePath(srcFileName);
        DigitalWatermarking.existsFilePath(srcFileName);
        return addon.transformImageWithText(
            srcFileName,
            watermarkText,fontSize,
            DigitalWatermarking.getAbsoluteFilePath(enCodeFileName)
        );
    }

    static getTextFormImage(enCodeFileName,deCodeFileName)
    {
        enCodeFileName = DigitalWatermarking.getAbsoluteFilePath(enCodeFileName);
        DigitalWatermarking.existsFilePath(enCodeFileName);
        return addon.getTextFormImage(
            enCodeFileName,
            DigitalWatermarking.getAbsoluteFilePath(deCodeFileName)
        );
    }
}
module.exports = DigitalWatermarking;