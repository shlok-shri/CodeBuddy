import userModel from '../models/user.model.js'
import * as userService from '../services/user.service.js'
import { validationResult } from 'express-validator'
import redisClient from '../services/redis.service.js'

export const createuserController = async(req, res) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }
    try {
        const user = await userService.createUser(req.body)
        const token = await user.generateJWT();
        delete user._doc.password;
        res.cookie('token', token, { httpOnly: true, secure: false }) // secure: true in production
        res.status(201).send(user)
    } 
    catch (error) {
        res.status(400).send(error.message)
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req)

    if(!errors.isEmpty()) {
        return res.status(400).json({ errors : errors.array() })
    }

    try {

        const {email, password} = req.body;

        const user = await userModel.findOne({email}).select('+password')  
        if(!user){
            return res.status(401).json({
                errors : 'Invalid Credentials'
            })
        }      

        const isMatch = await user.isValidPassword(password)
        if(!isMatch){
            return res.status(401).json({
                errors : 'Invalid Credentials'
            })
        }

        const token = await user.generateJWT()
        delete user._doc.password;
        res.cookie('token', token, { httpOnly: true, secure: false }) // secure: true in production
        res.status(200).json({user, token})

    } catch (error) {
        res.status(400).send(error.message)
    }
} 

export const profileController = async (req, res) => {
    res.status(200).json({
        user: req.user 
    })
}

export const logoutController = async (req, res) => {
    try {

        const token = req.cookies.token || req.headers.authorization.split(' ')[1]
        redisClient.set(token, 'logout', 'EX', 60*60*24)
        res.status(200).json({
            message: "Logged Out Successfuly"
        })

    } catch (error) {
        console.log(error.message)
        res.status(400).send(error.message)
    }
}

export const getAllUsersController = async (req, res) => {
    const error = validationResult(req)

    if(!error.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }

    try {

        const allUsers = await userService.getAllUsers({userId: req.user.id});

        return res.status(200).json({
            users: allUsers
        })

    } catch (error) {
        console.log(error.message)
        res.status(400).json({errors: error.message})
    }
}
