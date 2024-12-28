import {Subscription} from  "../models/subscription.model.js"
import { ApiResponce } from "../utils/ApiResponce.js"
import { User } from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"





const subscribToChannel = asyncHandler( async ( req , res) =>{

    const {username} =  req.params

    if(!username){
        throw ApiError(400, "Username not found to subscribe to Channel")
    }

    const  channel = await User.findOne({username})

    if(req.user._id.toString() === channel._id.toString()){
        return res.status(400).json(
            new ApiError(400, "You not subscribed to yourself")
        )
        }

        
 if(!channel){

    return res.status(404).json(
        new ApiError(404, "Channel you want to subscribe not found")
    )
 }


 const existingSubcription = await Subscription.findOne({

    subscriber : req.user._id,
    channel : channel._id

 })



if(existingSubcription){
    return res.status(401).json(
        new ApiError(401, "Hey You Already subscribed To this Channel")
    )
}



const subscription = await Subscription.create({


    subscriber : res.user._id,
    channel : channel._id
})


return res.status(200).json(
    new ApiResponce(200, subscription, "Channel Subscribed Successfully")
)


})





const unsubscribedToChannel = asyncHandler(async (req, res) =>{

const {username} = req.params

if (!username) {
    return res.status(401).json(
        new ApiError(401, "username not received")
    )
}


const user = await User.findOne({ username })
if (!user) {
    return res.status(401).json(
        new ApiError(401, "Channel Doesn't Exits")
    )
}



try {
    const deleteSubscription = await Subscription.findByIdAndDelete(
        {
            subscriber : req.user._id,
            channel : user._id
        }
    )
    return res.status(200).json(
        new ApiResponce(200, {}, "unsubscribe Successfully") 
    )
} catch (error) {
    return res.status(400).json(
        new ApiError(401, error?.message)
    )
}
})



export {
    subscribToChannel,
    unsubscribedToChannel,
    

}