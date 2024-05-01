import commentModel from "../../../DB/models/comment.model.js"
import replyModel from "../../../DB/models/reply.model.js"
import axios from 'axios'; // Import axios for HTTP requests

//====================== add reply===========================//
export const addReply = async (req, res, next) => {
    const { content, onModel } = req.body
    const { _id } = req.authUser
    const { replyOnId } = req.params   // comment id , reply id

    // Check if the reply is on a Comment or a Reply
    if (onModel == 'Comment') {
        // Check if the specified comment exists
        const comment = await commentModel.findById(replyOnId)
        if (!comment) return next(new Error('comment not found', { cause: 404 }))
    } else if (onModel == 'Reply') {
        // Check if the specified reply exists
        const reply = await replyModel.findById(replyOnId)
        if (!reply) return next(new Error('reply not found', { cause: 404 }))
    }

    // Create the reply
    const reply = await replyModel.create({ content, addedBy: _id, onModel, replyOnId })
    res.status(201).json({ message: 'reply added successfully', reply })
}

//========================== like reply ======================//
export const likeOrUnlikeReply = async (req, res, next) => {
   
    const { replyId } = req.params
    const { onModel } = req.body
    const { accesstoken } = req.headers

    // Send HTTP POST request to the like endpoint with replyId and onModel
    axios({
        method: 'post',
        url: `http://localhost:3000/like/${replyId}`,
        data: {
            onModel
        },
        headers: {
            accesstoken
        }
    }).then((response) => {
        // Handle successful response
        res.status(200).json({ response: response.data })
    }).catch((err) => {
        // Handle error
        res.status(500).json({ catch: err.data })
    })
}
