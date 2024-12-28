import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";








const toogleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        return res.status(404).json(
            new ApiError(404, "VideoId Not Received")
        );
    }

    const alreadyLiked = await Like.findOne({
        video: videoId,
        likeBy: req.user?._id
    });

    if (alreadyLiked) {
        const unLikeVideo = await Like.deleteOne({ _id: alreadyLiked._id });
        if (!unLikeVideo) {
            return res.status(501).json(
                new ApiError(501, "Server ERR !!unlike not successful")
            );
        }
        return res.status(201).json(
            new ApiResponse(201, {}, "Unlike video Successfully")
        );
    } else {
        const likeVideo = await Like.create({
            video: videoId,
            likeBy: req.user._id
        });

        if (!likeVideo) {
            return res.status(501).json(
                new ApiError(501, "Server ERR !! Like Not successfully")
            );
        }

        return res.status(201).json(
            new ApiResponse(201, {}, "like video Successfully")
        );
    }
});


export{
    toogleVideoLike
}