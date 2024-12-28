import mongoose, {Schema} from "mongoose";


const commentSchema = new Schema({
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    video : {
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    content : {
        type : String,
        required : true,
        min : [5, "Minimum 5 letters Required"],
        max : [200, "Maximun 200 letters Required"]
    }
}, {timestamps : true})

export const Comment = mongoose.model("Comment", commentSchema)

