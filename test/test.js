const dw = require('../index');
const path = require('path');
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
}
run()
