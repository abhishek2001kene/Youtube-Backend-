import mongoose, {Schema} from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";



const videoDetails = {
    url : {
        type : String,
        required:true
    },
    id :{
        type  : String,
        required:true
    }
}

const videoSchema = new Schema(
    {

        video:videoDetails,


        thumnail:videoDetails,


        // video:{
        //     type:String,
        //     required:true,
        // },
        // thumnail:{
        //     type:String,
        //     required:true,
        // },

        
        title:{
            type:String,
            required:true,
        },
        discription:{
            type:String,
            required:true,
        },
        duration:{
            type:Number,
            required:true,
        },
        views:{
            type:Number,
            default:0
        },
        published:{
            type:Boolean,
            default:true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }


    },

    {
        timestamps:true
    }
)


videoSchema.plugin(mongooseAggregatePaginate)


export const Video = mongoose.model('Video', videoSchema)