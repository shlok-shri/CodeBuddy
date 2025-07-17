import mongoose from "mongoose";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";

export const createProject = async ({
    name, userId
}) => {
    if (!name) {
        throw new Error('Name is Required!')
    }
    if (!userId) {
        throw new Error('User is Required!')
    }

    const project = await Project.create({
        name,
        users: [userId]
    })

    await User.findByIdAndUpdate(userId, {
        $push: {
            projects: project._id
        }
    })

    return project
}

export const getAllProjectsByUserId = async ({userId}) => {
    if(!userId){
        throw new Error('UserId is Required')
    }

    const allUserProjects = await Project.find({
        users: userId
    })
    return allUserProjects
}

export const addUserToProject = async ({projectId, users, userId}) => {
    if(!projectId){
        throw new Error('Project ID is Required')
    }
    if(!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid Project ID')
    }

    if(!users){
        throw new Error('Users are Required')
    }
    if(!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error('Invalid UserId(s) in the users array')
    }

    if(!userId){
        throw new Error('UserId is required')
    }
    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid User ID')
    }

    const project = await Project.findOne({
        _id: projectId,
        users: userId
    })
    if(!project){
        throw new Error('User not Authorized')
    }

    const updatedProject = await Project.findOneAndUpdate({
        _id: projectId
    }, {
        $addToSet: {
            users: {
                $each: users
            }
        }
    }, {
        new: true
    })

    await User.updateMany({
        _id: {
            $in: users
        }
    }, {
        $addToSet: {
            projects: projectId
        }
    })

    return updatedProject
}

export const getProjectById = async({projectId}) => {
    if(!projectId) {
        throw new Error('Project ID is required')
    }
    if(!mongoose.Types.ObjectId.isValid(projectId)){
        throw new Error('It should be a valid project ID')
    }

    const project = await Project.findOne({
        _id: projectId
    }).populate('users')
    return project
}

export const updateFileTree = async ({projectId, fileTree}) => {
    if(!projectId) {
        throw new Error('Project ID is required')
    }
    if(!mongoose.Types.ObjectId.isValid(projectId)){
        throw new Error('It should be a valid project ID')
    }

    if(!fileTree || typeof fileTree !== 'object') {
        throw new Error('File Tree should be an object')
    }

    const updatedProject = await Project.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return updatedProject
}