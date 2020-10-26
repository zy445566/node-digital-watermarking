# node-digital-watermarking
[A digital watermark is a kind of marker covertly embedded in a noise-tolerant signal such as an audio, video or image data. It is typically used to identify ownership of the copyright of such signal. "Watermarking" is the process of hiding digital information in a carrier signal; the hidden information should, but does not need to, contain a relation to the carrier signal. Digital watermarks may be used to verify the authenticity or integrity of the carrier signal or to show the identity of its owners. It is prominently used for tracing copyright infringements and for banknote authentication.](https://en.wikipedia.org/wiki/Digital_watermarking)
<br />
[数字水印（Digital Watermarking）技术是将一些标识信息（即数字水印）直接嵌入数字载体当中（包括多媒体、文档、软件等）或是间接表示（修改特定区域的结构），且不影响原载体的使用价值，也不容易被探知和再次修改。但可以被生产方识别和辨认。通过这些隐藏在载体中的信息，可以达到确认内容创建者、购买者、传送隐秘信息或者判断载体是否被篡改等目的。数字水印是保护信息安全、实现防伪溯源、版权保护的有效办法，是信息隐藏技术研究领域的重要分支和研究方向。](https://baike.baidu.com/item/%E6%95%B0%E5%AD%97%E6%B0%B4%E5%8D%B0/722667)

# package install
```
npm install digital-watermarking
```

# Sample Use
```js
const dw = require('digital-watermarking');
//EnCode Image add digital watermarking
let srcFileName = "srcImg.png";
let watermarkText = "github.com/zy445566";
let fontSize = 1.1;
let enCodeFileName = "enCode.png";
async function run() {
    await dw.transformImageWithText(srcFileName,watermarkText,fontSize,enCodeFileName);
    //DeCode Image get digital watermarking
    let deCodeFileName = "deCode.png";
    await dw.getTextFormImage(enCodeFileName,deCodeFileName);
}
run()

```

# Result
## enCode.png
![enCode.png](https://raw.githubusercontent.com/zy445566/node-digital-watermarking/master/test/enCode.png)
## deCode.png
![deCode.png](https://raw.githubusercontent.com/zy445566/node-digital-watermarking/master/test/deCode.png)