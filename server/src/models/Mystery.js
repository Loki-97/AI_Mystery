import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({ name: String, age: Number, occupation: String, description: String, relationship: String, motive: String, alibi: String, personality: String }, { _id: true });
const evidenceSchema = new mongoose.Schema({ title: String, category: String, description: String, content: String, relatedSuspectIds: [{ type: mongoose.Schema.Types.ObjectId }], discoveryTime: String, clueType: String, mediaStatus: { type: String, default: 'placeholder' } }, { _id: true });
const eventSchema = new mongoose.Schema({ time: String, event: String, relatedSuspect: String }, { _id: false });
const mysterySchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, title: { type: String, required: true }, scenario: { type: String, required: true }, description: String, difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }, status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' }, generationStatus: { type: String, enum: ['generating', 'playable', 'failed'], default: 'playable' }, crimeLocation: String, crimeDate: String, crimeTime: String, suspects: [suspectSchema], evidence: [evidenceSchema], timeline: [eventSchema] }, { timestamps: true });
export default mongoose.model('Mystery', mysterySchema);
