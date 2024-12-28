import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middelware.js"
import { upload } from "../middlewares/multer.middleware.js";



import {
    deleteVideo, 
    getAllChannelVideos, 
    getAllVideosForHomePage, 
    getVideoByid, 
    publishVideo, 
    tooglePublishVideo, 
    updateVideo
} from "../controllers/video.controllers.js"




const router = Router()

router.post("/publishVideo",
    upload.fields([
        {
            name : 'videoFile',
            maxCount : 1
        },
        {
            name : "thumbnail",
            maxCount : 1
        }
    ]),
    verifyJWT,
    publishVideo
)




router.patch("/updateVideo", upload.single('thumbnail'), verifyJWT, updateVideo)


router.patch("/tooglePublishedVideo", verifyJWT, tooglePublishVideo )


router.delete("/deleteVideo", verifyJWT, deleteVideo )


router.get("/:username/getAllChannelVideos", verifyJWT, getAllChannelVideos)


router.get("/getVideoById/:", verifyJWT, getVideoByid)


router.get("/home-videos", getAllVideosForHomePage)








export default router


