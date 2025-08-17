import mongoose from 'mongoose';

// general schema, think sample user

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  profile: { 
    description: {
      type: String,
      default: ''
    },
    picture: {
      type: String,
      default: 'public/assets/default-pfp.jpg'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  friends: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  }
});

// Create a compound unique index
userSchema.index({ username: 1, email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;