/*
Website developed by Anandhu Mohan for the Alumni Relations Cell of a college. 
Features include:
  - Job portal, Internship portal, Mentorship portal
  - Search functionality for users, students, and alumni
  - Group chat and private individual chat systems
  - Notification system and user profiles for each member
  - Admin panel to control the entire site, handle issues, and manage inquiries
  - Superadmin overseeing the activities of admins and users
  - Maintainer responsible for the main page content and styling, visible to users and external visitors
  - Advanced machine learning features that sort jobs and internships based on user profile preferences
  - Periodic email notifications and security enhancements
*/

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
var maintainRouter = require('./routes/maintainer');
var superadminRouter = require('./routes/superadmin');
var fileUpload = require('express-fileupload');
const {connectToDb, getDb} = require('./config/connection');
const collection = require('./config/collections');
const websocketConfig = require('./config/websocket');
var session = require('express-session');
const http = require('http');
const { Server } = require("socket.io");
const schedule = require('node-schedule');
const { exec } = require('child_process');
const { trainDoc2VecInternshipModel, trainDoc2VecJobModel,
  getAllMailOfAlumniJobMorethanThirty, getAllMailOfAlumniCheckAccessButton,
  getAllMailOfAlumniCheckProfileLong, getAllKindOfMail , 
  checkThirtyDayPollInitiationPolicy
} = require('./helpers/user-helpers');
const { getAllMailOfAdminCheckAccessButton, 
  checkThirtyDayBroadPollInitiationPolicy,
  getAllMailAdminAlumniBlockCheckButton } = require('./helpers/admin-helpers');
// const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({
//   service: 'gmail', // You can use 'gmail', 'yahoo', 'hotmail', etc.
//   auth: {
//     user: "anandhueducateanddevelop@gmail.com",
//     pass: "xstd vcsi mzxy wtjf"
//   }
// });
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

const splitArrayInHalf = (array) => {
  const mid = Math.ceil(array.length / 2);
  return [array.slice(0, mid), array.slice(mid)];
};

// Function to determine if it's the second saturday of the month
const isSecondSaturday = (date) => {
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay(); // 6 = Saturday
  // Check if it's a Saturday and within the 8th to 14th range
  return dayOfWeek === 6 && dayOfMonth >= 8 && dayOfMonth <= 14;
};

// Function to determine if it's the second Sunday of the month
const isSecondSunday = (date) => {
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday
  // Check if it's a Sunday and within the 8th to 14th range
  return dayOfWeek === 0 && dayOfMonth >= 8 && dayOfMonth <= 14;
};

// const sendEmails = async (mails, content, subject) => {
//   for (const email of mails) {
//     const mailOptions = {
//       from: 'anandhueducateanddevelop@gmail.com',
//       to: email,
//       subject,
//       html: content
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error('Error sending email:', error);
//       } else {
//         console.log('Email sent:', info.response);
//       }
//     });
//   }
// };

// const mailOptions = {
//   from: 'anandhueducateanddevelop@gmail.com',
//   to: email,
//   subject: 'Remainder about privacy',
//   html: Content_send_a
// };

// transporter.sendMail(mailOptions, (error, info) => {
//   if (error) {
//     console.error('Error sending email:', error);
//   } else {
//     console.log('Email sent:', info.response);
//   }
// });


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

// schedule.scheduleJob('0 2 */15 * *', async () => {  // FIRST AND 16TH OF EVERY MONTH 2 AM
//   try {
//     const users = await getDb()
//       .collection(collection.USER_COLLECTION)
//       .find({ Status: 'Student' })
//       .toArray();

//     const batchSize = 30;
//     await processUsersBatch(users, batchSize);

//     console.log('User statuses updated.');
//   } catch (error) {
//     console.error('Error fetching or updating users:', error);
//   }
// });

