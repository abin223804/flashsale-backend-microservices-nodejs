import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import { Kafka } from 'kafkajs';
dotenv.config();
const app = express();
app.use(express.json());
const kafkaBrokers = (process.env.KAFKA_BROKERS||'kafka:9092').split(',');
const kafka = new Kafka({ brokers: kafkaBrokers });
const producer = kafka.producer();
await producer.connect().catch(()=>{console.log('kafka producer connect failed')});
app.get('/products', async (req,res)=>{
  const r = await pool.query('SELECT p.*, i.stock FROM products p LEFT JOIN inventory i ON p.id=i.product_id');
  res.json(r.rows);
});
app.post('/products', async (req,res)=>{
  const { name, price, stock } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pr = await client.query('INSERT INTO products (name, price) VALUES ($1,$2) RETURNING id,name,price', [name,price]);
    await client.query('INSERT INTO inventory (product_id, stock, version) VALUES ($1,$2,1)', [pr.rows[0].id, stock||0]);
    await client.query('COMMIT');
    res.json(pr.rows[0]);
  } catch(err){
    await client.query('ROLLBACK');
    res.status(500).json({error:err.message});
  } finally { client.release(); }
});
// simple kafka consumer to reserve stock on order.created
const consumer = kafka.consumer({ groupId: 'catalog-group' });
await consumer.connect().catch(()=>{console.log('kafka consumer connect failed')});
await consumer.subscribe({ topic: 'order.created', fromBeginning: true }).catch(()=>{});
await consumer.run({
  eachMessage: async ({ message }) => {
    try {
      const data = JSON.parse(message.value.toString());
      const items = data.items || [];
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        let ok = true;
        for(const it of items){
          const r = await client.query('SELECT stock FROM inventory WHERE product_id=$1 FOR UPDATE', [it.productId]);
          if(r.rows.length===0 || r.rows[0].stock < it.quantity){ ok = false; break; }
        }
        if(ok){
          for(const it of items){
            await client.query('UPDATE inventory SET stock = stock - $1, version = version + 1 WHERE product_id=$2', [it.quantity, it.productId]);
          }
        }
        await client.query('COMMIT');
        const producerMsg = { orderId: data.orderId, success: ok, reservedItems: items, reason: ok? null:'insufficient' };
        await producer.send({ topic: 'inventory.result', messages: [{ value: JSON.stringify(producerMsg) }] });
      } catch(e){
        await client.query('ROLLBACK');
        console.error('reserve error', e.message);
      } finally { client.release(); }
    } catch(e){ console.error('msg parse err', e.message); }
  }
});
app.listen(process.env.PORT||4002, ()=>console.log('Catalog running', process.env.PORT||4002));
