#include <nan.h>
#include <opencv2/core/core.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <opencv2/imgproc/imgproc.hpp>

/**
 * 以下链接给了我极大的帮助
 * http://blog.csdn.net/chenxiao_ji/article/details/52875199
 * http://www.jianshu.com/p/62e52c4ab5c4
 * 本人也仅仅是将以上作者的版本改成C++版本而已
 * 喝水不忘挖井人，如果有人使用了该库，请不要忘记他们
 * author github:https://github.com/zy445566
 * welcome to star
 */

void shiftDFT(cv::Mat mag) {

    mag = mag(cv::Rect(0, 0, mag.cols & (-2), mag.rows & (-2)));

    int cx = mag.cols / 2;
    int cy = mag.rows / 2;

    cv::Mat q0 = cv::Mat(mag, cv::Rect(0, 0, cx, cy));
    cv::Mat q1 = cv::Mat(mag,  cv::Rect(cx, 0, cx, cy));
    cv::Mat q2 =  cv::Mat(mag,  cv::Rect(0, cy, cx, cy));
    cv::Mat q3 =  cv::Mat(mag,  cv::Rect(cx, cy, cx, cy));

    cv::Mat tmp =  cv::Mat();
    q0.copyTo(tmp);
    q3.copyTo(q0);
    tmp.copyTo(q3);

    q1.copyTo(tmp);
    q2.copyTo(q1);
    tmp.copyTo(q2);
}

cv::Mat getBlueChannel(cv::Mat image)
{
    cv::Mat nextImg = image;
    std::vector<cv::Mat> channel;
    split(nextImg,channel);
    return channel[0];
}

cv::Mat getDftMat(cv::Mat padded)
{
    std::vector<cv::Mat> planes;
    planes.push_back(padded);
    planes.push_back(cv::Mat::zeros(padded.size(), CV_32F));
    cv::Mat comImg;
    merge(planes,comImg);
    cv::dft(comImg, comImg);
    return comImg;
}

void addTextByMat(cv::Mat comImg,cv::String watermarkText,cv::Point point,double fontSize)
{
    cv::putText(comImg, watermarkText, point, cv::FONT_HERSHEY_DUPLEX, fontSize, cv::Scalar::all(0),2);  
    cv::flip(comImg, comImg, -1);
    putText(comImg, watermarkText, point, cv::FONT_HERSHEY_DUPLEX, fontSize, cv::Scalar::all(0),2);  
    flip(comImg, comImg, -1);
}

cv::Mat transFormMatWithText(cv::Mat srcImg, cv::String watermarkText,double fontSize) {
        cv::Mat padded=getBlueChannel(srcImg);
        padded.convertTo(padded, CV_32F);
        cv::Mat comImg = getDftMat(padded);
        // add text 
        cv::Point center(padded.cols/2, padded.rows/2);
        addTextByMat(comImg,watermarkText,center,fontSize);
        cv::Point outer(45, 45);
        addTextByMat(comImg,watermarkText,outer,fontSize);
        //back image
        cv::Mat invDFT;  
        idft(comImg, invDFT, cv::DFT_SCALE | cv::DFT_REAL_OUTPUT, 0);  
        cv::Mat restoredImage;
        invDFT.convertTo(restoredImage, CV_8U);
        std::vector<cv::Mat> backPlanes;
        split(srcImg, backPlanes);
        backPlanes.erase(backPlanes.begin());
        backPlanes.insert(backPlanes.begin(), restoredImage);
        cv::Mat backImage; 
        cv::merge(backPlanes,backImage);
        return backImage;
}


cv::Mat getTextFormMat(cv::Mat backImage) {
        cv::Mat padded=getBlueChannel(backImage);
        padded.convertTo(padded, CV_32F);
        cv::Mat comImg = getDftMat(padded);
        std::vector<cv::Mat> backPlanes;
        // split the comples image in two backPlanes  
        cv::split(comImg, backPlanes);
        cv::Mat mag;  
        // compute the magnitude  
        cv::magnitude(backPlanes[0], backPlanes[1], mag);  
        // move to a logarithmic scale  
        cv::add(cv::Mat::ones(mag.size(), CV_32F), mag, mag);  
        cv::log(mag, mag);  
        shiftDFT(mag);
        mag.convertTo(mag, CV_8UC1);  
        normalize(mag, mag, 0, 255, cv::NORM_MINMAX, CV_8UC1);  
        return mag;    
}


const char* ToCString(const v8::String::Utf8Value& value) {
  return *value;
}

void transformImageWithText(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  if (info.Length() < 4) {
    Nan::ThrowTypeError("Wrong number of arguments");
    return;
  }
  if (!info[0]->IsString()) {
    Nan::ThrowTypeError("fileName must be string");
    return;
  }
  if (!info[1]->IsString()) {
    Nan::ThrowTypeError("waterMarkText must be string");
    return;
  }
  if (!info[2]->IsNumber()) {
    Nan::ThrowTypeError("fontSize must be number");
    return;
  }
  if (!info[3]->IsString()) {
    Nan::ThrowTypeError("outFileName must be string");
    return;
  }
  v8::String::Utf8Value str0(info[0]->ToString());
  const char* filename= ToCString(str0);
  v8::String::Utf8Value str1(info[1]->ToString());
  const char* watermarkText= ToCString(str1);
  double fontSize = info[2]->NumberValue();
  v8::String::Utf8Value str3(info[3]->ToString());
  const char* outfilename= ToCString(str3);
  cv::Mat srcImg = cv::imread(filename);
  if (srcImg.empty()){Nan::ThrowTypeError("read image failed");}
  cv::Mat comImg = transFormMatWithText(srcImg, watermarkText,fontSize);
  bool res = cv::imwrite(outfilename,comImg);
  info.GetReturnValue().Set(res);
}

void getTextFormImage(const Nan::FunctionCallbackInfo<v8::Value>& info) {

  if (info.Length() < 2) {
    Nan::ThrowTypeError("Wrong number of arguments");
    return;
  }

  if (!info[0]->IsString()) {
    Nan::ThrowTypeError("fileName must be string");
    return;
  }

  if (!info[1]->IsString()) {
    Nan::ThrowTypeError("backFileName must be string");
    return;
  }
  v8::String::Utf8Value str0(info[0]->ToString());
  const char* filename= ToCString(str0);
  v8::String::Utf8Value str1(info[1]->ToString());
  const char* backfilename= ToCString(str1);

  cv::Mat comImg = cv::imread(filename);
  cv::Mat backImage = getTextFormMat(comImg);
  bool res = cv::imwrite(backfilename,backImage);
  info.GetReturnValue().Set(res);
}

void Init(v8::Local<v8::Object> exports) {
  exports->Set(Nan::New("transformImageWithText").ToLocalChecked(),
               Nan::New<v8::FunctionTemplate>(transformImageWithText)->GetFunction());
  exports->Set(Nan::New("getTextFormImage").ToLocalChecked(),
               Nan::New<v8::FunctionTemplate>(getTextFormImage)->GetFunction());
}

NODE_MODULE(digitalWatermarking, Init)
