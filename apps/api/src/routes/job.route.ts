import { Router } from 'express';
import { submitJob, getJobById, listJobs, verifyDirectJob } from '../controllers/job.controller';
import { verifyJobController } from '../controllers/verification.controller';

export const jobRouter = Router();


jobRouter.post('/submit', submitJob);
jobRouter.post('/verify-direct', verifyDirectJob);
jobRouter.post('/:id/verify', verifyJobController);
jobRouter.get('/:id', getJobById);
jobRouter.get('/', listJobs);
