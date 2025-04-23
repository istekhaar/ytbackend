import jwt from "jsonwebtoken";
import {User} from "../models/user.models.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const generateAccessTokenAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while genrating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res)=>{
    //get user data from frontend
    //validation
    //check already exists
    //uplode them to cloudnary
    //create user
    //remove password and refresh token
    //ckheck for user creation
    //returen res

    const {username, email, fullName , password} = req.body;

    console.log("data from frontEnd=> ",username);
    if([username, email, fullName, password].some((feild)=>feild?.trim()==="")){
        throw new ApiError(400, "all feilds are required")
    }

    const exsitedUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(exsitedUser){
        throw new ApiError(409, "user alredy exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    console.log("req fiels ",req.files);
    console.log("avatar local path  = ", avatarLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    console.log("avatar=> ", avatar)
    if(!avatar){
        throw new ApiError(400, "avatar is required")
    }
    
    const user =await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password
    })
    
    const createdUser = User.findById(user?._id).select("-refreshToken -password")
    if(!createdUser){
        throw new ApiError(500, "user not create while user regiser")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200, createdUser, "user register successfully")
    )
})

const loginUser = asyncHandler(async(req, res)=>{
    //take data
    //check user found for not
    //check password
    //access and refressh token
    //send cookies
    const {email, username, password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "username or email required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if(!user){
        throw new ApiError(400, "user not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)
    
    if(!isPasswordCorrect){
        throw new ApiError(400, "password not currect")
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-refreshToken -password")

    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "logged successfully"))
})

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id
        ,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logded out successfully"))
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(400, "unauthrozied reruest")
    }

   try {
     const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(404, "invalid refreshToken")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "invalid refresh Token is exxpired or user")
     }
 
     const options={
         httpOnly: true,
         secure: true
     }
 
     const {accessToken, newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
 
     return res
     .status(200)
     .cookies("accessToken", accessToken, options)
     .cookies("refreshToken", newRefreshToken, options)
     .json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "access token refreshed"))
   } catch (error) {
        throw new ApiError(404, error?.message || "invalid refresh token")
   }
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}