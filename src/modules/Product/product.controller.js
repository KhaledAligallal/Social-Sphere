import commentModel from "../../../DB/models/comment.model.js"
import likesModel from "../../../DB/models/likes.model.js"
import productModel from "../../../DB/models/product.model.js"
import cloudinaryConnection from "../../utils/cloudinary.js"
import generateUniqueString from "../../utils/generateUniqueString.js"

import axios from 'axios'

//========================= add product =======================//
export const addProduct = async (req, res, next) => {
    const { title, caption } = req.body
    const { _id } = req.authUser

    // Check if images are uploaded
    if (!req.files?.length) return next(new Error('please upload images', { cause: 400 }))

    let Images = []
    let publicIdsArr = []
    const folderId = generateUniqueString(5)
    for (const file of req.files) {
        // Upload images to Cloudinary
        const { secure_url, public_id } = await cloudinaryConnection().uploader.upload(file.path, {
            folder: `upVoteV1/products/${_id}/${folderId}`,
            use_filename: true,
            unique_filename: true
        })
        publicIdsArr.push(public_id)
        Images.push({ secure_url, public_id, folderId })
    }

    // Create product
    const product = await productModel.create({ title, caption, addedBy: _id, Images })
    if (!product) {
        // Delete uploaded images if product creation fails
        const deletedData = await cloudinaryConnection().api.delete_resources(publicIdsArr)
        return next(new Error('add product fail'))
    }
    res.status(201).json({ message: 'done', product })
}

//========================== like product ======================//
export const likeOrUnlikeProduct = async (req, res, next) => {
    
    const { productId } = req.params
    const { onModel } = req.body
    const { accesstoken } = req.headers

    // Send HTTP POST request to like endpoint with productId and onModel
    axios({
        method: 'post',
        url: `http://localhost:3000/like/${productId}`,
        data: {
            onModel
        },
        headers: {
            accesstoken
        }
    }).then((response) => {
        res.status(200).json({ response: response.data })
    }).catch((err) => {
        res.status(500).json({ catch: err.data })
    })

}

//============================= get all likes for product =====================//
export const getAllLikesForProduct = async (req, res, next) => {
    const { productId } = req.params

    // Find all likes for a product
    const likes = await likesModel.find({
        likeDoneOnId: productId,
    }).populate([
        {
            path: 'likeDoneOnId'
        }
    ]).select('likedBy likeDoneOnId onModel -_id')

    res.status(200).json({ message: 'done', likes })
}

//=============================== update product ===========================//
export const updateProduct = async (req, res, next) => {
    const { title, caption, oldPublicId } = req.body
    const { _id } = req.authUser
    const { productId } = req.params

    // check product
    const product = await productModel.findOne({ addedBy: _id, _id: productId })
    if (!product) return next(new Error('product not found', { cause: 404 }))

    // update product
    if (title) product.title = title
    if (caption) product.caption = caption

    if (oldPublicId) {
        if (!req.file) return next(new Error('please upload the new image', { cause: 400 }))

        // delete old image from cloudinary
        await cloudinaryConnection().uploader.destroy(oldPublicId)
        // upload the new image to cloudinary
        const { secure_url, public_id } = await cloudinaryConnection().uploader.upload(req.file.path, {
            folder: `upVoteV1/products/${_id}/${product.Images[0].folderId}`,
        })

        product.Images.map(image => {
            if (image.public_id === oldPublicId) {
                image.public_id = public_id
                image.secure_url = secure_url
            }
        })
    }

    await product.save()
    res.status(200).json({ message: 'Updated Done', product })
}

//=========================== delete product ========================//
export const deleteProduct = async (req, res, next) => {
    const { _id } = req.authUser
    const { productId } = req.params

    // check product
    const product = await productModel.findOneAndDelete({ addedBy: _id, _id: productId })
    if (!product) return next(new Error('product not found', { cause: 404 }))

    let publicIdsArr = []
    // delete images from cloudinary
    for (const image of product.Images) {
        publicIdsArr.push(image.public_id)
    }

    // TODO: delete folder from cloudinary
    await cloudinaryConnection().api.delete_resources(publicIdsArr)

    res.status(200).json({ message: 'Deleted Done' })
}
export const getAllProducts = async (req, res, next) => {
  
    //============================ Cursor Method ===============//
    // Using Cursor Method to fetch all products from the database
    const products = await productModel.find().cursor()
    
    // Array used to store the final data results
    let finalResult = []
    
    // Loop through each product fetched using the cursor
    for (let doc = await products.next(); doc != null; doc = await products.next()) {
        // Find all comments associated with the current product
        const comments = await commentModel.find({ productId: doc._id })
        
        // Convert the MongoDB document to a plain JavaScript object
        const docObject = doc.toObject()
        
        // Attach the comments to the product object
        docObject.comments = comments
        
        // Add the modified product object to the final result array
        finalResult.push(docObject)
    }
    
    // Send the final result as JSON response
    res.status(200).json({ message: 'done', products: finalResult })
}
