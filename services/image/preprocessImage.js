// services/image/preprocessImage.js
//图像预处理增强
import sharp from 'sharp';

export async function preprocessImage(imageBuffer) {
  return await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .normalize()
    .sharpen()
    .jpeg({ quality: 85 })
    .toBuffer();
}

//preprocessImage(imageBuffer, scene)