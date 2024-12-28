import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import ApiError from "../utils/ApiError.js"


cloudinary.config({ 
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadImageOnCloudinary = async (localFilePath) => {
        try {
      

        if(!localFilePath) throw new ApiError(401, "File Path Not Received")
    
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
    
        });
    
        fs.unlinkSync(localFilePath);
        return response;
        } catch (error) {
        fs.unlinkSync(localFilePath);
        throw new ApiError(500, "Error uploading image to Cloudinary");
        }
    };
    



    const uploadVideoOnCloudinary = async (localFilePath) => {
        try {
        if (!localFilePath) return null;
    
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "video",
        
        });
    
        fs.unlinkSync(localFilePath);
        return response;
        } catch (error) {
        fs.unlinkSync(localFilePath);
        throw new ApiError(500, "Error uploading video to Cloudinary");
        }
    };
    





const deleteImageFromCloudinary = async ([ids])=> {

    try {

        if([!ids] && ![ids].length){

            throw new ApiError(
                401, "Ids Not send For deletion"
            )

        }
    
        const deleteResult = await cloudinary.api.delete_resources([ids])
        
    } catch (error) {
        throw new ApiError(
            error?.status || 501 , error?.message || "Error During Delete Images"
        )
    }
}








export { uploadImageOnCloudinary,
    uploadVideoOnCloudinary,
    deleteImageFromCloudinary,
}