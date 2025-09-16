import mongoose from 'mongoose';

// general schema, think sample game

const NotificationSchema = new mongoose.Schema({

  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['friend-request', 'upcoming-game'],
    required: true
  },
  object: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'objectModel'
  },
  objectModel: {
    type: String,
    required: true,
    enum: ['User', 'Game']
  }
});
 
const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;