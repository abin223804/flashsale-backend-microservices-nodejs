import express from 'express';
import proxy from 'express-http-proxy';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({error:'no auth'});
  const token = h.split(' ')[1];
  try{ jwt.verify(token, JWT_SECRET); next(); }catch(e){ return res.status(401).json({error:'invalid'}); }
}
app.use('/auth', proxy(process.env.AUTH_URL || 'http://localhost:4001'));
app.use('/products', authMiddleware, proxy(process.env.CATALOG_URL || 'http://localhost:4002'));
app.use('/orders', authMiddleware, proxy(process.env.ORDER_URL || 'http://localhost:4003'));
app.listen(process.env.PORT||8080, ()=>console.log('Gateway running', process.env.PORT||8080));
