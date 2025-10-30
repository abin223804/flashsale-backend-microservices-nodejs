import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
dotenv.config();
const app = express();
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if(!email||!password) return res.status(400).json({error:'email+password required'});
  const h = await bcrypt.hash(password, 10);
  try {
    const r = await pool.query('INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id,email', [email,h,name]);
    res.json(r.rows[0]);
  } catch(err){
    res.status(400).json({error: err.message});
  }
});
app.post('/login', async (req,res)=>{
  const { email, password } = req.body;
  const r = await pool.query('SELECT id,password_hash FROM users WHERE email=$1',[email]);
  if(!r.rows[0]) return res.status(401).json({error:'invalid'});
  const ok = await bcrypt.compare(password, r.rows[0].password_hash);
  if(!ok) return res.status(401).json({error:'invalid'});
  const token = jwt.sign({userId:r.rows[0].id}, JWT_SECRET, {expiresIn:'15m'});
  res.json({accessToken: token});
});
app.listen(process.env.PORT||4001, ()=>console.log('Auth running', process.env.PORT||4001));
