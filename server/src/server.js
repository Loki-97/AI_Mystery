import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port=Number(process.env.PORT)||5000;
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error('JWT_SECRET must be set to at least 32 characters.');process.exit(1)}
connectDatabase().then(()=>app.listen(port,()=>console.log(`AI Mystery Room API listening on ${port}`))).catch(error=>{console.error('Unable to start server:',error.message);process.exit(1)});
