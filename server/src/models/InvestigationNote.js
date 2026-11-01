import mongoose from 'mongoose';

const schema = new mongoose.Schema({ mysteryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mystery', required: true }, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, content: { type: String, maxlength: 10000, default: '' }, relatedEvidenceId: mongoose.Schema.Types.ObjectId, relatedSuspectId: mongoose.Schema.Types.ObjectId }, { timestamps: true });
export default mongoose.model('InvestigationNote', schema);
