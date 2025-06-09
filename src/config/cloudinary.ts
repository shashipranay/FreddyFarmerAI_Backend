import { v2 as cloudinary } from 'cloudinary';

// Parse the Cloudinary URL
const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
const matches = cloudinaryUrl.match(/cloudinary:\/\/(\d+):([^@]+)@([^/]+)/);

if (matches) {
  const [, apiKey, apiSecret, cloudName] = matches;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  console.log('Cloudinary configured successfully');
} else {
  console.error('Invalid Cloudinary URL format');
}

export default cloudinary; 