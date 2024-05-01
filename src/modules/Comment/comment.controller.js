import commentModel from "../../../DB/models/comment.model.js"
import productModel from "../../../DB/models/product.model.js"
import axios from 'axios'

//======================  add comment ======================//
export const addComment = async (req, res, next) => {
    const { content } = req.body
    const { _id } = req.authUser
    const { productId } = req.params

    // Check if the product exists using its ID
    const product = await productModel.findById(productId)
    if (!product) return next(new Error('product not found', { cause: 404 }))

    // Create a new comment associated with the product and user
    const comment = await commentModel.create({ content, addedBy: _id, productId })

    // Send a JSON response indicating that the comment has been successfully added
    res.status(201).json({ message: 'comment added successfully', comment })
}


//========================== like comment ======================//
export const likeOrUnlikeComment = async (req, res, next) => {
   
    const { commentId } = req.params
    const { onModel } = req.body
    const { accesstoken } = req.headers

    // Send an HTTP POST request to like/unlike the comment
    axios({
        method: 'post',
        url: `http://localhost:3000/like/${commentId}`,
        data: {
            onModel
        },
        headers: {
            accesstoken
        }
    }).then((response) => {
        // Upon successful response, send a JSON response with the result
        res.status(200).json({ response: response.data })
    }).catch((err) => {
        // If an error occurs, send a JSON response with the error data
        res.status(500).json({ catch: err.data })
    })
}
