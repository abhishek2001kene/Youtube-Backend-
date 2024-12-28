import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannalProfile,
  getWatchHistory,
  updateChannelDetails,
  checkUsernameAvailable
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middelware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/is-username-available").post(checkUsernameAvailable);

router.route("/change-password").patch(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);


router
.route("/avatar")
.patch(verifyJWT, upload.single("avatar"), updateUserAvatar);


router
.route("/cover-Image")
.patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);


router.route("/channel/:username").get(verifyJWT, getUserChannalProfile);

router.route("/history").get(verifyJWT, getWatchHistory);


router.route('/updateChannelDetails').patch(verifyJWT, updateChannelDetails)


export default router;
