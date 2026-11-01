import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { asyncRoute } from '../utils/respond.js';

const router = Router();
const authInput = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) });
function setSession(res,user) { const token=jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });res.cookie('casefile_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/v1',maxAge:7*24*60*60*1000}); }
router.post('/register', asyncRoute(async (req,res) => {
  const input = z.object({ name:z.string().trim().min(2).max(80), ...authInput.shape }).parse(req.body);
  const email=input.email.toLowerCase();
  if(await User.exists({email})) return res.status(409).json({success:false,message:'An account with this email already exists.',error:{code:'EMAIL_EXISTS'}});
  const user=await User.create({name:input.name,email,password:await bcrypt.hash(input.password,12)});
  setSession(res,user);return res.status(201).json({success:true,message:'Account created.',data:{user:{id:user._id,name:user.name,email:user.email}}});
}));
router.post('/login', asyncRoute(async (req,res) => {
  const input=authInput.parse(req.body); const user=await User.findOne({email:input.email.toLowerCase()}).select('+password');
  if(!user||!(await bcrypt.compare(input.password,user.password))) return res.status(401).json({success:false,message:'Email or password is incorrect.',error:{code:'INVALID_CREDENTIALS'}});
  setSession(res,user);return res.json({success:true,message:'Signed in.',data:{user:{id:user._id,name:user.name,email:user.email}}});
}));
router.post('/logout',(req,res)=>{res.clearCookie('casefile_session',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/v1'});res.json({success:true,message:'Signed out.',data:{}})});
router.get('/me',authenticate,(req,res)=>res.json({success:true,data:{user:{id:req.user._id,name:req.user.name,email:req.user.email}}}));
export default router;
