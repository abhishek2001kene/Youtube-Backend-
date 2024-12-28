import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middelware.js";
import { subscribToChannel, unsubscribedToChannel } from "../controllers/suscription.controllers.js";

const router = Router();  


router.route('/subscribeToChannel/:username').post(verifyJWT, subscribToChannel);
router.route('/unsubscribeToChannel/:username').delete(verifyJWT, unsubscribedToChannel);

export default router; 
