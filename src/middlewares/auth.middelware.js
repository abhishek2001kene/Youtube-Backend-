import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User} from "../models/user.model.js"



export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        console.log("Token from cookies:", req.cookies?.accessToken);
console.log("Token from Authorization header:", req.header("Authorization"));

    
        if(!token) {
            throw new ApiError(401,"Unathorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)


    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;



        next()
    } catch (error) {
        // throw new ApiError(401, error?.message || "Invalid Access Token")
        next(new ApiError(401, error?.message || "invalid Request"))
    }

})