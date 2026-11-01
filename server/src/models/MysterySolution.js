import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({ mysteryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mystery', required: true, unique: true }, culpritSuspectId: { type: mongoose.Schema.Types.ObjectId, required: true }, motive: String, crimeMethod: String, actualTimeline: [String], solutionExplanation: String }, { timestamps: true });
export default mongoose.model('MysterySolution', solutionSchema);
