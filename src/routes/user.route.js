import {Router} from "express";
import {upload} from "../middewares/multer.js"
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllres/user.controller.js";
import { verifyJWT } from "../middewares/auth.middware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ])
    ,registerUser)

router.route("/login").post(loginUser)

//secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router;

