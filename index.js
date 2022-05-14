const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port =process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

//doctor-user 6*SdY-8Z7$ZNu62



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mvg9q.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
      await client.connect();
      const scheduleCollections = client.db('Doctors-Schedule').collection('schedules')
    try{
    app.get('/schelules', async(req, res) => {
      const query = {};
      const cursor = scheduleCollections.find(query);
      const schedule = await cursor.toArray();
      res.send(schedule);
    })


    }
    finally{

    }

} 
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Doctors Portal')
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})