import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import mysteryRoutes from './routes/mystery.routes.js';

const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173',credentials:true}));
app.use(express.json({limit:'32kb'}));
app.get('/health',(req,res)=>res.json({success:true,data:{status:'ok'}}));
app.use('/api/v1/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}),authRoutes);
app.use('/api/v1/mysteries',rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false}),mysteryRoutes);
app.use((req,res)=>res.status(404).json({success:false,message:'Route not found.',error:{code:'NOT_FOUND'}}));
app.use((error,req,res,next)=>{
  if(error?.name==='ZodError')return res.status(400).json({success:false,message:error.issues[0]?.message||'Request validation failed.',error:{code:'VALIDATION_ERROR'}});
  if(error?.name==='ValidationError')return res.status(400).json({success:false,message:'The request contains invalid data.',error:{code:'VALIDATION_ERROR'}});
  if(error?.code===11000)return res.status(409).json({success:false,message:'This record already exists.',error:{code:'DUPLICATE_RECORD'}});
  console.error('API error:',error);
  return res.status(500).json({success:false,message:'An unexpected server error occurred.',error:{code:'INTERNAL_ERROR'}});
});
export default app;
