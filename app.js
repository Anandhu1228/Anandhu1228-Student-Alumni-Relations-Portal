var createError = require('http-errors');
var express = require('express');
const cors = require('cors');
const fs = require('fs');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('express-handlebars');
const hbsHelpers = require('handlebars-helpers')();
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var superadminRouter = require('./routes/superadmin');
var fileUpload = require('express-fileupload');
const {connectToDb, getDb} = require('./config/connection');
const collection = require('./config/collections');
var session = require('express-session');
const http = require('http');
const { Server } = require("socket.io");
const schedule = require('node-schedule');
const { exec } = require('child_process');
const { trainDoc2VecInternshipModel,trainDoc2VecJobModel } = require('./helpers/user-helpers');
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};


const updateAlumniStatus = async (users) => {
  const currentDate = new Date();
  const alumniThresholdYears = 4;
  const alumniThresholdMonths = 6;

  try {
    const bulkUpdateOperations = users.map((user) => {
      if (user.AdmissionYear) {
        const admissionYear = parseInt(user.AdmissionYear, 10);
        const graduationYear = admissionYear + alumniThresholdYears;
        const graduationMonth = user.AdmissionMonth ? parseInt(user.AdmissionMonth, 10) : 1; // Default to January if month is not specified

        const isGraduated =
          currentDate.getFullYear() > graduationYear ||
          (currentDate.getFullYear() === graduationYear &&
            currentDate.getMonth() >= graduationMonth + alumniThresholdMonths - 1);

        if (isGraduated) {
          return {
            updateOne: {
              filter: { _id: user._id },
              update: { $set: { Status: 'Alumni' } },
            },
          };
        }
      }
      return null;
    });

    const filteredBulkOperations = bulkUpdateOperations.filter((op) => op !== null);

    if (filteredBulkOperations.length > 0) {
      await getDb().collection(collection.USER_COLLECTION).bulkWrite(filteredBulkOperations);
    }
  } catch (error) {
    console.error('Error updating user statuses:', error);
  }
};

const processUsersBatch = async (users, batchSize) => {
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await updateAlumniStatus(batch);
  }
};

schedule.scheduleJob('0 0 */15 * *', async () => {
  try {
    const users = await getDb()
      .collection(collection.USER_COLLECTION)
      .find({ Status: 'Student' })
      .toArray();

    const batchSize = 30;
    await processUsersBatch(users, batchSize);

    console.log('User statuses updated.');
  } catch (error) {
    console.error('Error fetching or updating users:', error);
  }
});


schedule.scheduleJob('0 0 * * 0', async () => {
  console.log('Data preprocessing started...');
  try {
    await trainDoc2VecInternshipModel();
    console.log('Data preprocessing completed.');
    
    execDoc2VecInternshipPythonScript();
  } catch (error) {
    console.error('Error in data preprocessing:', error);
  }
});


function execDoc2VecInternshipPythonScript() {
  console.log("ENTERED INTERNSHIP PYTHON SCRIPT IN APP.JS")
  const pythonScriptPath = path.join(__dirname, 'machine models', 'internship_reccomendation.py');
  exec(`python "${pythonScriptPath}"`, (error, stdout, stderr) => {
    console.log("ENTERED INSIDE INTERSHIP RECOMENDATION PYTHON EXECUTION SCRIPT")
    if (error) {
      console.error('Error executing Python script:', error);
      return;
    }
    console.log('Python script executed successfully.');
    if (stdout) console.log('Python script stdout:', stdout);
    if (stderr) console.error('Python script stderr:', stderr);
  });
};

schedule.scheduleJob('0 0 * * 5', async () => {
  console.log('Data preprocessing started...');
  try {
    await trainDoc2VecJobModel();
    console.log('Data preprocessing completed.');
    
    execDoc2VecJobPythonScript();
  } catch (error) {
    console.error('Error in data preprocessing:', error);
  }
});

function execDoc2VecJobPythonScript() {
  console.log("ENTERED JOB PYTHON SCRIPT IN APP.JS")
  const pythonScriptPath = path.join(__dirname, 'machine models', 'job_reccomendation.py');
  exec(`python "${pythonScriptPath}"`, (error, stdout, stderr) => {
    console.log("ENTERED INSIDE JOB RECOMENDATION PYTHON EXECUTION SCRIPT")
    if (error) {
      console.error('Error executing Python script:', error);
      return;
    }
    console.log('Python script executed successfully.');
    if (stdout) console.log('Python script stdout:', stdout);
    if (stderr) console.error('Python script stderr:', stderr);
  });
};




var app = express();
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (client) => {
  console.log('a new user has connected', client.id);

  client.on('disconnect', () => {
      console.log('user disconnected', client.id);
  });

  client.on('joinRoom', (room) => {
    console.log('Joined Room',room, "by client ", client.id);
    client.join(room);
  });

  client.on('leaveRoom', (room) => {
    client.leave(room);
  });


  client.on('chatMessage', (data) => {
      io.emit('chatMessage', data);
  });

  //client.on('chatMultimediaMessage', (data) => {
    //console.log("Send Multimedia Message :", data);
      //io.emit('chatMultimediaMessage', data);
  //});

  client.on('deleteMessage', (data) => {
    io.emit('deleteMessage', data);
  });

  client.on('chatOneMessage', (data) => {
    io.to(data.Room_Id).emit('chatOneMessage', data);
  });

  //client.on('chatOneMultimediaMessage', (data) => {
    //io.to(data.Room_Id).emit('chatOneMultimediaMessage', data);
  //});

  client.on('deleteOneMessage', (data) => {
    io.to(data.Room_Id).emit('deleteOneMessage', data);
  });

});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine({
  
  extname:'hbs',
  defaultLayout:'layout',
  layoutsDir:__dirname+'/views/layout/',
  partialsDir:__dirname+'/views/partials/',
  helpers: {
    ...hbsHelpers,
    formatDate: formatDate 
  },
}));
app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(express.static(path.resolve("./public")));
app.use(session({secret:"Key",cookie:{maxAge: 86400000 * 365 * 10}}))

let db;
connectToDb((err) => {
    if(err){
       console.log("connection error"+err)
    }else{
      db=getDb()
    }
})

server.listen(3001,()=> console.log('server started at port 3001'))

app.use('/', usersRouter);
app.use('/admin', adminRouter);
app.use('/superadmin',superadminRouter)

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
