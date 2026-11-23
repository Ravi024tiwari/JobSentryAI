import { Router } from 'express';
import { submitJob, getJobById, listJobs } from '../controllers/job.controller';
import { verifyJobController } from '../controllers/verification.controller';

export const jobRouter = Router();

// Job Ingestion & Lookup Routes
jobRouter.post('/submit', submitJob);
jobRouter.post('/:id/verify', verifyJobController);
jobRouter.get('/:id', getJobById);
jobRouter.get('/', listJobs);
