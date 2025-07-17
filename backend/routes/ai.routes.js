import { Router } from 'express';
import * as aiCtrlontroller from '../controllers/ai.controller.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

router.get('/get-result', aiCtrlontroller.getResult)

export default router;