import { Router } from 'express';
import { ApplicationController } from '../controllers/application.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Track a new applied job
router.post('/applications', requireAuth, ApplicationController.create);

// Get all applications with stats and 14-day ghost recommendations
router.get('/applications', requireAuth, ApplicationController.getAll);

router.get('/applications/check', requireAuth, ApplicationController.check);

router.patch('/applications/:id/status', requireAuth, ApplicationController.updateStatus);

router.delete('/applications/:id', requireAuth, ApplicationController.delete);

export { router as applicationRouter };
