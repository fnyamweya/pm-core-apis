import { Router } from 'express';
import multer from 'multer';
import fileController from '../../../controllers/storage/fileController';
import authenticate from '../../../middlewares/auth/authenticate';
import validate from '../../../middlewares/common/validate';
import {
  deleteFileSchema,
  deleteFileByKeySchema,
  getFileByIdSchema,
  getPaginatedFilesSchema,
  getSignedUrlSchema,
  uploadFilesSchema,
} from '../../../validations/storage/fileValidation';

const router = Router();
const upload = multer();

router.post(
  '/upload',
  upload.array('files', 10), // Accepting up to 10 files with the field name "files"
  validate(uploadFilesSchema), // Validation for multiple file uploads
  authenticate('access'),
  fileController.uploadFiles.bind(fileController)
);

router.delete(
  '/',
  validate(deleteFileSchema),
  authenticate('access'),
  fileController.deleteFile.bind(fileController)
);

// RESTful delete by storage key
router.delete(
  '/by-key/:storageKey',
  validate(deleteFileByKeySchema),
  authenticate('access'),
  fileController.deleteFileByKeyParam.bind(fileController)
);

router.get(
  '/signed-url',
  validate(getSignedUrlSchema),
  authenticate('access'),
  fileController.getSignedUrl.bind(fileController)
);

router.get(
  '/:id',
  validate(getFileByIdSchema),
  authenticate('access'),
  fileController.getFileById.bind(fileController)
);

router.get(
  '/',
  validate(getPaginatedFilesSchema),
  authenticate('access'),
  fileController.getPaginatedFiles.bind(fileController)
);

export default router;
