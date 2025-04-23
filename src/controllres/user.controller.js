import jwt from "jsonwebtoken";
import {User} from "../models/user.models.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import mongoose from "mongoose";

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

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave: true})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "change password successfully"))
    
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "fetched successfuly"))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(404, "fullname and email are required")
    }

    const user = await User.findOneAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "account details update successfily"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(404, "avatr is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(404, "avatr url is missing, error")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar update"))
})

const updateCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(404, "coverImage is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(404, "coverImage url is missing, error")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage update"))
})

const getCurrentUserProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(404, "user not exits")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCounts:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCounts: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    console.log("channel=> ",channel);
    
    if(!channel?.length){
        throw new ApiError(404, "channel dose not exsit")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "user channel fetched successfully"))
})

const getWatcchHistory = asyncHandler(async(req, res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            },
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "watch history fetched succssfully"))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getCurrentUserProfile,
    getWatcchHistory
}