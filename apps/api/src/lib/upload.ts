import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { AppError } from './errors';

const uploadsDir = path.join(process.cwd(), 'uploads');

export function configureCloudinary() {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

export async function uploadFile(file: Express.Multer.File) {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'orbito',
      resource_type: 'auto',
    });
    fs.unlinkSync(file.path);
    return {
      fileName: file.originalname,
      fileUrl: result.secure_url,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const dest = path.join(uploadsDir, `${Date.now()}-${file.originalname}`);
  fs.renameSync(file.path, dest);
  return {
    fileName: file.originalname,
    fileUrl: `/uploads/${path.basename(dest)}`,
    fileType: file.mimetype,
    fileSize: file.size,
  };
}

export function assertFile(file?: Express.Multer.File) {
  if (!file) throw new AppError('File is required', 400, 'FILE_REQUIRED');
  return file;
}
