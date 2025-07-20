import morgan from 'morgan'
import express from 'express'
import connect from './db/db.js'
import userRoutes from './routes/user.routes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import projectRoutes from './routes/project.routes.js'
import aiRoutes from './routes/ai.routes.js'

connect()
const app = express()

const allowedOrigins = ['https://codebuddy-1-0q7c.onrender.com', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // if using cookies or auth headers
}));
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  next()
})
app.use(cookieParser())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use('/users', userRoutes)
app.use('/projects', projectRoutes)
app.use('/ai', aiRoutes)

app.get('/', (req, res) => {
    res.send('Hello')
})

export default app