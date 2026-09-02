// ============================================================================
// UPLOAD ROUTES
// ============================================================================

import multer from 'multer';
import { LIMITS } from '@dispatch/shared';

const uploadRoutes = Router();

// Configure multer for memory storage (upload to S3 in production)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: LIMITS.maxFileSize,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!LIMITS.allowedFileTypes.includes(file.mimetype as any)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  },
});

// POST /upload - Single file upload
uploadRoutes.post(
  '/',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('NO_FILE', 'No file uploaded', 400);
    }

    // In production: upload to S3/Cloudinary
    // const s3Result = await s3.upload({...}).promise();
    // const url = s3Result.Location;

    // For development, return a mock URL
    const mockUrl = `https://storage.freightconnect.com/${req.user!.id}/${Date.now()}-${req.file.originalname}`;

    res.status(201).json({
      success: true,
      data: {
        url: mockUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      message: 'File uploaded successfully',
    });
  })
);

// POST /upload/multiple - Multiple files
uploadRoutes.post(
  '/multiple',
  authenticate,
  upload.array('files', 10),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('NO_FILES', 'No files uploaded', 400);
    }

    const uploaded = files.map((file) => ({
      url: `https://storage.freightconnect.com/${req.user!.id}/${Date.now()}-${file.originalname}`,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }));

    res.status(201).json({
      success: true,
      data: uploaded,
      message: `${uploaded.length} files uploaded`,
    });
  })
);

// POST /upload/avatar - Avatar upload with resize
uploadRoutes.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('NO_FILE', 'No file uploaded', 400);
    }

    // In production: resize and upload to CDN
    const avatarUrl = `https://storage.freightconnect.com/avatars/${req.user!.id}.jpg`;

    await database.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, req.user!.id]
    );

    res.json({ success: true, data: { avatarUrl }, message: 'Avatar updated' });
  })
);

export { uploadRoutes };
