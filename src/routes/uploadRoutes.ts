import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../types';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload image
router.post('/', upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    console.log('Uploading to Cloudinary...');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'green-harvest',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true
    });

    console.log('Upload successful:', {
      url: result.secure_url,
      public_id: result.public_id
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Error uploading file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete image
router.delete('/:publicId', async (req: AuthRequest, res) => {
  try {
    const { publicId } = req.params;
    console.log('Deleting image:', publicId);
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Delete result:', result);
    
    res.json({ 
      message: 'Image deleted successfully',
      result
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Error deleting file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 