import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const kafka = new Kafka({ brokers: (process.env.KAFKA_BROKERS||'kafka:9092').split(',') });
const consumer = kafka.consumer({ groupId: 'notifier-group' });
await consumer.connect().catch(()=>{console.log('kafka consumer connect failed')});
await consumer.subscribe({ topic: 'order.status', fromBeginning: true }).catch(()=>{});
const wss = new WebSocketServer({ port: process.env.PORT||4004 });
const clients = new Map();
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  try {
    const p = jwt.verify(token, JWT_SECRET);
    const userId = p.userId;
    clients.set(userId, ws);
    ws.on('close', ()=> clients.delete(userId));
    ws.send(JSON.stringify({ event: 'connected' }));
  } catch(e){ ws.close(); }
});
await consumer.run({
  eachMessage: async ({ message })=>{
    try{
      const data = JSON.parse(message.value.toString());
      const userId = data.userId || data.payload?.userId;
      if(userId && clients.has(userId)){
        const ws = clients.get(userId);
        if(ws && ws.readyState===ws.OPEN) ws.send(JSON.stringify({ event:'order.update', payload: data }));
      }
    }catch(e){ console.error('notifier parse', e.message); }
  }
});
console.log('Notifier running on', process.env.PORT||4004);
