import commentModel from "../../../DB/models/comment.model.js"
import likesModel from "../../../DB/models/likes.model.js"
import productModel from "../../../DB/models/product.model.js"
import replyModel from "../../../DB/models/reply.model.js"

//========================= get user likes history =======================//
export const getUserLikesHistory = async (req, res, next) => {
    const { _id } = req.authUser

    // Create a query filter object to specify conditions for finding likes
    let queryFilter = {}

    // If 'onModel' parameter is present in the query, add it to the filter
    if (req.query.onModel) queryFilter.onModel = req.query.onModel

    // Add the user's ID as a condition to filter likes by the user
    queryFilter.likedBy = _id

    // Find likes based on the constructed query filter
    const likes = await likesModel.find(queryFilter).populate([
        {
            path: 'likeDoneOnId',
            populate: {
                path: 'addedBy',
                select: 'username'
            } // Nested populate to get username of the user who added the item (product/comment/reply)
        }
    ])

    // Send the retrieved likes as JSON response
    res.status(200).json({ message: 'done', likes })
}

//========================= like or unlike an item =======================//
export const likeOrUnlike = async (req, res, next) => {
    const { likeDoneOnId } = req.params  // productId, commentId, or replyId
    const { _id } = req.authUser
    const { onModel } = req.body

    let dbModel = ''

    // Determine the database model based on the 'onModel' parameter
    if (onModel === 'Product') dbModel = productModel
    else if (onModel == 'Comment') dbModel = commentModel
    else if (onModel == 'Reply') dbModel = replyModel

    // Check if the item exists in the corresponding database model
    const document = await dbModel.findById(likeDoneOnId)
    if (!document) return next(new Error(` ${onModel} is not found'`, { cause: 404 }))

    // Check if the user has already liked the item
    const isAlreadyLiked = await likesModel.findOne({ likedBy: _id, likeDoneOnId })

    if (isAlreadyLiked) {
        // If the user has already liked the item, unlike it
        // Delete the like document from the likes collection
        await likesModel.findByIdAndDelete(isAlreadyLiked._id)
        // Decrement numberOfLikes in the item document by 1
        document.numberOfLikes -= 1
        await document.save()
        return res.status(200).json({ message: 'unLike Done', count: document.numberOfLikes })
    }

    // If the user has not liked the item, like it
    // Create a like document in the likes collection
    const like = await likesModel.create({ onModel, likedBy: _id, likeDoneOnId })
    // Increment numberOfLikes in the item document by 1
    document.numberOfLikes += 1
    await document.save()

    // Send success message along with like information and updated like count
    res.status(200).json({ message: 'Like Done', like, count: document.numberOfLikes })
}
