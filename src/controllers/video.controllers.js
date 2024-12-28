import ApiError from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    deleteImageFromCloudinary,
  uploadImageOnCloudinary,
  uploadVideoOnCloudinary,
} from "../utils/cloudniary.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const allowedMimeTypes = [
  "video/mp4",
  "video/x-matroska", // .mkv
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/mpeg", // .mpeg
];

const getAllVideosForHomePage = asyncHandler(async (req, res, next) => {
  const { page } = req.query;

  const options = {
    page: page || 1,
    limit: 16,
    sort: { createdAt: -1 },
    customLabels: {
      docs: "videos",
    },
  };

  const pipeline = [
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        thumbnail: 1,
        duration: 1,
        createdAt: 1,
        owner: {
          _id: 1,
          username: 1,
          fullname: 1,
          avatar: 1,
        },
      },
    },
  ];

  Video.aggregatePaginate(pipeline, options, function (err, results) {
    if (err) {
      return res
        .status(err?.status || 501)
        .json(
          new ApiError(
            err?.status || 501,
            err?.message || "During aggregate pagination"
          )
        );
    } else {
      if (!results.videos || !results.videos.length) {
        return res
          .status(200)
          .json(new ApiResponce(200, {}, "No Videos Uploaded On This Website"));
      } else {
        return res
          .status(200)
          .json(new ApiResponce(200, results, "Fetched Successfully"));
      }
    }
  });
});

const getAllChannelVideos = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { page } = req.query;

  if (!username) {
    return res
      .status(401)
      .json(new ApiError(401, "Channel Video Not Received For Get videos"));
  }

  const options = {
    page: page || 1,
    limit: 5,
    sort: { createdAt: -1 },
    customLabels: {
      docs: "videos",
    },
  };

  const userChannel = await User.findOne({ username });
  if (!userChannel) {
    return res.status(401).json(new ApiError(401, "Channel Doesn't Exist"));
  }

  const pipeline = [
    {
      $match: {
        owner: userChannel._id,
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        thumbnail: 1,
        duration: 1,
        createdAt: 1,
      },
    },
  ];

  Video.aggregatePaginate(pipeline, options, function (err, results) {
    if (err) {
      return res
        .status(err?.status || 501)
        .json(
          new ApiError(
            err?.status || 501,
            err?.message || "During aggregate pagination"
          )
        );
    } else {
      if (!results.videos || !results.videos.length) {
        return res
          .status(200)
          .json(new ApiResponce(200, {}, "No Videos Uploaded By This Channel"));
      } else {
        return res
          .status(200)
          .json(new ApiResponce(200, results, "Fetched Successfully"));
      }
    }
  });
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(401).json(new ApiError(401, "All Fields Required"));
  }

  if (!req.files) {
    return res
      .status(401)
      .json(new ApiError(401, "File Not Supported !!! Need Video File"));
  }

  if (!allowedMimeTypes.includes(req.files.videos[0].mimetype)) {
    return res
      .status(401)
      .json(new ApiError(401, "File Not Supported !!! Need Video File"));
  }

  const videoFilePath = req.files.videos[0].path;

  if (!videoFilePath) {
    return res.status(401).json(new ApiError(401, "No Video Received"));
  }

  const thumbnailFilePath = req.files.thumbnail[0].path;

  if (!thumbnailFilePath) {
    return res.status(401).json(new ApiError(401, "No Thumbnail Received"));
  }

  try {
    const uploadVideo = await uploadVideoOnCloudinary(videoFilePath);
    if (!uploadVideo) {
      return res
        .status(501)
        .json(new ApiError(501, "Server Error!! During Uploading Video"));
    }

    const uploadThumbnail = await uploadImageOnCloudinary(thumbnailFilePath);
    if (!uploadThumbnail) {
      return res
        .status(501)
        .json(new ApiError(501, "Server Error !! During Uploading Thumbnail"));
    }

    const publishVideoDocument = await Video.create({
      videoFilePath: {
        id: uploadVideo.public_id,
        url: uploadVideo.secure_url,
      },
      thumbnail: {
        id: uploadThumbnail.public_id,
        url: uploadThumbnail.secure_url,
      },
      owner: req.user._id,
      title,
      description,
      duration: uploadVideo.duration,
    });

    if (!publishVideoDocument) {
      return res.status(501).json(new ApiError(501, "Video Uploading Error"));
    }

    return res
      .status(201)
      .json(
        new ApiResponce(
          201,
          publishVideoDocument,
          "Video Uploaded Successfully"
        )
      );
  } catch (error) {
    return res
      .status(error?.status || 401)
      .json(
        new ApiError(
          error?.status || 401,
          error?.message || "Uploading To Cloudinary Error"
        )
      );
  }
});

