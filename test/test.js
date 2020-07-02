const dw = require('../index');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
function getAbsolutePath(fileName) {
    return path.join(__dirname,fileName)
}
//EnCode Image add digital watermarking
let srcFileName = getAbsolutePath("srcImg.png");
let watermarkText = "github.com/zy445566";
let fontSize = 1.1;
let enCodeFileName = getAbsolutePath("enCode.png");
async function run() {
    await dw.transformImageWithText(srcFileName,watermarkText,fontSize,enCodeFileName);
    //DeCode Image get digital watermarking
    let deCodeFileName = getAbsolutePath("deCode.png");
    await dw.getTextFormImage(enCodeFileName,deCodeFileName);

    // let startTime = new Date().getTime();
    // for(let i=0;i<1000;i++) {
        const enCodeFileRes = await dw.transformImageBufferWithText(fs.readFileSync(srcFileName),watermarkText,fontSize);
        const deCodeFileRes = await dw.getTextFormImageBuffer(fs.readFileSync(enCodeFileName));
    //     console.log(enCodeFileRes instanceof Jimp,deCodeFileRes instanceof Jimp, i)
    // }
    // console.log('runTime',new Date().getTime()-startTime);
    
}
run()
