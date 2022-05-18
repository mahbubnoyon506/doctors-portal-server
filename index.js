const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mvg9q.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function jwtVerify(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Access forbidden' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {

  try {
    await client.connect();
    const scheduleCollections = client.db('Doctors-Schedule').collection('schedules');
    const bookingCollections = client.db('Doctors-Schedule').collection('booking');
    const userCollections = client.db('Doctors-Schedule').collection('user');
    const doctorCollections = client.db('Doctors-Schedule').collection('doctors');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollections.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next()
      }
      else {
        return res.status(403).send("Forbidden")
      }
    }

    app.get('/schedules', async (req, res) => {
      const query = {};
      const cursor = scheduleCollections.find(query).project({ name: 1 });
      const schedule = await cursor.toArray();
      res.send(schedule);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const query = { patient: booking.patient, treatment: booking.treatment, date: booking.date };
      const exists = await bookingCollections.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingCollections.insertOne(booking);
      res.send(result);
    })

    app.get('/booking', jwtVerify, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollections.find().toArray();
        return res.send(bookings)
      }
      else {
        return res.status(403).send({ message: 'Access forbidden' })
      }
    })

    //manage treatment
    app.get('/available', async (req, res) => {
      const date = req.query.date;
      //1
      const services = await scheduleCollections.find().toArray();
      //2
      const query = { date: date };
      const bookings = await bookingCollections.find().toArray();
      //3
      services.forEach(service => {
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        const booked = serviceBookings.map(book => book.slot);
        const available = service.slots.filter(slot => !booked.includes(slot))
        service.slots = available
        // service.booked = booked
      })
      res.send(services)
    })

    //get users
    app.get('/users', jwtVerify, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result)
    })

    // user update 
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user
      };
      const result = await userCollections.updateOne(query, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: '1h'
      });
      res.send({ result, token });
    })

    // admin make
    app.put('/user/admin/:email', jwtVerify, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updateDoc = {
        $set: { role: 'admin' }
      };
      const result = await userCollections.updateOne(query, updateDoc);
      return res.send(result);
    })

    //check admin 
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollections.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    //doctors
    app.post('/doctors', jwtVerify, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollections.insertOne(doctor);
      res.send(result);
    })
    
    app.get('/doctors', async(req, res) => {
      const doctors = await doctorCollections.find().toArray();
      res.send(doctors)
    })

    app.delete('/doctors/:email', jwtVerify, verifyAdmin, async(req, res) => {
      const email = req.params.email;
      const filter= {email: email};
      const result = await doctorCollections.deleteOne(filter);
      res.send(result)
    })

  }
  finally {

  }

}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Doctors Portal')
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})