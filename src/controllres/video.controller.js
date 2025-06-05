import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
// import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType="desc", userId } = req.query
    console.log("test");
    
    //TODO: get all videos based on query, sort, pagination

    // Calculate the offset based on the page number and limit
    const offset = (page-1)*limit;
    console.log("test 2");

    // Retrieve notes from the database with pagination
    const videos = await Video.find().skip(offset).limit(limit)
    console.log("test 3");

    // Validate sort fields
    const allowedSortFields = ["title", "view", "likes", "createdAt"]
    console.log("test 4");

    if(!allowedSortFields.includes(sortBy)){
        throw new ApiError(404, "Invalid sortBy field")
    }
    console.log("test 5");

    //bulid filter 
    const filter ={}
    console.log("test 6");

    if(query){
        // case-insensitive search on title
        filter.title={$regex: query, $options: "i"}
    }
    console.log("test 7");

    if(userId){
        // assuming 'user' is the field storing the uploader
        filter.user = userId
    }
    console.log("test 8");

    const shortOptions = {};
    shortOptions[sortBy]=sortType==="asc" ? 1 : -1;
    console.log("test 9");
    
    //query db
    const video= await Promise.all([
        Video.find(filter)
            .sort(shortOptions)
    ])
    console.log("test 10");

    return res
    .status(200)
    .json(new ApiResponse(200, {totalResults: videos.length, videos, video}, "fetch all videos"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(!title || !description){
        throw new ApiError(400, "titel and description are required")
    }
    const videoLocalPath = req.file?.video[0]?.path;
    if(!videoLocalPath){
        throw new ApiError(400, "video not found")
    }
    const uplodeOnCloudinary = await uploadOnCloudinary(videoLocalPath)

    if(!uplodeOnCloudinary){
        throw new ApiError(400, "error, uplodeOnCloudinary")
    }

    const videoUrl = uplodeOnCloudinary.url

    if(!videoUrl){
        throw new ApiError(400, "video url not found")
    }

    const video = await Video.create({
        title,
        description,
        videoUrl
    })

    if(!video){
        throw new ApiError(400, "error, video uploding")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "video successfully uplode"))


    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!videoId){
        throw new ApiError(404, "videoid is required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "video is not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "fetch video successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description, thumbnail} = req.body;
    //TODO: update video details like title, description, thumbnail

    if(!title || !thumbnail || !description){
        throw new ApiError(404, "all fileds are required")
    }

    if(!videoId){
        throw new ApiError(404, "video id not found")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "video is not found")
    }

    const thumbnailLocalPath = req.file?.thumbnail[0]?.path;

    if(!thumbnailLocalPath){
        throw new ApiError(401, "not found thumbnailLocalPath")
    }

    const thumbnailUplodeOnCloudinary = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnailUplodeOnCloudinary){
        throw new ApiError(400, "error, thumbnail Uplode On Cloudinary")
    }

    const thumbnailUrl = thumbnailUplodeOnCloudinary.url

    if(!thumbnailUrl){
        throw new ApiError(400, "thumbnail Url missing")
    }

    video.description=description
    video.title=title
    video.thumbnail=thumbnailUrl

    return res
    .status(200)
    .json(new ApiError(200, video, "update video details"))


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!videoId){
        throw new ApiError(404, "video id not found")
    }

    const video = await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(new ApiError(200, video, "video delet successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(404, "video id not found")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "video is not found")
    }

    // Toggle the publish status

    video.isPublished=!video.isPublished

    const videoSave = await video.save()
     return res
    .status(200)
    .json(new ApiResponse(200, { isPublished: video.isPublished }, `Video ${video.isPublished ? "published" : "unpublished"} successfully`))


})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}