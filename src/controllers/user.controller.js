import { asyncHandler } from "../utils/asyncHandler.js";
import { User} from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import {uploadImageOnCloudinary, deleteImageFromCloudinary} from "../utils/cloudniary.js"
import {ApiResponce} from "../utils/ApiResponce.js"
import { json } from "express";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import fs from "fs"








const sanitizeKeys = (obj) => {
    const sanitizedObj = {};
    for (const key in obj) {
        const trimmedKey = key.trim(); // Trim the key
        sanitizedObj[trimmedKey] = obj[key];
    }
    return sanitizedObj;
};

const registerUser = asyncHandler(async (req, res, next) => {
    req.body = sanitizeKeys(req.body); // Sanitize keys
    const { username, email, fullName, password } = req.body;

    if (!username || !email || !fullName || !password) {
        throw new ApiError(400, "All fields are required.");
    }


 // if ([ username, email, fullName, password ].some((field) => field?.trim() === "")
    //     ) {
    //     throw new ApiError(400, "All fields are required."); 
    // }

 
    const existedUser = await User.findOne({
        $or : [{ username }, { email }]
    })
    
    if(existedUser){
        fs.unlinkSync(req.files?.avatar[0].path)
        fs.unlinkSync(req.files?.coverImage[0].path)
        throw new ApiError(409, "User with email Or Username already existed")
      
    }



const avatarLocalPath = req.files?.avatar[0]?.path   
    //  const coverImageLocalPath = req.files?.coverImage[0]?.path 

    
    let coverImageUrl;
    let coverImageLocalPath;
    if( req.files && 
        Array.isArray(req.files.coverImage) && 
        req.files.coverImage[0].path){

        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required")
    }



    const avatar = await uploadImageOnCloudinary(avatarLocalPath)
   if(coverImageLocalPath){
    coverImageUrl = await uploadImageOnCloudinary(coverImageLocalPath)
   }


    if(!avatar){
        throw new ApiError(400, "Avatar image is required")
    }


    const user = await User.create({
        fullName,
        avatar: {
            url : avatar.url,
            id : avatar.public_id
        },
        coverImage : {
            url : coverImageUrl?.url || "",
            id : coverImageUrl?.public_id || "",
        },
        email,
        username,
        password,
    })



    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering user")
}

return res.status(201).json(
    new ApiResponce(200, createdUser, "User register successfully")
)





});




const generateAccessAndRefreshToken = async (userId) => {

        try {
            const user = await User.findById(userId)

            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()

            if (!accessToken || !refreshToken) {
                throw new ApiError(501, "Error During generate access and refresh Token")
            }

            user.refreshToken = refreshToken
            await user.save({ validateBeforeSave : false })

            return {accessToken, refreshToken}

            
        } catch (error) {
            // throw new ApiError(500, "Something went wrong while generating refresh and access token")
            // // next(res.status(401).json(
            //     new ApiError(401, error, error?.message))
            // ) 
            throw new ApiError(error?.status || 501, error?.message || "Error During Generatitng Tokens")
        }

}




const loginUser = asyncHandler(async (req, res) => {

    const {username, email, password } = req.body 

    if(!(username || email)){
        throw new ApiError(400, "Username or Email is required")
    }

    if (!password) {
        throw new ApiError(404, "Password Field is Empty")
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })


    if(!user){
        throw new ApiError(400, "User dose not exist")
    }


    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }


    const {accessToken, refreshToken} = 
    await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User
    .findById(user._id)
    .select("-password -refreshToken")


    const options = {
        httpOnly : true,
        secure: true
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponce(
            200,
            {
                user : loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged In Successfully"
        )
    )

})




const logoutUser = asyncHandler(async(req, res, next) => {

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken:1
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly : true,
            secure: true
        }

        return res
        .status(200)
        .clearCookie("accessToken", options )
        .clearCookie("refreshToken", options)
        .json(new ApiResponce(200, {}, "User Logout Succesfully !"))
        

})




const refreshAccessToken = asyncHandler(async(req, res) => {

        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if(!incomingRefreshToken){
            throw new ApiError(401,"unauthorised request")
        }


        try {
            const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
            if(!decodedToken){
                throw new ApiError(401, "token not verified")
            }
            
            const user = await User.findById(decodedToken?._id)
    
            if (!user) {
                throw new ApiError(401, "Invalid refresh token");
            }
    
    
            if(incomingRefreshToken !== user?.refreshToken ){
                throw new ApiError(401, "Refresh token is expired or used")
            }
    
    
            const { accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
            const options = {
                httpOnly: true,
                secure: true
            }
    
    
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("RefreshToken", newRefreshToken, options)
            .json(
                new ApiResponce(
                    200,
                    {accessToken, newRefreshToken},
                    "Access token refreshed successfully"
                )
            )
        } catch (error) {
            throw new ApiError(401, error?.message || "Invalid refresh token")
        }

})

const checkUsernameAvailable = asyncHandler(async (req, res, next) => {
    const { username } = req.body;

    try {
        // Await the database query to ensure it resolves before proceeding
        const user = await User.findOne({ username });

        if (user) {
            // If the username is taken, return a 409 Conflict status
            return res.status(409).json(
                new ApiResponce(
                    409,
                    { available: false },
                    "Username not available"
                )
            );
        } else {
            // If the username is available, return a 200 OK status
            return res.status(200).json(
                new ApiResponce(
                    200,
                    { available: true },
                    "Username available"
                )
            );
        }
    } catch (error) {
        // Handle any errors that occur during the database query
        console.error(error);
        return res.status(500).json(
            new ApiResponce(
                500,
                null,
                "Internal server error while checking username"
            )
        );
    }
});


const changeCurrentPassword = asyncHandler(async (req, res) => {

        const {oldPassword, newPassword} = req.body

        const user = await User.findById(req.user?._id)

        
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400, "Invalid old passsword")
        }

        user.password = newPassword

        await user.save({validateBeforeSave : false})

        return res
        .status(200)
        .json(
          new ApiResponce(200, {}, "Password updated successfully")
        )
})





