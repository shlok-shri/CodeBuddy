import projectModel from '../models/project.model.js'
import * as projectService from '../services/project.service.js'
import userModel from '../models/user.model.js'
import { validationResult } from 'express-validator'

export const createProjectController = async(req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }

    try{
        const { name } = req.body
        const userId = req.user.id

        const newProject = await projectService.createProject({name, userId})

        res.status(201).json({project: newProject})
    }
    catch(err) {
        console.log(err)
        res.status(400).send(err.message)
    }
}

export const getAllProjects = async(req, res) => {
    try {
        
        const allUserProjects = await projectService.getAllProjectsByUserId({
            userId: req.user.id
        })
        return res.status(200).json({
            projects: allUserProjects
        })

    } catch (error) {
        console.log(error)
        res.status(400).json({error : error.message})
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }

    try{
        const {projectId, users} = req.body
        const project = await projectService.addUserToProject({
            projectId,
            users,
            userId: req.user.id
        })
        return res.status(200).json({project})
    } catch (err) {
        console.log(err.message)
        res.status(400).json({error : err.message})
    }
    
}

export const getProjectById = async(req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        
        const { projectId } = req.params
        const project = await projectService.getProjectById({projectId})
        return res.status(200).json({
            project
        })

    } catch (error) {
        res.status(400).json({error:error.message})
    }
}

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }

    try {
        const { projectId, fileTree } = req.body
        const updatedProject = await projectService.updateFileTree({
            projectId,
            fileTree
        })
        return res.status(200).json({project: updatedProject})
    } catch (error) {
        console.log(error)
        res.status(400).json({error: error.message})
    }
}
