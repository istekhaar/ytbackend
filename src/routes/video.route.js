import { Router } from "express";
import { getAllVideos, publishAVideo } from "../controllres/video.controller.js";
import {upload} from "../middewares/multer.js"
import { verifyJWT } from "../middewares/auth.middware.js";
const router = Router()

router.route("/").get(getAllVideos)
router.route("/uplode").post(verifyJWT, upload.single("video"), publishAVideo)

export default router