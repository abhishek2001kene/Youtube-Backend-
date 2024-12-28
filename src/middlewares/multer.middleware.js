import multer from "multer";

const storage = multer.diskStorage({
    destination:function (res, file, cb) {
        cb(null,  "./public/temp")
    },
    filename: function (res, file, cb) {
        // cb(null, file.originalname)
        const uniqueSuffix = Date.now() + '-'+ Math.round(Math.random() * 1E9)
        // cb(null, file.originalname + '-' + uniqueSuffix)
        cb(null,  uniqueSuffix + '-' + file.originalname )
    }
})

export const upload = multer({ 
    storage,
})