import { Router } from 'express';
import KycProfileController from '../../../controllers/kycProfile/kycProfileController';
import KycRequirementController from '../../../controllers/kycProfile/kycRequirementController';
import authenticate from '../../../middlewares/auth/authenticate';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import {
  createKycProfileSchema,
  updateKycProfileSchema,
} from '../../../validations/kycProfile/kycProfileValidation';
import {
  createKycRequirementSchema,
  updateKycRequirementSchema,
} from '../../../validations/kycProfile/kycRequirementValidation';

const router = Router();

/** -------------------- KYC Requirement Routes -------------------- **/

router.post(
  '/requirements',
  authenticate('access'),
  authorize('kyc', 'create'),
  validate(createKycRequirementSchema),
  asyncHandler(
    KycRequirementController.createKycRequirement.bind(KycRequirementController)
  )
);

router.put(
  '/requirements/:id',
  authenticate('access'),
  authorize('kyc', 'update'),
  validate(updateKycRequirementSchema),
  asyncHandler(
    KycRequirementController.updateKycRequirement.bind(KycRequirementController)
  )
);

router.get(
  '/requirements',
  asyncHandler(
    KycRequirementController.getPaginated.bind(KycRequirementController)
  )
);

router.get(
  '/requirements/:id',
  asyncHandler(
    KycRequirementController.getKycRequirementById.bind(
      KycRequirementController
    )
  )
);

router.delete(
  '/requirements/:id',
  authenticate('access'),
  authorize('kyc', 'delete'),
  asyncHandler(
    KycRequirementController.deleteKycRequirement.bind(KycRequirementController)
  )
);

/** -------------------- KYC Profile Routes -------------------- **/

router.post(
  '/profiles',
  authenticate('access'),
  authorize('kyc', 'create'),
  validate(createKycProfileSchema),
  asyncHandler(KycProfileController.createKycProfile.bind(KycProfileController))
);

router.put(
  '/profiles/:id',
  authenticate('access'),
  authorize('kyc', 'update'),
  validate(updateKycProfileSchema),
  asyncHandler(KycProfileController.updateKycProfile.bind(KycProfileController))
);

router.get(
  '/profiles',
  asyncHandler(KycProfileController.getPaginated.bind(KycProfileController))
);

router.get(
  '/profiles/:id',
  asyncHandler(
    KycProfileController.getKycProfileById.bind(KycProfileController)
  )
);

router.get(
  '/profiles/user/:userId',
  asyncHandler(
    KycProfileController.getKycProfilesByUserId.bind(KycProfileController)
  )
);

router.get(
  '/profiles/organization/:organizationId',
  asyncHandler(
    KycProfileController.getKycProfilesByOrganizationId.bind(
      KycProfileController
    )
  )
);

router.delete(
  '/profiles/:id',
  authenticate('access'),
  authorize('kyc', 'delete'),
  asyncHandler(KycProfileController.deleteKycProfile.bind(KycProfileController))
);

export default router;
