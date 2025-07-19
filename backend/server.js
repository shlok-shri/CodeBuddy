import 'dotenv/config'
import app from './app.js'
import http from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Project from './models/project.model.js'
import { generateContent } from './services/ai.service.js';
import { name } from 'ejs'

const server = http.createServer(app)
const io = new Server(server,{
    cors: {
        origin: '*'
    }
});

const socket = io("wss://zenspace-backend.onrender.com");

io.use(async (socket, next) => {
    try {
        
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        if(!mongoose.Types.ObjectId.isValid(projectId)){
            return next(new Error('Invalid Project ID'))
        }
        socket.project = await Project.findById(projectId)

        if(!token){
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if(!decoded){
            return next(new Error('Authentication error'))
        }

        socket.user = decoded
        next()

    } catch (error) {
        next(error) //isse socket kabhi connect hi nahi ho payega
    }
})

io.on('connection', socket => {
  
  socket.roomId = socket.project._id.toString()

  console.log('a user connected')
  socket.join(socket.roomId)

  socket.on('project-message', async data => {
    
    socket.broadcast.to(socket.roomId).emit('project-message', data)

    const message = data.message;
    const aiInMessage = message.startsWith('@ai');

    if(aiInMessage){
        try {
            const prompt = message.replace('@ai', '');
            if(!prompt){
                data.message = 'Please provide a valid prompt for AI.';
                return socket.broadcast.to(socket.roomId).emit('project-message', data);
            }

            const response = await generateContent(prompt);
            io.to(socket.roomId).emit('project-message', {
                message: response,
                sender: {
                    _id: 'ai',
                    email: 'AI',
                }
            })

        } catch (error) {
            console.error('Error generating content:', error);
            data.message = 'Server Busy, please try again later.';
        }
    }

  })

  socket.on('event', data => { /* … */ });
  socket.on('disconnect', () => { 
    console.log('disconnected')
    socket.leave(socket.roomId); 
  });
});

const port = process.env.PORT || 3000
server.listen(port, ()=>{
    console.log(`Server running on port ${port}`)
})
