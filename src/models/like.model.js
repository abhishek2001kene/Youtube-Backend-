import mongoose, { Schema, Types } from "mongoose";


const likeModel = new Schema({

    video : {
        type : Schema.Types.ObjectId,
        ref:"Video"

    },
    comment:{
        type : Schema.Types.ObjectId,
        ref : "Comment"
    },
    likeBy:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }

},
{
    timestamps:true
})

export const Like = mongoose.model("Like" , likeModel)