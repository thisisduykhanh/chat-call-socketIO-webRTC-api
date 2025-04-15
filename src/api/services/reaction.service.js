const Reaction = require("@/models/reaction.model");
const CreateError = require('http-errors'); 

class ReactionService {
    async createReaction({ messageId, userId, type }) {
        try {
          // Kiểm tra nếu user đã reaction cho message này chưa
          const existingReaction = await Reaction.findOne({ message: messageId, user: userId });
          if (existingReaction) {
            throw CreateError.BadRequest('User has already reacted to this message.');
          }
    
          // Tạo mới reaction
          const reaction = new Reaction({
            message: messageId,
            user: userId,
            type,
          });
    
          const savedReaction = await reaction.save();
          return savedReaction;
        } catch (error) {
          throw error;  // Để controller bắt lỗi
        }
      }
    
      // Lấy tất cả reactions cho một message
      async getReactionsForMessage(messageId) {
        try {
          const reactions = await Reaction.find({ message: messageId })
            .populate('user', 'username'); // Giả sử bạn muốn lấy tên người dùng
          return reactions;
        } catch (error) {
          throw error;
        }
      }
    
      // Xóa reaction của user trên message
      async deleteReaction({ messageId, userId }) {
        try {
          const deletedReaction = await Reaction.findOneAndDelete({ message: messageId, user: userId });
          if (!deletedReaction) {
            throw CreateError.NotFound('Reaction not found.');
          }
          return deletedReaction;
        } catch (error) {
          throw error;
        }
      }
}


module.exports = new ReactionService();