import { Router } from "express";
const router = Router();
import * as userController from '../controllers/user.controller.js'
import { body } from "express-validator";
import * as authMiddleware from '../middleware/auth.middleware.js'

router.post('/register',
    body('email').isEmail().withMessage('Email must be Valid'),
    body('password').isLength({min: 8}).withMessage('Password must be of atleast 8 characters'),
    userController.createuserController)

router.post('/login', 
    body('email').isEmail().withMessage('Email must be Valid'),
    body('password').isLength({ min : 8 }).withMessage('Password must be of atleast 8 characters'),
    userController.loginController)

router.get('/profile', authMiddleware.authUser, userController.profileController)

router.get('/logout', authMiddleware.authUser, userController.logoutController)

router.get('/all', authMiddleware.authUser, userController.getAllUsersController)

export default router