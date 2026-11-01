import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Mystery from '../models/Mystery.js';
import MysterySolution from '../models/MysterySolution.js';
import Accusation from '../models/Accusation.js';
import InvestigationNote from '../models/InvestigationNote.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute, publicMystery } from '../utils/respond.js';
import { generateMystery, isTransientProviderError } from '../services/ai/generator.js';

const router=Router();router.use(authenticate);
const inputSchema=z.object({scenario:z.string().trim().min(20).max(2000),title:z.string().trim().max(80).optional().default(''),difficulty:z.enum(['Easy','Medium','Hard']).default('Medium')});
function buildCase(data,userId,difficulty,scenario){
  const suspectDocs=data.suspects.map(s=>({_id:new mongoose.Types.ObjectId(),...s}));
  const evidenceDocs=data.evidence.map(e=>({...e,relatedSuspectIds:e.relatedSuspectIndexes.map(i=>suspectDocs[i]._id),mediaStatus:'placeholder'}));
  const mystery=new Mystery({userId,title:data.title,scenario,description:data.description,difficulty,status:'in-progress',generationStatus:'playable',suspects:suspectDocs,evidence:evidenceDocs,timeline:data.timeline});
  return {mystery,solution:{mysteryId:mystery._id,culpritSuspectId:suspectDocs[data.culpritIndex]._id,motive:data.motive,crimeMethod:data.crimeMethod,actualTimeline:data.timeline.map(e=>`${e.time}: ${e.event}`),solutionExplanation:data.solutionExplanation}};
}
function ownedQuery(id,userId){return {_id:id,userId};}
router.post('/',asyncRoute(async(req,res)=>{
  const input=inputSchema.parse(req.body);let data;
  try{data=await generateMystery(input);if(!data)return res.status(503).json({success:false,message:'Mystery generation is unavailable until GEMINI_API_KEY is configured.',error:{code:'AI_NOT_CONFIGURED'}});}
  catch(error){
    console.error('Mystery generation failed:',error.message);
    if(isTransientProviderError(error))return res.status(503).json({success:false,message:'Gemini is temporarily busy. Please wait a minute and try generating this case again.',error:{code:'AI_PROVIDER_BUSY'}});
    return res.status(502).json({success:false,message:'Unable to generate a playable mystery. Please try again.',error:{code:'MYSTERY_GENERATION_FAILED'}});
  }
  const {mystery,solution}=buildCase(data,req.user._id,input.difficulty,input.scenario);
  await mystery.save();try{await MysterySolution.create(solution)}catch(error){await mystery.deleteOne();throw error}
  res.status(201).json({success:true,message:'Mystery generated successfully',data:{mystery:publicMystery(mystery)}});
}));
router.get('/',asyncRoute(async(req,res)=>{const mysteries=await Mystery.find({userId:req.user._id}).sort({updatedAt:-1}).limit(100);res.json({success:true,data:{mysteries:mysteries.map(publicMystery)}})}));
router.get('/:id/status',asyncRoute(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({success:false,message:'Case not found.'});const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('generationStatus status');if(!m)return res.status(404).json({success:false,message:'Case not found.'});res.json({success:true,data:{generationStatus:m.generationStatus,status:m.status}})}));
router.get('/:id',asyncRoute(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({success:false,message:'Case not found.'});const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id));if(!m)return res.status(404).json({success:false,message:'Case not found.'});res.json({success:true,data:{mystery:publicMystery(m)}})}));
router.delete('/:id',asyncRoute(async(req,res)=>{const m=await Mystery.findOneAndDelete(ownedQuery(req.params.id,req.user._id));if(!m)return res.status(404).json({success:false,message:'Case not found.'});await Promise.all([MysterySolution.deleteOne({mysteryId:m._id}),Accusation.deleteOne({mysteryId:m._id}),InvestigationNote.deleteMany({mysteryId:m._id})]);res.json({success:true,message:'Case deleted.',data:{}})}));
router.get('/:id/suspects',asyncRoute(async(req,res)=>{const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('suspects');if(!m)return res.status(404).json({success:false,message:'Case not found.'});res.json({success:true,data:{suspects:m.suspects}})}));
router.get('/:id/suspects/:suspectId',asyncRoute(async(req,res)=>{const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('suspects');if(!m)return res.status(404).json({success:false,message:'Case not found.'});const suspect=m.suspects.id(req.params.suspectId);if(!suspect)return res.status(404).json({success:false,message:'Suspect not found.'});res.json({success:true,data:{suspect}})}));
router.get('/:id/evidence',asyncRoute(async(req,res)=>{const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('evidence');if(!m)return res.status(404).json({success:false,message:'Case not found.'});res.json({success:true,data:{evidence:m.evidence}})}));
router.get('/:id/evidence/:evidenceId',asyncRoute(async(req,res)=>{const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('evidence');if(!m)return res.status(404).json({success:false,message:'Case not found.'});const evidence=m.evidence.id(req.params.evidenceId);if(!evidence)return res.status(404).json({success:false,message:'Evidence not found.'});res.json({success:true,data:{evidence}})}));
router.get('/:id/notes',asyncRoute(async(req,res)=>{const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('_id');if(!m)return res.status(404).json({success:false,message:'Case not found.'});const notes=await InvestigationNote.find({mysteryId:m._id,userId:req.user._id}).sort({updatedAt:-1});res.json({success:true,data:{notes}})}));
router.post('/:id/notes',asyncRoute(async(req,res)=>{const {content}=z.object({content:z.string().max(10000)}).parse(req.body);const m=await Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('_id');if(!m)return res.status(404).json({success:false,message:'Case not found.'});const note=await InvestigationNote.findOneAndUpdate({mysteryId:m._id,userId:req.user._id,relatedEvidenceId:{$exists:false},relatedSuspectId:{$exists:false}},{content},{new:true,upsert:true,setDefaultsOnInsert:true});res.json({success:true,message:'Notes saved.',data:{note}})}));
router.put('/:id/notes/:noteId',asyncRoute(async(req,res)=>{const {content}=z.object({content:z.string().max(10000)}).parse(req.body);const note=await InvestigationNote.findOneAndUpdate({_id:req.params.noteId,mysteryId:req.params.id,userId:req.user._id},{content},{new:true});if(!note)return res.status(404).json({success:false,message:'Note not found.'});res.json({success:true,data:{note}})}));
router.delete('/:id/notes/:noteId',asyncRoute(async(req,res)=>{const note=await InvestigationNote.findOneAndDelete({_id:req.params.noteId,mysteryId:req.params.id,userId:req.user._id});if(!note)return res.status(404).json({success:false,message:'Note not found.'});res.json({success:true,data:{}})}));
router.post('/:id/accusations',asyncRoute(async(req,res)=>{
  const {suspectId,explanation=''}=z.object({suspectId:z.string().min(1),explanation:z.string().max(1200).optional()}).parse(req.body);
  if(!mongoose.isValidObjectId(req.params.id)||!mongoose.isValidObjectId(suspectId))return res.status(400).json({success:false,message:'Select a valid suspect.',error:{code:'INVALID_SUSPECT'}});
  const mystery=await Mystery.findOne(ownedQuery(req.params.id,req.user._id));if(!mystery)return res.status(404).json({success:false,message:'Case not found.'});
  if(mystery.status==='completed')return res.status(409).json({success:false,message:'This case already has a final accusation.',error:{code:'CASE_COMPLETED'}});
  if(!mystery.suspects.id(suspectId))return res.status(400).json({success:false,message:'That suspect is not part of this case.',error:{code:'INVALID_SUSPECT'}});
  const solution=await MysterySolution.findOne({mysteryId:mystery._id});if(!solution)return res.status(500).json({success:false,message:'Case solution unavailable.'});
  const isCorrect=solution.culpritSuspectId.toString()===suspectId;
  try{await Accusation.create({mysteryId:mystery._id,userId:req.user._id,selectedSuspectId:suspectId,isCorrect,explanation});}catch(e){if(e.code===11000)return res.status(409).json({success:false,message:'This case already has a final accusation.',error:{code:'DUPLICATE_ACCUSATION'}});throw e}
  mystery.status='completed';await mystery.save();
  res.json({success:true,message:'Accusation evaluated.',data:{result:{isCorrect,selectedSuspectId:suspectId,solution:{culpritName:mystery.suspects.id(solution.culpritSuspectId)?.name,motive:solution.motive,crimeMethod:solution.crimeMethod,explanation:solution.solutionExplanation,actualTimeline:solution.actualTimeline}}}});
}));
router.get('/:id/result',asyncRoute(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({success:false,message:'Case not found.'});const accusation=await Accusation.findOne({mysteryId:req.params.id,userId:req.user._id});if(!accusation)return res.status(403).json({success:false,message:'Submit a final accusation to view the solution.',error:{code:'SOLUTION_LOCKED'}});const [solution,mystery]=await Promise.all([MysterySolution.findOne({mysteryId:req.params.id}),Mystery.findOne(ownedQuery(req.params.id,req.user._id)).select('suspects')]);if(!solution||!mystery)return res.status(404).json({success:false,message:'Case not found.'});res.json({success:true,data:{result:{isCorrect:accusation.isCorrect,selectedSuspectId:accusation.selectedSuspectId,solution:{culpritName:mystery.suspects.id(solution.culpritSuspectId)?.name,motive:solution.motive,crimeMethod:solution.crimeMethod,explanation:solution.solutionExplanation,actualTimeline:solution.actualTimeline}}}})}));
export default router;