const getCurrentUser = asyncHandler(async (req, res) => {

        if(!req.user){
            throw new ApiError(404, "Unauthorized req")
        }

    return res
    .status(200)
    .json( 
        new ApiResponce(
        200,
        req.user,
        "User Fetched successfully "
    ));
});



const updateChannelDetails = asyncHandler(async (req, res) => {

    const { username, description } = req.body; 

    if (!username && !description) {
        throw new ApiError(400, "All fields are required");
    }

    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                username,
                userChannelDescription : description
            },
        },
        {
            new: true,
        }
    ).select("-password");

    if(!user){
        return res.staus(501).json(
            new ApiError(501, "Server Error! Information Not Update")
        )
    }


    return res.status(200).json(
        new ApiResponce(
            200, 
            {username: user.username, description : user.userChannelDescription},
            "Channel Details updated")
    );
});


const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body; 

    if (!fullName || !email) {
        throw new ApiError(400, "Fullname and Email both are required");
    }

    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            },
        },
        {
            new: true,
        }
    ).select("-password");


    return res.status(200).json(
        new ApiResponce(200, user, "Account Details updated")
    );
});









const updateUserAvatar = asyncHandler(async (req, res) => {

    if(!req.file){
        return res.status(400).json(
            new ApiError(400, "Avatar Image Not Received")
        )
    }

    try {
        const user = await User.findById(req.user._id)
        const oldImageId = user?.avatar.id
        if(!user){
            return res.status(400).json(
                new ApiError(400, "Invalid Req Please Login Again")
            )
        }
        
        const avatar = await uploadImageOnCloudinary(req.file.path)
        if(!avatar){
            return res.status(501).json(
                new ApiError(501, "Server Error!! during Uploading")
            )
        }

        user.avatar = {url : coverImage.url , id : coverImage.public_id}
        const updatedUser = await user.save({validateBeforeSave : false})

        if(!updatedUser){
            return res.status(501).json(
                new ApiError(501, "Server Error Not update")
            )
        }

        const deleteResult = await deleteImageFromCloudinary([oldImageId])
        console.log(deleteResult)
        
        return res.status(200).json(
            new ApiResponce(200, {}, "Avatar Successfully Updated")
        )

    } catch (error) {
        await deleteImageFromCloudinary([avatar.public_id])
        fs.unlink(req.file?.path)
        return res.status(400).json(
            new ApiError(400, error?.message)
        )
    }


})



const updateUserCoverImage = asyncHandler(async (req, res) => {

    if(!req.file){
        return res.status(400).json(
            new ApiError(400, "Cover Image Image Not Received")
        )
    }

    try {
        const user = await User.findById(req.user._id)
        const oldImageId = user?.coverImage?.id
        if(!user){
            return res.status(400).json(
                new ApiError(400, "Invalid request please login again")
            )
        }
        
        const avatar = await uploadImageOnCloudinary(req.file.path)
        if(!coverImage){
            return res.status(501).json(
                new ApiError(501, "Server Error!! during Uploading")
            )
        }


        user.coverImage = {url : coverImage.url , id : coverImage.public_id}
        const updatedUser = await user.save({validateBeforeSave : false})


        if(!updatedUser){
            return res.status(501).json(
                new ApiError(501, "Server Error Not update")
            )
        }

        if(oldImageId){
            const deleteResult = await deleteImageFromCloudinary([oldImageId])
        }


        return res.status(200).json(
            new ApiResponce(200, {}, "CoverImage Successfully Updated")
        )

    } catch (error) {
        await deleteImagesFromCloudinary([coverImage.public_id])
        fs.unlink(req.file?.path)
        return res.status(400).json(
            new ApiError(400, error?.message)
        )
    }


})



const getUserChannalProfile = asyncHandler(async (req, res) =>{

    const {username} =  req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
            {
                $match: {
                    username: username.trim(),
                }
                
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    
                    channelSubscribedTo : {
                        $size:"$subscribedTo"
                    },
                    isSubscribedto:{
                        $cond:{
                            if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $project:{
                    fullName:1,
                    username:1,
                    email:1,
                    subscribersCount:1,
                    channelSubscribedTo:1,
                    isSubscribedto:1,
                    avatar:1,
                    coverImage:1,
                }
            }
    ])

    if(!channel?.length){
        return res.status(400).json(
            new ApiError(400, "Channel does not exists")
        )    }

    return res
    .status(200)
    .json(
        new ApiResponce(
            200,
            channel[0],
            "User channel fetched Succesfully"
        )
    )


    })





const getWatchHistory = asyncHandler(async(req, res) => {
        const user = await User.aggregate([
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                           $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                           }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                user[0].watchHistory,
                "Watch history fetched succesfully"
            )
        )
    })










export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannalProfile,
    getWatchHistory,
    checkUsernameAvailable,
    updateChannelDetails
};
