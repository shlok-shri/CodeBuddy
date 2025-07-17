import { Router } from 'express'
import { body } from 'express-validator'
import * as projectController from '../controllers/project.controller.js'
import * as authMiddleWare from '../middleware/auth.middleware.js'

const router = Router()

router.post('/create',
    authMiddleWare.authUser,
    body('name').isString().withMessage('Name is Required'),
    projectController.createProjectController
)

router.get('/all', 
    authMiddleWare.authUser,
    projectController.getAllProjects
)

router.put('/add-user',
    authMiddleWare.authUser,
    body('projectId').isString().withMessage('Project ID should be String'),
    body('users').isArray().withMessage('It should be a array of strings').bail()
    .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user shoud be a string'),
    projectController.addUserToProject
)

router.put('/update-fileTree', 
    authMiddleWare.authUser,
    body('projectId').isString().withMessage('Project ID should be String'),
    body('fileTree').isObject().withMessage('File Tree should be an object'),
    projectController.updateFileTree
)

router.get('/:projectId',
    authMiddleWare.authUser,
    projectController.getProjectById
)
export default router
