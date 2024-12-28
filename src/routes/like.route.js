import Router from "express"
import { verifyJWT} from "../middlewares/auth.middelware.js"
import {toogleVideoLike} from "../controllers/like.controller.js"

const router = Router()



router.patch("/toogleLike/:videoId", verifyJWT, toogleVideoLike)

export default router