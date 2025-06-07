import { v2 as cloudinary } from 'cloudinary';

const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (!cloudinaryUrl) {
  console.error('CLOUDINARY_URL environment variable is not set');
  process.exit(1);
}

try {
  // Parse the Cloudinary URL
  const matches = cloudinaryUrl.match(/cloudinary:\/\/(\d+):([^@]+)@([^/]+)/);
  
  if (!matches) {
    throw new Error('Invalid Cloudinary URL format');
  }

  const [, apiKey, apiSecret, cloudName] = matches;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  console.log('Cloudinary configured successfully');
} catch (error) {
  console.error('Error configuring Cloudinary:', error);
  process.exit(1);
}

export default cloudinary; 