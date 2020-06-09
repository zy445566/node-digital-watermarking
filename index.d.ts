import Jimp from "jimp/*";

declare class DigitalWatermarking {
    static transformImageWithText(
        srcFileName:string,watermarkText:string,
        fontSize:number,enCodeFileName:string
    ):Promise<Jimp>;
    static transformImageBufferWithText(srcBuffer:Buffer,watermarkText:string,fontSize:number):Promise<Jimp>;
    static getTextFormImage(enCodeFileName:string,deCodeFileName:string):Promise<Jimp>;
    static getTextFormImageBuffer(enCodeBuffer:Buffer):Promise<Jimp>;
}
export function transformImageWithText(
    srcFileName:string,watermarkText:string,
    fontSize:number,enCodeFileName:string
):Promise<Jimp>;

export function transformImageBufferWithText(srcBuffer:Buffer,watermarkText:string,fontSize:number):Promise<Jimp>;

export function getTextFormImage(enCodeFileName:string,deCodeFileName:string):Promise<Jimp>;

export function getTextFormImageBuffer(enCodeBuffer:Buffer):Promise<Jimp>;