schedule.scheduleJob('58 1 1,16 * *', async () => {  // Runs on the 1st and 16th of every month at 1:58 AM UTC
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.

  if (dayOfWeek === 2) { // If today is Tuesday
    // Reschedule to Wednesday 2 AM UTC
    const nextDay = new Date(today);
    nextDay.setUTCDate(today.getUTCDate() + (3 - dayOfWeek)); // Move to Wednesday
    nextDay.setUTCHours(2, 0, 0, 0); // Set time to 2 AM UTC

    schedule.scheduleJob(nextDay, async () => {
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

    console.log('Job rescheduled to Wednesday at 2 AM UTC.');
  } else {
    // Regular job execution
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
  }
});

schedule.scheduleJob('30 3 * * 1', async () => { // 3:30 AM EVERY MONDAY
  try {
    console.log('Admin accessbutton checking started...');
    await getAllMailOfAdminCheckAccessButton();  // Ensure this function is defined elsewhere
    console.log('Admin accessbutton checking completed.');
    console.log('Admin block release checking started...');
    await getAllMailAdminAlumniBlockCheckButton()
    console.log('Admin block release checking completed.');
    console.log("poll expiry check in groupchat started")
    await checkThirtyDayPollInitiationPolicy()
    console.log("poll expiry check in groupchat finished")
    console.log("poll expiry check in broadcast started")
    await checkThirtyDayBroadPollInitiationPolicy()
    console.log("poll expiry check in broadcast finished")
  } catch (error) {
    console.error('Error in admin accessbutton checking:', error);
  }
});

schedule.scheduleJob('30 3 * * 2', async () => { // 3:30 AM EVERY TUESDAY
  console.log('Internship data preprocessing started...');
  try {
    await trainDoc2VecInternshipModel();  // Ensure this function is defined elsewhere
    console.log('Internship data preprocessing completed.');
  } catch (error) {
    console.error('Error in internship data preprocessing:', error);
  }
});

schedule.scheduleJob('0 3 * * 3', async () => { // 3 AM EVERY WEDNESDAY
  console.log('Data training for internship schedule started...');
  try {    
    execDoc2VecInternshipPythonScript();
  } catch (error) {
    console.error('Error in internship training :', error);
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
    console.log('Internship python script executed successfully.');
    if (stdout) console.log('Python script stdout:', stdout);
    if (stderr) console.error('Python script stderr:', stderr);
  });
};

schedule.scheduleJob('0 2 * * 2', async () => {  //  2 AM EVERY TUESDAY
  console.log('Job data preprocessing started...');
  try {
    await trainDoc2VecJobModel();
    console.log('Job data preprocessing completed.');
  } catch (error) {
    console.error('Error in job data preprocessing:', error);
  }
});

schedule.scheduleJob('0 3 * * 4', async () => {  // 3 AM EVERY THERSDAY
  console.log('Data training for job schedule started...');
  try {
    execDoc2VecJobPythonScript();
  } catch (error) {
    console.error('Error in job data preprocessing:', error);
  }
});

function execDoc2VecJobPythonScript() {
  console.log("ENTERED JOB PYTHON SCRIPT IN APP.JS");
  const pythonScriptPath = path.join(__dirname, 'machine models', 'job_reccomendation.py');
  exec(`python "${pythonScriptPath}"`, (error, stdout, stderr) => {
    console.log("ENTERED INSIDE JOB RECOMMENDATION PYTHON EXECUTION SCRIPT");
    if (error) {
      console.error('Error executing job python script:', error);
      return;
    }
    console.log('Job python script executed successfully.');
    if (stdout) console.log('Python script stdout:', stdout);
    if (stderr) console.error('Python script stderr:', stderr);
  });
} 


// Schedule job for the second Saturday at 3 AM
schedule.scheduleJob('0 3 8-14 * 6', async () => {
  const now = new Date();
  if (isSecondSaturday(now)) {
    try {
      console.log("STARTING WORK OF SECOND SATURDAY");
      const u_mails = await getAllMailOfAlumniCheckProfileLong();
      const j_mails = await getAllMailOfAlumniJobMorethanThirty();
      const a_mails = await getAllMailOfAlumniCheckAccessButton();

      const { u_mail, j_mail, a_mail } = await getAllKindOfMail();

      const [u_mail_first_half, u_mail_second_half] = splitArrayInHalf(u_mail);
      const [j_mail_first_half, j_mail_second_half] = splitArrayInHalf(j_mail);
      const [a_mail_first_half, a_mail_second_half] = splitArrayInHalf(a_mail);

      // const content_u = `<p>You hadn't visited alumni students portal since 30 days or more.</p><p>Visit the alumni relations cell website for more.</p>`;
      // const content_j = `<p>Your posted job resides in alumni students portal for 30 days or more. Kindly remove if the application was closed</p><p>Visit the alumni relations cell website for more.</p>`;
      // const content_a = `<p>Your consent to view deleted private messages for admin was turned off.</p><p>Visit the alumni relations cell website to confirm and more.</p>`;

      //await sendEmails(u_mail_first_half, content_u, 'Visit student alumni relations portal');
      console.log("SUCCESSFULLY SENDED U MAIL SYSTEM")
      //await sendEmails(j_mail_first_half, content_j, 'Reminder about posted jobs');
      console.log("SUCCESSFULLY SENDED J MAIL SYSTEM")
      //await sendEmails(a_mail_first_half, content_a, 'Reminder about privacy');
      console.log("SUCCESSFULLY SENDED A MAIL SYSTEM")
    } catch (error) {
      console.error('Error in second Saturday job:', error);
    }
  }
});

// Schedule job for the second Sunday at 3 AM
schedule.scheduleJob('0 3 15-21 * 0', async () => {
  const now = new Date();
  if (isSecondSunday(now)) {
    try {
      console.log("STARTING WORK OF SECOND SUNDAY");
      const { u_mail, j_mail, a_mail } = await getAllKindOfMail();

      const [, u_mail_second_half] = splitArrayInHalf(u_mail);
      const [, j_mail_second_half] = splitArrayInHalf(j_mail);
      const [, a_mail_second_half] = splitArrayInHalf(a_mail);

      // const content_u = `<p>You hadn't visited alumni students portal since 30 days or more.</p><p>Visit the alumni relations cell website for more.</p>`;
      // const content_j = `<p>Your posted job resides in alumni students portal for 30 days or more. Kindly remove if the application was closed</p><p>Visit the alumni relations cell website for more.</p>`;
      // const content_a = `<p>Your consent to view deleted private messages for admin was turned off.</p><p>Visit the alumni relations cell website to confirm and more.</p>`;

      // await sendEmails(u_mail_second_half, content_u, 'Visit student alumni relations portal');
      console.log("SUCCESSFULLY SENDED U MAIL SYSTEM")
      // await sendEmails(j_mail_second_half, content_j, 'Reminder about posted jobs');
      console.log("SUCCESSFULLY SENDED J MAIL SYSTEM")
      // await sendEmails(a_mail_second_half, content_a, 'Reminder about privacy');
      console.log("SUCCESSFULLY SENDED A MAIL SYSTEM")
    } catch (error) {
      console.error('Error in second Sunday job:', error);
    }
  }
});


const app = express();
console.log("node server started at port 3000")

// app.get('/websocket-config', (req, res) => {
//   res.json({ socketBaseURL: websocketConfig.socketBaseURL });
// });

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

  client.on('chatMessageEmoji', (data) => {
    io.emit('chatMessageEmoji', data);
  });

  client.on('chatMultimediaMessage', (data) => {
    io.emit('chatMultimediaMessage', data);
  });

  client.on('deleteMessage', (data) => {
    io.emit('deleteMessage', data);
  });

  client.on('chatMessagepin', (data) => {
    io.emit('chatMessagepin', data);
  });

  client.on('chatMessageUnpin', () => {
    io.emit('chatMessageUnpin', );
  });

  client.on('chatOneMessage', (data) => {
    io.to(data.Room_Id).emit('chatOneMessage', data);
  });

  client.on('chatOneMultimediaMessage', (data) => {
    io.to(data.Room_Id).emit('chatOneMultimediaMessage', data);
  });

  client.on('chatMessageEmojiOne', (data) => {
    io.to(data.Room_Id).emit('chatMessageEmojiOne', data);
  });

  client.on('deleteOneMessage', (data) => {
    io.to(data.Room_Id).emit('deleteOneMessage', data);
  });

  client.on('chatOneAdminMessage', (data) => {
    io.to(data.Room_Id).emit('chatOneAdminMessage', data);
  });

  client.on('chatOneMultimediaAdminMessage', (data) => {
    io.to(data.Room_Id).emit('chatOneMultimediaAdminMessage', data);
  });

  client.on('chatMessageEmojiAdminOne', (data) => {
    io.to(data.Room_Id).emit('chatMessageEmojiAdminOne', data);
  });

  /*client.on('deleteOneAdminMessage', (data) => {
    io.to(data.Room_Id).emit('deleteOneAdminMessage', data);
  });*/

  client.on('chatAdminBroadMessage', (data) => {
    io.emit('chatAdminBroadMessage', data);
  });

  client.on('chatAdminBroadGroupMessage', (data) => {
    io.emit('chatAdminBroadGroupMessage', data);
  });

  client.on('deleteAdminBroadMessage', (data) => {
    io.emit('deleteAdminBroadMessage', data);
  });

  client.on('chatAdminBroadpin', (data) => {
    io.emit('chatAdminBroadpin', data);
  });

  client.on('chatAdminBroadUnpin', () => {
    io.emit('chatAdminBroadUnpin', );
  });
  
  client.on('chatMessageAdminBroadEmoji', (data) => {
    io.emit('chatMessageAdminBroadEmoji', data);
  });

  client.on('deletePost', (data) => {
    io.emit('deletePost', data);
  });

  client.on('editPoSt', (data) => {
    io.emit('editPoSt', data);
  });

  client.on('deleteCOMMENT', (data) => {
    io.emit('deleteCOMMENT', data);
  });

  client.on('deleteCOMMENTreply', (data) => {
    io.emit('deleteCOMMENTreply', data);
  });

  client.on('addPostLike', (data) => {
    io.emit('addPostLike', data);
  });

  client.on('addCOMMENTLike', (data) => {
    io.emit('addCOMMENTLike', data);
  });

  client.on('addCOMMENTREPLYLike', (data) => {
    io.emit('addCOMMENTREPLYLike', data);
  });

  client.on('addcommentpost', (data) => {
    io.emit('addcommentpost', data);
  });

  client.on('addcommentreplypost', (data) => {
    io.emit('addcommentreplypost', data);
  });

  client.on('addcommenteditpost', (data) => {
    io.emit('addcommenteditpost', data);
  });

  client.on('addcommentreplyeditpost', (data) => {
    io.emit('addcommentreplyeditpost', data);
  });

  client.on('deleteMentor', (data) => {
    io.emit('deleteMentor', data);
  });

  client.on('addMentorEmoji', (data) => {
    io.emit('addMentorEmoji', data);
  });

  client.on('addMentorReplyEmoji', (data) => {
    io.emit('addMentorReplyEmoji', data);
  });

  client.on('addMentor', (data) => {
    io.emit('addMentor', data);
  });

  client.on('addMentorReply', (data) => {
    io.emit('addMentorReply', data);
  });

  client.on('deleteMentorReply', (data) => {
    io.emit('deleteMentorReply', data);
  });

  client.on('editMentor', (data) => {
    io.emit('editMentor', data);
  });

  client.on('editMentorReply', (data) => {
    io.emit('editMentorReply', data);
  });

  client.on('deletePoll', () => {
    io.emit('deletePoll');
  });

  client.on('deleteBroadPoll', () => {
    io.emit('deleteBroadPoll');
  });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    ...hbsHelpers,
    formatDate: formatDate,
    json: function (context) {
      return JSON.stringify(context);
    },
    ifEqual: function (arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    },
    ifNotEqual: function (arg1, arg2, options) {
      return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
    },
    unless: function (arg, options) {
      return (!arg) ? options.fn(this) : options.inverse(this);
    },
    compare: function (arg1, operator, arg2, options) {
      switch (operator) {
        case '==':
          return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        case '===':
          return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        case '!=':
          return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
        case '!==':
          return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
        case '<':
          return (arg1 < arg2) ? options.fn(this) : options.inverse(this);
        case '<=':
          return (arg1 <= arg2) ? options.fn(this) : options.inverse(this);
        case '>':
          return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
        case '>=':
          return (arg1 >= arg2) ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    },
    getLastReaction: function (reactions) {
      if (reactions && reactions.length > 0) {
        return reactions[reactions.length - 1].emoji;
      }
      return '';
    },
    arrayCount: function(array) {
      return Array.isArray(array) ? array.length : 0;
    },
    includes: function(array, value) {
      return array && array.includes(value);
    }
  }
}));

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public'), { maxAge: 30 * 24 * 60 * 60 * 1000 }));  // 30 days
app.use(fileUpload());
app.use(express.static(path.resolve("./public")));
//app.use(session({secret:"Key",cookie:{ maxAge: 86400000 * 7 }}))  // {maxAge: 86400000 * 365 * 10}
app.use(session({
  secret: "Key",
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  cookie: { 
    maxAge: 86400000 * 7 // 7 days
  }
}));

let db;
connectToDb((err) => {
    if(err){
      console.log("connection error"+err)
    }else{
      console.log('connected to mongodb server at port 27017')
      db=getDb()
    }
})

server.listen(3001,()=> console.log('websocket server started at port 3001'))

app.use('/', usersRouter);
app.use('/admin', adminRouter);
app.use('/superadmin',superadminRouter);
app.use('/maintainer',maintainRouter);


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
