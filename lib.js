const Jimp = require('jimp');
const requireVm = require('require-vm');

function isReadyFunc () {
    return new Promise((reslove,reject)=>{
      const context = {
        module:{exports:{}},
        Module:{
            onRuntimeInitialized() {
              context.cv = context.module.exports();
              const cv = context.cv;
              cv.idft = function(src, dst, flags, nonzero_rows ) {
                cv.dft( src, dst, flags | cv.DFT_INVERSE, nonzero_rows );
              }
              return reslove(context);
            }
        },
        print:console.log
      }
      requireVm('./opencv.js',context,{},{},true)
      setTimeout(()=>{
          return reject(new Error('loading opencv time out'))
      },3*1000)
    })
}

function shiftDFT(cv, mag) {
    let rect = new cv.Rect(0, 0, mag.cols & (-2), mag.rows & (-2));
    mag.roi(rect);

    let cx = mag.cols / 2;
    let cy = mag.rows / 2;

    let q0 = mag.roi(new cv.Rect(0, 0, cx, cy));
    let q1 = mag.roi(new cv.Rect(cx, 0, cx, cy));
    let q2 = mag.roi(new cv.Rect(0, cy, cx, cy));
    let q3 = mag.roi(new cv.Rect(cx, cy, cx, cy));

    let tmp =  new cv.Mat();
    q0.copyTo(tmp);
    q3.copyTo(q0);
    tmp.copyTo(q3);

    q1.copyTo(tmp);
    q2.copyTo(q1);
    tmp.copyTo(q2);

    tmp.delete()
    q0.delete()
    q1.delete()
    q2.delete()
    q3.delete()
}

function getBlueChannel(cv, image)
{
    let nextImg = image;
    let channel = new cv.MatVector();
    cv.split(nextImg, channel);
    return channel.get(0);
}

function getDftMat(cv, padded)
{
    let planes = new cv.MatVector();
    planes.push_back(padded);
    let matZ = new cv.Mat.zeros(padded.size(), cv.CV_32F)
    planes.push_back(matZ);
    let comImg = new cv.Mat();
    cv.merge(planes,comImg);
    cv.dft(comImg, comImg);
    matZ.delete();
    return comImg;
}

function addTextByMat(cv, comImg,watermarkText,point,fontSize)
{
    cv.putText(comImg, watermarkText, point, cv.FONT_HERSHEY_DUPLEX, fontSize, cv.Scalar.all(0),2);  
    cv.flip(comImg, comImg, -1);
    cv.putText(comImg, watermarkText, point, cv.FONT_HERSHEY_DUPLEX, fontSize, cv.Scalar.all(0),2);  
    cv.flip(comImg, comImg, -1);
}

function transFormMatWithText(cv, srcImg, watermarkText,fontSize) {
    let padded = getBlueChannel(cv, srcImg);
    padded.convertTo(padded, cv.CV_32F);
    let comImg = getDftMat(cv, padded);
    // add text 
    let center = new cv.Point(padded.cols/2, padded.rows/2);
    addTextByMat(cv, comImg,watermarkText,center,fontSize);
    let outer = new cv.Point (45, 45);
    addTextByMat(cv, comImg,watermarkText,outer,fontSize);
    //back image
    let invDFT = new cv.Mat();
    cv.idft(comImg, invDFT, cv.DFT_SCALE | cv.DFT_REAL_OUTPUT, 0);
    let restoredImage = new cv.Mat();
    invDFT.convertTo(restoredImage, cv.CV_8U);
    let backPlanes = new cv.MatVector();
    cv.split(srcImg, backPlanes);
    // backPlanes.erase(backPlanes.get(0));
    // backPlanes.insert(backPlanes.get(0), restoredImage);
    backPlanes.set(0,restoredImage)
    let backImage = new cv.Mat();
    cv.merge(backPlanes,backImage);

    padded.delete();
    comImg.delete();
    invDFT.delete();
    restoredImage.delete()
    return backImage;
}

