import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({

    subscriber : {
        type : Schema.Types.ObjectId, //who is suscribing
        ref:"User"
    },
    channel : {
        type : Schema.Types.ObjectId, // whom to suscribe
        ref:"User"
    }

},
{
    timestamps:true
})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)