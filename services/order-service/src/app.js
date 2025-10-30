import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();
const app = express();
app.use(express.json());
const kafkaBrokers = (process.env.KAFKA_BROKERS||'kafka:9092').split(',');
const kafka = new Kafka({ brokers: kafkaBrokers });
const producer = kafka.producer();
await producer.connect().catch(()=>{console.log('kafka producer connect failed')});
// outbox dispatcher
setInterval(async ()=>{
  const client = await pool.connect();
  try{
    const r = await client.query("SELECT * FROM outbox WHERE processed=false ORDER BY id LIMIT 10");
    for(const row of r.rows){
      try{
        await producer.send({ topic: row.event_type, messages: [{ value: JSON.stringify(row.payload) }] });
        await client.query('UPDATE outbox SET processed=true, processed_at=now() WHERE id=$1',[row.id]);
      }catch(e){ console.error('outbox publish failed', e.message); }
    }
  }finally{ client.release(); }
}, 2000);
// consume inventory.result
const consumer = kafka.consumer({ groupId: 'order-group' });
await consumer.connect().catch(()=>{console.log('kafka consumer connect failed')});
await consumer.subscribe({ topic: 'inventory.result', fromBeginning: true }).catch(()=>{});
await consumer.run({
  eachMessage: async ({ message })=>{
    try{
      const data = JSON.parse(message.value.toString());
      const client = await pool.connect();
      try{
        await client.query('BEGIN');
        if(data.success){
          await client.query("UPDATE orders SET status='reserved' WHERE id=$1",[data.orderId]);
        } else {
          await client.query("UPDATE orders SET status='failed' WHERE id=$1",[data.orderId]);
        }
        await client.query("INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload) VALUES ($1,$2,$3,$4)",
          ['order', data.orderId, 'order.status', JSON.stringify({orderId:data.orderId, status: data.success? 'reserved':'failed'})]);
        await client.query('COMMIT');
      }catch(e){ await client.query('ROLLBACK'); console.error(e.message); } finally { client.release(); }
    }catch(e){ console.error('parse err', e.message); }
  }
});
// orders endpoint
app.post('/orders', async (req,res)=>{
  const idem = req.headers['idempotency-key'];
  if(!idem) return res.status(400).json({error:'Idempotency-Key required'});
  const { userId, items, total } = req.body;
  const client = await pool.connect();
  try{
    const found = await client.query('SELECT * FROM orders WHERE idempotency_key=$1',[idem]);
    if(found.rows.length) return res.json(found.rows[0]);
    await client.query('BEGIN');
    const orderR = await client.query('INSERT INTO orders (user_id, total_amount, status, idempotency_key) VALUES ($1,$2,$3,$4) RETURNING *',
      [userId, total||0, 'pending', idem]);
    const order = orderR.rows[0];
    for(const it of items || []) {
      await client.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)', [order.id, it.productId, it.quantity, it.price||0]);
    }
    await client.query("INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload) VALUES ($1,$2,$3,$4)",
      ['order', order.id, 'order.created', JSON.stringify({ orderId: order.id, userId, items })]);
    await client.query('COMMIT');
    res.status(201).json(order);
  }catch(e){
    await client.query('ROLLBACK');
    if(e.code==='23505'){
      const r = await client.query('SELECT * FROM orders WHERE idempotency_key=$1',[idem]);
      return res.json(r.rows[0]);
    }
    res.status(500).json({error:e.message});
  }finally{ client.release(); }
});
app.listen(process.env.PORT||4003, ()=>console.log('Order running', process.env.PORT||4003));