const getVideoByid = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const objectId = new mongoose.Types.objectId(videoId);

  if (!videoId) {
    return res.status(401).json(new ApiError(401, "Not VideoId Received"));
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner._id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        isSubscribedTo: {
          $cond: {
            if: {
              if: { $in: [req.user?._id, $subscribers.subscriber] },
              then: true,
              else: false,
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "videoLikes",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$videoLikes" },
        isLikeTo: {
          $cond: {
            if: { $in: [req.user?._id, "$videoLikes.likeBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
        $project: {
            title : 1,
            description : 1,
            videoFile: 1,
            createdAt : 1,
            fullname: 1,
            username: 1,
            owner: {
                fullname: 1,
                username: 1,
                avatar : 1
            },
            subscribersCount: 1,
            isSubscribedTo: 1,
            likesCount: 1,
            isLikedTo: 1
        }
    }
  ]);

  console.log(video)


  if(!video && !video.length){
    return res.status(401).json(
        new ApiError(401, "No Video Found")
    )
  }

  return res.status(201).json(
    new ApiResponce(201, video[0], "video Fetched Successfully")
)

});

const tooglePublishVideo = asyncHandler(async(req, res)=>{
    const {videoId} = req.body
    if (!videoId) {
        return res.status(401).json(
            new ApiError(400, "Video Id Not Received")
        )
    }

    const video = await Video.findById(videoId)
    if (req.user._id.toString() !== video.owner.toString()) {
        return res.status(403).json(
            new ApiError(403, "You Are not authorized owner of This Video")
        )
    }


    video.isPublished = !video.isPublished
    const updatedToggle = await video.save()



    if (!updatedToggle) {
        return res.status(401).json(
            new ApiError(401, "Toogle Operation Unsuccessful")
        )
    }


    return res.status(200).json(
        new ApiResponse(200, { isPublished: updatedToggle.isPublished }, "toggle for isPublished Successful")
    )


})

const updateVideo = asyncHandler(async (req, res, next) => {
    const { videoId, title, description } = req.body

    if (!videoId) {
        return res.status(401).json(
            new ApiError(401, "Not VideoId Received")
        )
    }

    try {
        const video = await Video.findById(videoId)

        if (!video) {
            return res.status(401).json(
                new ApiError(401, "No Video Find with this Id")
            )
        }

        if (req.user?._id.toString() !== video.owner.toString()) {
            return res.status(403).json(
                new ApiError(403, "You Are not authorized Not owner of This Video")
            )
        }

        let thumbnailUploadResponse;
        if (req.file && req.file.path) {
            thumbnailUploadResponse = await uploadImageOnCloudinary(req.file.path)
        }

        video.title = title
        video.description = description

        if (thumbnailUploadResponse) {
            video.thumbnail.id = thumbnailUploadResponse.public_id || video.id
            video.thumbnail.url = thumbnailUploadResponse.url || video.url
        }

        const updatedVideo = await video.save()


        if (!updatedVideo) {
            return res.status(401).json(
                new ApiError(401, "Server Error !! During Update")
            )
        }

        if (thumbnailUploadResponse && req.file) {
            const deleteOldThumbnail = await deleteImagesFromCloudinary([video.thumbnail.public_id])
        }

        return res.status(200).json(
            new ApiResponse(200, updatedVideo, "Video Updated Successfully")
        )
    } catch (error) {
        return res.status(error?.status || 401).json(
            new ApiError(error?.status || 401, error?.message || "Video Not updated")
        )
    }


})

const deleteVideo = asyncHandler(async (req, res, next) => {
    const { videoId } = req.body
    if (!videoId) {
        return res.status(401).json(
            new ApiError(400, "Video Id Not Received")
        )
    }

    const video = await Video.findById(videoId)
    if (!video) {
        return res.status(401).json(
            new ApiError(401, "No Video With This Id Found")
        )
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        return res.status(401).json(
            new ApiError(401, "Your Are Not Authorized - not Owner of This Video")
        )
    }


    try {
        const deleteVideoResult = await Video.deleteOne({ _id: videoId })
        if (!deleteVideoResult) {
            return res.status(501).json(
                new ApiError(501, "Server Error !During Delete")
            )
        }


        const deleteVideo = await deleteImageFromCloudinary(video.videoFile.id)
        console.log(deleteVideo)


        const deleteThumbnail = await deleteImageFromCloudinary([video.thumbnail.id])
        console.log(deleteThumbnail)

        return res.status(200).json(
            new ApiResponse(200, {}, "Video Delete Successfully")
        )

    } catch (error) {
        return res.status(error?.status || 501).json(
            new ApiError(error.status || 501, error?.message || "Server ERRR!! During Delte")
        )
    }
})


export {
    getAllChannelVideos,
    getAllVideosForHomePage,
    publishVideo,
    getVideoByid,
    tooglePublishVideo,
    updateVideo,
    deleteVideo
}
