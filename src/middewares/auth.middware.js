import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

export const verifyJWT = asyncHandler(async(req, _, next)=>{
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
     if(!token){
         throw new ApiError(400, "Unauthorizes token")
     }
 
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT)
 
     const user = await User.findById(decodedToken?._id).select("-refreshToken -password")
 
     if(!user){
         throw new ApiError(401, "invalid accessToken")
     }
 
     req.user=user
     next()
   } catch (error) {
        throw new ApiError(401, error?.message || "invalid accessToken")
        // next()
   }
})