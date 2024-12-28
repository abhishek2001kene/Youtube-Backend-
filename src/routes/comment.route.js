import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middelware.js"
import { createComment, deleteComment, getAllVideoComments, updateComment } from "../controllers/comment.controller.js"


const router = Router()

router.post("/createVideoComment/:videoId", verifyJWT, createComment)

router.get("/getAllVideosComment/:videoId", verifyJWT, getAllVideoComments)

router.post("/updateComment", verifyJWT, updateComment)


router.post('/deleteComment', verifyJWT, deleteComment)


export default router

