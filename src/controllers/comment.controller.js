import  { ApiResponce } from "../utils/ApiResponce.js"
import { asyncHandler } from "../utils/asyncHandler.js" 
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import mongoose, { Schema } from "mongoose"
import ApiError from "../utils/ApiError.js"





const createComment = asyncHandler(async (req, res, next) => {

    const { videoId } = req.params
    const { comment } = req.body

    const isVideo = await Video.findById(videoId)


    if (!isVideo) {
        throw new ApiError(404, "video not available for comment");
        
    }

    if(!videoId && !comment){
        throw new ApiError(501, "erroe of creating comment in video id or comment")
    }

    try {
        const createComment = await Comment.create({
            owner:req.user._id,
            video:videoId,
        })

        if (!createComment) {
             throw new ApiError(200, "error during creating comment")                       
        }

        return res
        .status
        .json(
            ApiResponce(
                201,
                createComment,
                "Comment Successfull"
            )
        )



    } catch (error) {
        
        return res.status(error.status || 401).json(
            new ApiError(error.status || 401, error.message || "ERR !! During Creating Comment")
        )
    }

}
)


const getAllVideoComments = asyncHandler(async(req, res) => {

        const { videoId } = req.params

        if (!videoId) {

            throw new ApiError(404, "video received");
            

        }

        const comment = await Comment.aggregate([

            {
                $match:{
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {

                $lookup: {
                    from:'user',
                    localField:'owner',
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                username:1,
                                avatar:1
                            }
                        },
                    ]
                }
            },
            {
                $lookup:{
                    from:"likes",
                    localField:"_id",
                    foreignField:"comment",
                    as:"commentLikes"
                }
            },
            {
                $addFields:{
                    owner:{
                        $first:"$onwer"
                    }
                },
                isLikeTo : {
                        $cond : {
                            if : {$in : [req.user?._id, "$commentLikes.owner"]},
                            then : true,
                            else : false
                        }
                    },
            },
            {
                $sort : {
                    createdAt: -1
                }
            }

        ])

        return res.status(200).json(
            new ApiResponce(200, comment, "Comments Fetched Successfully")
        )

})


const updateComment = asyncHandler(async(req, res) => {

    const { commentId, content } = req.body

    if(!commentId){
        return res.status(401).json(
            new ApiError(401, "Comment Id Not Given")
        )
    }



    const comment = await Comment.findById(commentId)

    if (!comment) {
        return res.status(404).json(
            new ApiError(404, "Comment With This Id Not Found")
        )
    }



    if (comment.owner.toString() != req.user._id) {
        
        return res.status(401).json(
            new ApiError(401, "Your Are Not Owner Of this Comment")
        )

    }




const updatedComment = comment.updateOne(
    {
        _id : commentId
    },
    {
        $set : {
            content
        }
    },
    {
        new:true
    }

)

if (!updatedComment) {
    return res.status(501).json(
        new ApiError(501, "ERR !! Server Err During Comment Update")
    )
}

return res.status(200).json(
    new ApiResponce(200, updatedComment, "Comment Successfully Updated")
)



})



const deleteComment = asyncHandler(async(req, res) => {

    const {commentId} = req.body

    if (!commentId) {
        return res.status(401).json(
            new ApiError(401, "Comment Not Received For Comment Delete")
        )
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        return res.status(404).json(
            new ApiError(404, "Comment With The Given Id Not Found")
        )
    } 
    


    if (comment.owner.toString() !== req.user._id) {
        
        return res.status(401).json(
            new ApiError(401, "Unauthorized Req !! You are not owner of This Comment")
        )

    }




    const deleteComment = await Comment.deleteOne({_id : commentId})

    if(!deleteComment){
        return res.status(501).json(
            new ApiError(501, " SERVER ERR !! During Comment Deletion")
        )
    }

    return res.status(200).json(
        new ApiResponce(200, {}, "Delete Comment Successfully")
    )

})




export {

    createComment,
    getAllVideoComments,
    updateComment,
    deleteComment

}
