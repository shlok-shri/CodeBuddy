import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = mongoose.Schema({
    email : {
        type: String,
        required: true,
        lowercase : true,
        unique: true,
        minLength: [6, "Invalid Email"],
        trim : true
    },
    password : {
        type : String,
        minLength: [8, 'Password must be of atleast 8 characters'],
        select: false
    },
    projects: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'project'
        }
    ]
})

userSchema.statics.hashPassword = async function(password){
    return await bcrypt.hash(password, 10)
}

userSchema.methods.isValidPassword = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateJWT = function(){
    return jwt.sign(
        {
            id: this._id,
            name: this.name,
            email : this.email
        }, 
        process.env.JWT_SECRET, 
        {expiresIn: '24h'}
    )
}

const User = mongoose.model('user', userSchema)

export default User