function getTextFormMat(cv, backImage) {
    let padded= getBlueChannel(cv, backImage);
    padded.convertTo(padded, cv.CV_32F);
    let comImg = getDftMat(cv, padded);
    let backPlanes = new cv.MatVector();
    // split the comples image in two backPlanes  
    cv.split(comImg, backPlanes);
    let mag = new cv.Mat();
    // compute the magnitude
    cv.magnitude(backPlanes.get(0), backPlanes.get(1), mag);
    // move to a logarithmic scale  
    let matOne = cv.Mat.ones(mag.size(), cv.CV_32F)
    cv.add(matOne, mag, mag);  
    cv.log(mag, mag);  
    shiftDFT(cv, mag);
    mag.convertTo(mag, cv.CV_8UC1);
    cv.normalize(mag, mag, 0, 255, cv.NORM_MINMAX, cv.CV_8UC1);

    padded.delete();
    comImg.delete();
    matOne.delete();
    return mag;    
}

function matToBuffer(cv, mat){
    if(!(mat instanceof cv.Mat)){
        throw new Error("Please input the valid new cv.Mat instance.");
    }
    var img=new cv.Mat();
    var depth=mat.type()%8;
    var scale=depth<=cv.CV_8S?1:depth<=cv.CV_32S?1/256:255;
    var shift=depth===cv.CV_8S||depth===cv.CV_16S?128:0;
    mat.convertTo(img,cv.CV_8U,scale,shift);
    switch(img.type()){
        case cv.CV_8UC1:cv.cvtColor(img,img,cv.COLOR_GRAY2RGBA);break;
        case cv.CV_8UC3:cv.cvtColor(img,img,cv.COLOR_RGB2RGBA);break;
        case cv.CV_8UC4:break;
        default:throw new Error("Bad number of channels (Source image must have 1, 3 or 4 channels)");
    }
    var imgData=Buffer.from(img.data);
    img.delete()
    return imgData
}

async function transformImageWithText(srcFileName,watermarkText,fontSize,enCodeFileName='') {
  const context = await isReadyFunc ()
  const cv = context.cv;
  if((typeof srcFileName)!='string' && (!(srcFileName instanceof Buffer))) {
    throw new Error('fileName must be string or Buffer')
  }
  if((typeof watermarkText)!='string') {
    throw new Error('waterMarkText must be string')
  }
  if((typeof fontSize)!='number') {
    throw new Error('fontSize must be number')
  }
  if((typeof enCodeFileName)!='string') {
    throw new Error('outFileName must be string')
  }
  let jimpSrc = await Jimp.read(srcFileName);
  let srcImg = new cv.matFromImageData(jimpSrc.bitmap);
  if (srcImg.empty()){throw new Error("read image failed");}
  let comImg = transFormMatWithText(cv, srcImg, watermarkText, fontSize);
  const imgRes = new Jimp({
    width: comImg.cols,
    height: comImg.rows,
    data: matToBuffer(cv, comImg)
  });
  srcImg.delete();
  comImg.delete();
  if(enCodeFileName) {
    return await imgRes.writeAsync(enCodeFileName);
  } else {
    return imgRes
  }
}

async function getTextFormImage(enCodeFileName,deCodeFileName='') {
    const context = await isReadyFunc ()
    const cv = context.cv;
    if((typeof enCodeFileName)!='string'  && (!(enCodeFileName instanceof Buffer))) {
      throw new Error('fileName must be string or Buffer')
    }
    if((typeof deCodeFileName)!='string') {
      throw new Error('backFileName must be string')
    }

    let jimpSrc = await Jimp.read(enCodeFileName);
    let comImg = new cv.matFromImageData(jimpSrc.bitmap);
    let backImage = getTextFormMat(cv, comImg);
    const imgRes = await new Jimp({
        width: backImage.cols,
        height: backImage.rows,
        data: matToBuffer(cv, backImage)
    })
    comImg.delete();
    backImage.delete();
    if(deCodeFileName) {
      return await imgRes.writeAsync(deCodeFileName);
    } else {
      return imgRes
    }
  }


module.exports.transformImageWithText = transformImageWithText;
module.exports.getTextFormImage = getTextFormImage;