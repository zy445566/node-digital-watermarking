declare class DigitalWatermarking {
    static async transformImageWithText(
        srcFileName:string,watermarkText:string,
        fontSize:number,enCodeFileName:string
    ):Promise<boolean>;

    static async getTextFormImage(enCodeFileName:string,deCodeFileName:string):Promise<boolean>;
}
export const transformImageWithText =  DigitalWatermarking.transformImageWithText;
export const getTextFormImage =  DigitalWatermarking.getTextFormImage;