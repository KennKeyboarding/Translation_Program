// services/image/preprocessImage.js
//图像预处理增强
import sharp from 'sharp';

export async function preprocessImage(imageBuffer) {
  return await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1280, withoutEnlargement: true })
    .normalize()
    .sharpen()
    .jpeg({ quality: 80 })
    .toBuffer();
}

//preprocessImage(imageBuffer, scene)
