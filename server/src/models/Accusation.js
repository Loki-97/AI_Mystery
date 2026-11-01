import mongoose from 'mongoose';

const schema = new mongoose.Schema({ mysteryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mystery', required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, selectedSuspectId: { type: mongoose.Schema.Types.ObjectId, required: true }, isCorrect: { type: Boolean, required: true }, explanation: { type: String, maxlength: 1200 } }, { timestamps: true });
schema.index({ mysteryId: 1 }, { unique: true });
export default mongoose.model('Accusation', schema);
