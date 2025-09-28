import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateUploadURL } from './s3.js'

dotenv.config();
const app = express();

// Add CORS middleware before your routes
app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.static('front'))

app.get('/s3Url', async (req, res) => {
  const url = await generateUploadURL()
  res.send({url})
})

app.listen(8080, () => console.log("listening on port 8080"))