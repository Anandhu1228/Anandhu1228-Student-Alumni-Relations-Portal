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

var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const userHelpers = require('../helpers/user-helpers');
const session = require('express-session');
const xlsx = require('xlsx');
const { log } = require('handlebars');
const { spawnSync } = require('child_process');
const { response, use } = require('../app');
const { Console } = require('console');
const sharp = require('sharp');
const { Worker } = require('worker_threads');
const { getBasicProfile } = require('../helpers/admin-helpers');
const verifyLogin = (req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
    return;
  }else{
    res.redirect('/login')
    return;
  }
}

// const nodemailer = require('nodemailer');
// const transporter = nodemailer.createTransport({
//   service: 'gmail', // You can use 'gmail', 'yahoo', 'hotmail', etc.
//   auth: {
//     user: "anandhueducateanddevelop@gmail.com",
//     pass: "xstd vcsi mzxy wtjf"
//   }
// });

const crypto = require('crypto');
const adminHelpers = require('../helpers/admin-helpers');
function generateOTP() {
  return crypto.randomBytes(3).toString('hex'); // Generate a 6-character OTP
}
/*function generateOTP() {
  const otp = crypto.randomInt(0, 1000000);
  return otp.toString().padStart(6, '0');
}*/

const isDifferentDay = (groupMessageInitiation) => {
  const currentTime = new Date();
  const initiationTime = new Date(groupMessageInitiation);

  // Compare year, month, and date
  return currentTime.getFullYear() !== initiationTime.getFullYear() ||
    currentTime.getMonth() !== initiationTime.getMonth() ||
    currentTime.getDate() !== initiationTime.getDate();
};


router.get('/', async function (req, res, next) {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let uber = req.session.user.Name;
        const userId = req.session.user._id;

        //   ALL NOTIFICATION COUNT BELOW

        const timestamp = new Date();

        let postcount = await userHelpers.getAllNewOtherpostUpdateNotification(userId, timestamp);
        let post_notif = postcount > 0 ? true : false;

        let existingCommentlikecount = await userHelpers.getAllNewOwnpostLikeNotification(userId);
        let currentCommentlikecount = await userHelpers.getAllNewCurrentOwnpostLikeNotification(userId);

        // Extracting likeCount and commentCount separately
        let existinglikecount = existingCommentlikecount.map(item => ({
          _id: item._id,
          likeCount: item.likeCount
        }));

        let existingCommentcount = existingCommentlikecount.map(item => ({
          _id: item._id,
          commentCount: item.commentCount
        }));

        let currentlikecount = currentCommentlikecount.map(item => ({
          _id: item._id,
          likeCount: item.likeCount
        }));

        let currentCommentcount = currentCommentlikecount.map(item => ({
          _id: item._id,
          commentCount: item.commentCount
        }));

        let increasedIds = [];
        existinglikecount.forEach(existingPost => {
          const currentPost = currentlikecount.find(post => post._id === existingPost._id);
          if (currentPost && currentPost.likeCount > existingPost.likeCount) {
            const difference = currentPost.likeCount - existingPost.likeCount;
              increasedIds.push({
                _id: existingPost._id,
                difference: difference
            });
          }
        });
        let like_notify_number = increasedIds.length;
        let like_notif = like_notify_number > 0 ? true : false;
        let increasedCommenterIds = [];
        existingCommentcount.forEach(existingPost => {
            const currentPost = currentCommentcount.find(post => post._id === existingPost._id);
            if (currentPost && currentPost.commentCount > existingPost.commentCount) {
                const difference = currentPost.commentCount - existingPost.commentCount;
                increasedCommenterIds.push({
                    _id: existingPost._id,
                    difference: difference
                });
            }
        });
        let Comment_notify_number = increasedCommenterIds.length;
        let Comment_notif = Comment_notify_number > 0 ? true : false;

        let existing_groupchat_count = await userHelpers.getExistingGroupChatCount(userId);
        let current_groupchat_count = await userHelpers.getAllNewGroupchatNotification();
        let groupchatcount = (current_groupchat_count - existing_groupchat_count);
        let groupchat_notif = groupchatcount > 0 ? true : false;

        let interncount = 0;
        if (req.session.user.Status == "Alumni") {
          interncount = await userHelpers.getAllNewInternsNotification(userId, timestamp);
        }
        let intern_notif = interncount > 0 ? true : false;

        let mentorcount = await userHelpers.getAllNewMentorNotification(userId, timestamp);
        let mentor_notif = mentorcount > 0 ? true : false;

        let jobcount = await userHelpers.getAllNewJobNotification(userId, timestamp);
        let job_notif = jobcount > 0 ? true : false;

        let upassCountDiffData = await userHelpers.getUpassDiffCount(userId);
        let upassCountDiff = upassCountDiffData.difference;
        let upassCountStatus = upassCountDiffData.upassConfirm;
        let upass_diff = (upassCountDiff != 0) && (upassCountStatus != true);

        let adminViewCheckStat = await userHelpers.getAdminViewDelMessStatCount(userId);
        let adminViewCheckStatLength = adminViewCheckStat.length;
        let adminViewConsentPending = adminViewCheckStatLength > 0 ? true : null;

        let current_rec_mess = await userHelpers.getAllReceivedMessage(userId);
        let existing_rec_mess = await userHelpers.getAllReceivedExistingMessage(userId);
        let currentSum = current_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let existingSum = existing_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let total_new_mess = currentSum - existingSum; // TOTAL NUMBER OF NEW MESSAGES
        let new_mess_notif = total_new_mess != 0 ? true : false;
        let newmessages = []; // NEW MESSENGERS ID
        current_rec_mess.forEach(current => {
          let existing = existing_rec_mess.find(existing => existing.Reciever_Id === current.Reciever_Id);
          if (!existing || current.count > existing.count) {
            newmessages.push(current.Reciever_Id);
          }
        });
        let mess_count_notify_number = newmessages.length; // NUMBER OF NEW MESSENGERS
        let new_messenger_count_notif = mess_count_notify_number > 0 ? true : false;

        let current_Admin_rec_mess = await userHelpers.getAllAdminReceivedMessage(userId);
        let existing_Admin_rec_mess = await userHelpers.getAllAdminReceivedExistingMessage(userId);
        let currentAdminSum = current_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let existingAdminSum = existing_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let total_new_Admin_mess = currentAdminSum - existingAdminSum;
        let new_admin_mess_notif = total_new_Admin_mess > 0 ? true : false;

        let last_broad_time = await userHelpers.getLastBroadTime();
        let last_broad_entry_time = await userHelpers.getLastBroadEntryTime(userId);
        let admin_broadcast = (last_broad_time !== null && (last_broad_entry_time === null || last_broad_entry_time < last_broad_time)) ? 1 : 0;
        let new_admin_broad_notif = admin_broadcast != 0 ? true : false;

        let existing_view_profile_viewers = await userHelpers.getExistingViewViewerCount(userId);
        let current_view_profile_viewers = await userHelpers.getCurrentViewViewerCount(userId);
        let new_view_user_count = current_view_profile_viewers - existing_view_profile_viewers;
        let new_view_notif = new_view_user_count > 0 ? true : false;

        let myExistingMentorQuestions = await userHelpers.getSenderMentors(userId);
        let differenceMentorQuestionReply = await userHelpers.getdifferenceMentorQuestionReply(myExistingMentorQuestions);
        let newReplieObtainedQuestions = differenceMentorQuestionReply.result;
        let mentorQuestionNumbers = newReplieObtainedQuestions.length;
        let totalNewRepliesMentors = differenceMentorQuestionReply.differentSum;
        let new_mentor_reply_notif = totalNewRepliesMentors > 0 ? true : false;

        let check_for_reply = await userHelpers.getDifferenceInCommentLikeReply(userId)
        let ONE_REPLY = check_for_reply.onereply;
        let MANY_REPLY = check_for_reply.manyreply;
        let MANY_LIKE = check_for_reply.manylike;
        let DIFFERENCE = check_for_reply.differences;
        let Total_Difference_Post_Reply_Like = DIFFERENCE.filter(diff => diff.totalReplyDiff > 0).length;
        if(MANY_LIKE){
          Total_Difference_Post_Reply_Like = Total_Difference_Post_Reply_Like + 1;
        }

        await userHelpers.storeNotification1228(
          userId,
          post_notif, postcount,
          like_notif, increasedIds,
          like_notify_number, groupchat_notif,
          groupchatcount, interncount,
          intern_notif, mentorcount,
          mentor_notif, jobcount,
          job_notif, total_new_mess,
          new_mess_notif, newmessages,
          mess_count_notify_number,
          new_messenger_count_notif,
          total_new_Admin_mess,
          new_admin_mess_notif,
          admin_broadcast,
          new_admin_broad_notif,
          new_view_user_count,
          new_view_notif, upass_diff,
          adminViewCheckStat,
          adminViewCheckStatLength,
          adminViewConsentPending,
          newReplieObtainedQuestions,
          mentorQuestionNumbers,
          new_mentor_reply_notif,
          Comment_notify_number, 
          Comment_notif, increasedCommenterIds,
          DIFFERENCE, ONE_REPLY, MANY_REPLY, MANY_LIKE
        );

        let total_notify_number = (mess_count_notify_number + jobcount + mentorcount
          + interncount + groupchatcount + like_notify_number + postcount +
          total_new_Admin_mess + admin_broadcast + new_view_user_count + upassCountDiff
          + adminViewCheckStatLength + totalNewRepliesMentors + Total_Difference_Post_Reply_Like);

        let total_message = (total_new_mess + admin_broadcast);

        req.session.total_notify_number = total_notify_number;
        req.session.total_message = total_message;
        req.session.groupchatcount = groupchatcount;

        let loginCount = await userHelpers.countLogins(userId);

        let showUpdateLocPassEmpPop = false;
        let showExperiencePop = false;
        let showDomainPop = false;

        if (loginCount % 3 === 0) {
          let updatePush = await userHelpers.getUpdateProfilePushSettings(userId);
          if ((!updatePush.location || !updatePush.passoutYear || !updatePush.empStatus) && (!req.session.user.updatePushFirst)) {
            showUpdateLocPassEmpPop = true;
            req.session.user.updatePushFirst = true
          }
        }

        if (loginCount % 5 === 0) {
          let updateExperience = await userHelpers.getUpdateProfilePushInProfileExperienceSettings(userId);
          if ((!updateExperience.experience) && (!req.session.user.updatePushFirst)) {
            showExperiencePop = true;
            req.session.user.updatePushFirst = true
          }
        }

        if (loginCount % 4 === 0) {
          let updateDomain = await userHelpers.getUpdateProfilePushInProfileDomainSettings(userId);
          if ((!updateDomain.domain) && (!req.session.user.updatePushFirst)) {
            showDomainPop = true;
            req.session.user.updatePushFirst = true
          }
        }

        res.render('user/view-page',
          {
            showHeader1: true,
            showHeader2: true,
            inHome: true, uber,
            total_notify_number,
            total_message, groupchatcount,
            showUpdateLocPassEmpPop,
            showDomainPop, showExperiencePop,
          });
          return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.render('user/view-page', { showHeader1: true, inHome: true });
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.get('/login', (req, res, next) => {
  try {
    if (req.session.userLoggedIn) {
      res.redirect('/');
      return;
    } else {
      res.render('user/login', { "LoginERROR": req.session.userLoginErr });
      req.session.userLoginErr = false;
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/login', async (req, res) => {
  try {

    req.body.Email = req.body.Email.trim().toLowerCase();

    const checkPortalAccess = await userHelpers.getPortalAccess(req.body.Email)
    if(checkPortalAccess){

      const response = await userHelpers.doLogin(req.body);
      if (response.status) {
        req.session.userLoggedIn = true;
        req.session.user = response.user;
        await userHelpers.insertloggedINTime1228(req.session.user._id);
        res.redirect('/');
        return;
      } else if (response.locked) {
        req.session.userLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
        res.redirect('/login');
        return;
      } else {
        req.session.userLoginErr = response.attemptsLeft !== undefined
          ? `Invalid Username or Password. ${response.attemptsLeft} attempts left.`
          : "Invalid Username or Password";
        res.redirect('/login');
        return;
      }

    } else {
      res.render("user/restricted_user",{portalEntryDenied: true})
      return
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//   MAIL SERVICE INTEGRATED FOR BELOW 3 ROUTES
/*router.get('/login', (req, res, next) => {
  try {
    if (req.session.userLoggedIn) {
      res.redirect('/');
      return;
    } else {
      res.render('user/login', { "LoginERROR": req.session.userLoginErr });
      req.session.userLoginErr = false;
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


//     REFINED C_MARK
//      SECURITY CHECK
router.post('/login', async (req, res) => {
  try {

    // Check if OTP resend is requested
    if (req.body.resendOtp) {
      let otpRequests_time = await userHelpers.getOtpRequest(req.body.senCurreSponDer);

      let otpRequests = otpRequests_time ? otpRequests_time.OtpreQuestcounT : 0;
      const lockTime = otpRequests_time ? otpRequests_time.opt_lock_time : null;

      if (otpRequests >= 3) {
        const currentTime = new Date();
        const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours

        if (lockTimeElapsed >= 1) {
          // Reset the OTP request count and lock time
          await userHelpers.updateOtpRequest(req.body.senCurreSponDer);
        } else {
          // Too many OTP requests
          res.render('user/templogin', { tomanyOTPAfterHour: true });
          return;
        }
      }

      // Generate and send new OTP
      const otp = generateOTP();
      const mailOptions = {
        from: "anandhueducateanddevelop@gmail.com",
        to: req.body.senCurreSponDer,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
      };

      transporter.sendMail(mailOptions, async(error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Error sending OTP');
        }
        console.log('Email sent:', info.response);
        req.session.otp = otp;

        await userHelpers.setRequestOtp(req.body.senCurreSponDer)
        
        res.render('user/otp',{send_mail: req.body.senCurreSponDer});
      });
      return; // Exit the route handler to avoid further processing
    }

    req.body.Email = req.body.Email.trim().toLowerCase();
    
    const checkPortalAccess = await userHelpers.getPortalAccess(req.body.Email)
    if(checkPortalAccess){

      let otp_Requests_time = await userHelpers.getOtpRequestTime(req.body.Email);
      let OTP_LOCK_TIME = otp_Requests_time ? otp_Requests_time.opt_lock_time: null
      let currentTime = new Date();
      let lockTimeElapsed = OTP_LOCK_TIME ? (currentTime - new Date(OTP_LOCK_TIME)) / (1000 * 60 * 60) : 0; // Difference in hours

      if (lockTimeElapsed >= 1) {
        // Reset the OTP request count and lock time
        await userHelpers.updateOtpRequest(req.body.Email);
      }

      if (lockTimeElapsed >= 1 || OTP_LOCK_TIME == null) {

        // Handle initial login attempt
        const response = await userHelpers.doLogin(req.body);
        if (response.status) {
          // Generate and send OTP
          const otp = generateOTP();
          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: req.body.Email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}`
          };

          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);

            await userHelpers.setRequestOtp(req.body.Email);

            req.session.otp = otp;
            req.session.Pm$p_U$Ar = response.user; // Temporarily store user data
            res.render('user/otp',{send_mail: req.body.Email});
            return
          });

        } else if (response.locked) {
          req.session.userLoginErr = "Account is locked due to too many failed login attempts. Try again after "+response.formattedLOCKTimestamp;
          res.redirect('/login');
          return
        } else {
          req.session.userLoginErr = response.attemptsLeft !== undefined
            ? `Invalid Username or Password. ${response.attemptsLeft} attempts left.`
            : "Invalid Username or Password";
          res.redirect('/login');
          return
        }
      }
      else{
        let date = new Date(OTP_LOCK_TIME);
        date.setTime(date.getTime() + 3600000); // 3600000 ms = 1 hour
        let now = new Date();
        let timeDifference = date - now; // difference in milliseconds
        let minutesLeft = Math.floor(timeDifference / 60000); // convert to minutes
        res.render('user/templogin',{tomanyOTP: true, minutesLeft})
        return
      }
    } else {
      res.render("user/restricted_user",{portalEntryDenied: true})
      return
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//    REFINED  C_MARK
//     SECURITY CHECK
router.post('/verify-otp', async(req, res, next) => {
  try {
    const { otp } = req.body;
    
    if (req.session.otp === otp) {
      req.session.userLoggedIn = true;
      req.session.user = req.session.Pm$p_U$Ar; // Transfer the user details
      await userHelpers.insertloggedINTime1228(req.session.user._id);

      delete req.session.otp;
      delete req.session.Pm$p_U$Ar; // Clean up temp user data
      await userHelpers.updateOtpRequest(req.session.user.Email);
      
      res.redirect('/'); // Redirect to the home page or dashboard
    } else {
      res.status(400).send('Invalid OTP');
    }
  } catch (error) {
    console.error('Error during OTP verification:', error);
    next(error); // Pass the error to the next middleware (error handler)
  }
});*/


//    REFINED  C_MARK
//     SECURITY CHECK
router.get('/logout', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      let userId = req.session.user._id;
      req.session.destroy(async err => {
        if (err) {
          console.log(err);
          next(err); // Passes the error to the next middleware (error handler)
        } else {
          try {
            await userHelpers.insertloggedOUTTime(userId);
            res.redirect('/login');
            return;
          } catch (error) {
            next(error); // Passes the error to the next middleware (error handler)
          }
        }
      });
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.get('/signup', (req, res, next) => {
  try {

    if(req.session.signotp){
      delete req.session.signotp;
    }
    if(req.session.dobInputSerial){
      delete req.session.dobInputSerial;
    }
    if(req.session.Pm$p_SU$Ar){
      delete req.session.Pm$p_SU$Ar;
    }
    if(req.session.signreOTPrEQUEST){
      delete req.session.signreOTPrEQUEST;
    }

    res.render('user/signup', { showHeader1: false, showHeader2: false });
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/signup', async (req, res, next) => {
  try {
     
    if(req.body.Password == req.body.Cpass){

      req.body.Name = req.body.Name.trim();
      req.body.Email = req.body.Email.trim().toLowerCase();;
      req.body.Contact = req.body.Contact.trim();
      if(req.body.AdmissionYear && (req.body.AdmissionYear != "" || req.body.AdmissionYear != null)){
        req.body.AdmissionYear
      }

      let nameInput = req.body.Name.toLowerCase(); 
      let dobInput = req.body.DateOfBirth;

      const excelFilePath = path.resolve(__dirname, '../UserSignUpConfirmationDetails.xlsx');

      // Load the Excel sheet
      const workbook = xlsx.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      // Convert JavaScript Date to Excel serial number
      const dateToSerial = (date) => {
        const epoch = new Date(Date.UTC(1900, 0, 1));
        return (Date.parse(date) - epoch) / (1000 * 60 * 60 * 24) + 2;
      }; 

      // Convert input date to serial number
      const dobInputSerial = dateToSerial(new Date(dobInput));

      // Check for matching entry in the Excel sheet
      let entryFound = rows.find(row => 
        row.Name.toLowerCase() === nameInput && 
        row['Date Of Birth'] === dobInputSerial
      );

      if (entryFound) {
        let isFound = await userHelpers.checkAlreadyPresentSignup(nameInput, dobInputSerial)
        if(!isFound){

          let insertedId = await userHelpers.doSignup(req.body);
          insertedId = insertedId.toString();
          const { Name, Status } = req.body;
          const time_joined = new Date();
          const userData = { insertedId, Name, Status, time_joined, DOB: dobInputSerial };
          await userHelpers.insertNameIdStatus(userData);

          // COPY user.png AND RENAME IT TO insertedId.jpg
          const srcPath = path.join(__dirname, '../public/user-images/user.png');
          const destPath = path.join(__dirname, `../public/user-images/${insertedId}.jpg`);

          fs.copyFile(srcPath, destPath, (err) => {
            if (err) {
              console.error('Error copying file:', err);
              return next(err); // Passes the error to the next middleware (error handler)
            }
            console.log('user.png was copied to ' + destPath);

            res.redirect('/login'); // Redirect to the login page
            return
          });

        } else {
          res.render('user/signup', { alreadyPresent: true });
          return
        }
      } else {
        res.render('user/signup', { DOBNotConfirm: true });
        return
      }
    } else {
      res.render('user/signup', { PassConfirmpassNotSame: true });
      return
    }

  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


//   MAIL SERVICE INTEGRATED
/*router.post('/signup', async (req, res, next) => {
  try {

    if (req.body.resendsignOtp) {  

      let signreOTPrEQUEST =  req.session.signreOTPrEQUEST
      if(signreOTPrEQUEST && signreOTPrEQUEST > 5){
        delete req.session.signotp;
        delete req.session.dobInputSerial;
        delete req.session.Pm$p_SU$Ar;

        res.render('user/templogin', { toomany_signotp: true });
        return
      }

      // Generate and send new OTP
      const otp = generateOTP();
      const mailOptions = {
        from: "anandhueducateanddevelop@gmail.com",
        to: req.body.senCurreSponSignDer,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Error sending OTP');
        }
        console.log('Email sent:', info.response);
        req.session.signotp = otp;

        let signreOTPrEQUEST = req.session.signreOTPrEQUEST ?? null;
        if(signreOTPrEQUEST && signreOTPrEQUEST>=1 && signreOTPrEQUEST != null){
          signreOTPrEQUEST = signreOTPrEQUEST+1
          req.session.signreOTPrEQUEST = signreOTPrEQUEST
        } else if(!signreOTPrEQUEST || signreOTPrEQUEST == 0 || signreOTPrEQUEST == null){
          req.session.signreOTPrEQUEST = 1
        }

        res.render('user/signotp',{send_mail: req.body.senCurreSponSignDer});
      });
      return; // Exit the route handler to avoid further processing
    }
     
    if(req.session.signreOTPrEQUEST <= 5 || !req.session.signreOTPrEQUEST){

      if(req.body.Password == req.body.Cpass){

        req.body.Name = req.body.Name.trim();
        req.body.Email = req.body.Email.trim().toLowerCase();;
        req.body.Contact = req.body.Contact.trim();
        if(req.body.AdmissionYear && (req.body.AdmissionYear != "" || req.body.AdmissionYear != null)){
          req.body.AdmissionYear
        }

        let nameInput = req.body.Name.toLowerCase();
        let dobInput = req.body.DateOfBirth;

        const excelFilePath = path.resolve(__dirname, '../UserSignUpConfirmationDetails.xlsx');

        // Load the Excel sheet
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        // Convert JavaScript Date to Excel serial number
        const dateToSerial = (date) => {
          const epoch = new Date(Date.UTC(1900, 0, 1));
          return (Date.parse(date) - epoch) / (1000 * 60 * 60 * 24) + 2;
        }; 

        // Convert input date to serial number
        const dobInputSerial = dateToSerial(new Date(dobInput));

        // Check for matching entry in the Excel sheet
        let entryFound = rows.find(row => 
          row.Name.toLowerCase() === nameInput && 
          row['Date Of Birth'] === dobInputSerial
        );

        if (entryFound) {
          let isFound = await userHelpers.checkAlreadyPresentSignup(nameInput, dobInputSerial)
          if(!isFound){

            const otp = generateOTP();
            const mailOptions = {
              from: "anandhueducateanddevelop@gmail.com",
              to: req.body.Email,
              subject: 'Your OTP Code',
              text: `Your OTP code is ${otp}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending OTP');
              }
              console.log('Email sent:', info.response);

              let signreOTPrEQUEST = req.session.signreOTPrEQUEST ?? null;
              if(signreOTPrEQUEST && signreOTPrEQUEST>=1 && signreOTPrEQUEST != null){
                signreOTPrEQUEST = signreOTPrEQUEST+1
                req.session.signreOTPrEQUEST = signreOTPrEQUEST
              } else if(!signreOTPrEQUEST || signreOTPrEQUEST == 0 || signreOTPrEQUEST == null){
                req.session.signreOTPrEQUEST = 1
              }

              req.session.signotp = otp;
              req.session.Pm$p_SU$Ar = req.body; // Temporarily store user data
              req.session.dobInputSerial = dobInputSerial
              res.render('user/signotp',{send_mail: req.body.Email});
              return
            });

          } else {
            res.render('user/signup', { alreadyPresent: true });
            return
          }
        } else {
          res.render('user/signup', { DOBNotConfirm: true });
          return
        }
      } else {
        res.render('user/signup', { PassConfirmpassNotSame: true });
        return
      }
    } else {
      res.render('user/templogin', { toomany_signotp: true });
      return
    }

  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/verify_sign_otp', async (req, res, next) => {
  try {
    const signotp = req.body.otp;
    
    if (req.session.signotp === signotp) {

      if(!req.session.Pm$p_SU$Ar){
        res.status(400).send('Something went wrong. please try again.');
        return
      } else if(req.session.Pm$p_SU$Ar){
        const signBody = req.session.Pm$p_SU$Ar; // Transfer the user details

        let insertedId = await userHelpers.doSignup(signBody);
        insertedId = insertedId.toString();
        const { Name, Status } = signBody;
        const time_joined = new Date();
        const dobInputSerial = req.session.dobInputSerial;
        const userData = { insertedId, Name, Status, time_joined, DOB: dobInputSerial };
        await userHelpers.insertNameIdStatus(userData);

        // COPY user.png AND RENAME IT TO insertedId.jpg
        const srcPath = path.join(__dirname, '../public/user-images/user.png');
        const destPath = path.join(__dirname, `../public/user-images/${insertedId}.jpg`);

        fs.copyFile(srcPath, destPath, (err) => {
          if (err) {
            console.error('Error copying file:', err);
            return next(err); // Passes the error to the next middleware (error handler)
          }
          console.log('user.png was copied to ' + destPath);
          
          delete req.session.signreOTPrEQUEST
          delete req.session.signotp;
          delete req.session.dobInputSerial;
          delete req.session.Pm$p_SU$Ar; // Clean up temp user data

          res.redirect('/login'); // Redirect to the login page
          return
        });
      }

    } else {
      res.status(400).send('Invalid OTP');
      return
    }
  } catch (error) {
    console.error('Error during the signup process:', error);
    next(error); // Pass the error to the next middleware (error handler)
  }
});*/


router.get('/profile', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;

        let jobs = await userHelpers.getEditJobButtonProfile1228(req.session.user._id);
        let interns = await userHelpers.getEditButtonInternshipProfile1228(req.session.user._id);
        const profile = await userHelpers.get1Profile2For2Profile8(req.session.user._id);

        res.render('user/profile', {
          showHeader1: true,
          showHeader2: true,
          showHeader3: true,
          profile, uber,
          jobs,interns,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/remove_profile_picture', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        // COPY user.png AND RENAME IT TO insertedId.jpg
        const srcPath = path.join(__dirname, '../public/user-images/user.png');
        const destPath = path.join(__dirname, `../public/user-images/${req.session.user._id}.jpg`);
        fs.copyFile(srcPath, destPath, (err) => {
          if (err) {
            console.error('Error copying file:', err);
            return next(err); // Passes the error to the next middleware (error handler)
          }
        });
        res.json({removedProfiePic: true})
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/view-profile', verifyLogin, async (req, res) => {
  try {
    const view = req.body.profileId;
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const uber = req.session.user.Name;
        const user = req.session.user._id;

        let iblockList = await userHelpers.getindiBlockLogData(user);
        let iwasblocklist = await userHelpers.getBlockedByUsers(user);
        let iBlocked = iblockList.includes(view);
        let iWasBlocked = iwasblocklist.includes(view);
        let NoBlock = !(iBlocked || iWasBlocked);
 
        if (iBlocked) {
          const profile = await userHelpers.getLowProfile(view);
          res.render('user/view_low_profile', {
            iBlocked,
            showHeader1: true,
            showHeader2: true,
            profile,
            uber,
            groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        } else if (iWasBlocked) {
          const profile = await userHelpers.getLowProfile(view);
          res.render('user/view_low_profile', {
            iWasBlocked,
            showHeader1: true,
            showHeader2: true,
            profile,
            uber,
            groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        } else if (NoBlock) {
          
            const profile = await userHelpers.getProfileForViewProfile(view);
          
            if(profile && profile.restrict_portal){
              res.render('user/view_profile_disabled', {
                profile_admin_lock: true,
              });
              return;
            }

            if(profile && profile.activeStatus == "inactive"){
              res.render('user/view_profile_disabled', {
                profile_user_lock: true,
              });
              return;
            }

            if (view != user) {
              await userHelpers.addViewProfile(view, user, uber);
              let existing_view_profile_viewers = await userHelpers.getExistingViewViewerCount(view);
              let current_view_profile_viewers = await userHelpers.getCurrentViewViewerCount(view);
              let new_view_user_count = current_view_profile_viewers - existing_view_profile_viewers;
              if(new_view_user_count>=10){
                if(req.session.user.view == null){
                  req.session.user.view = await userHelpers.getLastViewProfileMailSended(view)
                  if(req.session.user.view == null){
                    //   SEND INITIAL REQUEST MAIL LOGIC HERE
                    console.log("SENDED FIRST MAIL VIEW PROFILE")
                    await userHelpers.setLastViewProfileMailSended(view)
                    req.session.user.view = new Date()
                  }
                  if(req.session.user.view != null){
                    const isNewDay = isDifferentDay(req.session.user.view);
                    if (isNewDay) {
                      const isNewDayReVarification = isDifferentDay(req.session.user.view);
                      if (isNewDayReVarification) {
                        //  SEND MAIL LOGIC HERE
                        console.log("SENDED MAIL VIEW PROFILE")
                        await userHelpers.setLastViewProfileMailSended(view)
                        req.session.user.view = new Date()
                      }
                    }
                  }
                }
              }   
            }
                   
            res.render('user/view-profile', {
              showHeader1: true,
              showHeader2: true,
              profile,
              uber,
              groupchatcount,
              total_message,
              total_notify_number
            });
            return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /view-profile:", error);
    res.status(500).send('Internal Server Error');
  }
});


/*router.post('/view-profile', verifyLogin, async (req, res) => {
  try {
    const view = req.body.profileId;
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const uber = req.session.user.Name;
        const user = req.session.user._id;

        let iblockList = await userHelpers.getindiBlockLogData(user);
        let iwasblocklist = await userHelpers.getBlockedByUsers(user);
        let iBlocked = iblockList.includes(view);
        let iWasBlocked = iwasblocklist.includes(view);
        let NoBlock = !(iBlocked || iWasBlocked);
 
        if (iBlocked) {
          const profile = await userHelpers.getLowProfile(view);
          res.render('user/view_low_profile', {
            iBlocked,
            showHeader1: true,
            showHeader2: true,
            profile,
            uber,
            groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        } else if (iWasBlocked) {
          const profile = await userHelpers.getLowProfile(view);
          res.render('user/view_low_profile', {
            iWasBlocked,
            showHeader1: true,
            showHeader2: true,
            profile,
            uber,
            groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        } else if (NoBlock) {

          const profile = await userHelpers.getProfileForViewProfile(view);
        
          if(profile && profile.restrict_portal){
            res.render('user/view_profile_disabled', {
              profile_admin_lock: true,
            });
            return;
          }

          if(profile && profile.activeStatus == "inactive"){
            res.render('user/view_profile_disabled', {
              profile_user_lock: true,
            });
            return;
          }

          if (view != user) {
            await userHelpers.addViewProfile(view, user, uber);
            let existing_view_profile_viewers = await userHelpers.getExistingViewViewerCount(view);
            let current_view_profile_viewers = await userHelpers.getCurrentViewViewerCount(view);
            let new_view_user_count = current_view_profile_viewers - existing_view_profile_viewers;
            if(new_view_user_count>=10){
              if(req.session.user.view == null){
                req.session.user.view = await userHelpers.getLastViewProfileMailSended(view)
                if(req.session.user.view == null){
                  //   SEND INITIAL REQUEST MAIL LOGIC HERE

                  // GET REQUIRED EMAIL
                  let send_Mail = await userHelpers.getEmailFromUserId(view);

                  const mailOptions = {
                    from: "anandhueducateanddevelop@gmail.com",
                    to: send_Mail.Email,
                    subject: 'Profile visitors',
                    text: `You are getting more profile visitors. Visit student alumni relations cell for more`
                  };
            
                  transporter.sendMail(mailOptions, async(error, info) => {
                    if (error) {
                      console.error('Error sending email:', error);
                      return res.status(500).send('Error sending OTP');
                    }
                    console.log('Email sent:', info.response);
                  });

                  await userHelpers.setLastViewProfileMailSended(view)
                  req.session.user.view = new Date()
                }
                if(req.session.user.view != null){
                  const isNewDay = isDifferentDay(req.session.user.view);
                  if (isNewDay) {
                    const isNewDayReVarification = isDifferentDay(req.session.user.view);
                    if (isNewDayReVarification) {
                      //  SEND MAIL LOGIC HERE

                      // GET REQUIRED EMAIL
                      let send_Mail = await userHelpers.getEmailFromUserId(view);

                      const mailOptions = {
                        from: "anandhueducateanddevelop@gmail.com",
                        to: send_Mail.Email,
                        subject: 'Profile visitors',
                        text: `You are getting more profile visitors. Visit student alumni relations cell for more`
                      };
                
                      transporter.sendMail(mailOptions, async(error, info) => {
                        if (error) {
                          console.error('Error sending email:', error);
                          return res.status(500).send('Error sending OTP');
                        }
                        console.log('Email sent:', info.response);
                      });

                      await userHelpers.setLastViewProfileMailSended(view)
                      req.session.user.view = new Date()
                    }
                  }
                }
              }
            }
          }
          res.render('user/view-profile', {
            showHeader1: true,
            showHeader2: true,
            profile,
            uber,
            groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /view-profile", error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.get('/profile_viewers', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let viewers = await userHelpers.getProfileViewers(req.session.user._id);
        let viewDATA = [];

        // Check if viewers array is not empty
        if (viewers && viewers.length > 0) {
          for (const viewer of viewers) {
            const userDetails = await userHelpers.get1BasicUserProfile2DetailsFor2View8Viewers(viewer.viewId); // ONLY STATUS  // PROFILEMARK
            if (userDetails) {
              const timestamp = new Date(viewer.timestamp).toLocaleString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              });
              viewDATA.push({
                viewId: viewer.viewId,
                viewName: viewer.viewName,
                timestamp: timestamp,
                Status: userDetails.Status
              });
            }
          }

          viewDATA.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        let viewDataCOUNT = viewDATA.length;
        res.render('user/profile_viewers', {
          viewDATA, showHeader1: true,
          showHeader2: true, uber,
          viewDataCOUNT,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    next(err); // Passes the error to the next middleware (error handler)
  }
});


router.get('/add-note', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Note = await userHelpers.getProfileForNote(req.session.user._id);
        res.render('user/add-note', { Note });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/add-note', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        await userHelpers.updateNote(req.session.user._id, req.body);
        res.redirect('/profile');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.get('/edit-profile', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user = await userHelpers.get1Edit2Profile2Details8(req.session.user._id);
        res.render('user/edit-profile', { user });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/edit-profile', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;

        req.body.Name = req.session.user.Name.trim();
        req.body.Email = req.body.Email.trim().toLowerCase();;
        req.body.Contact = req.body.Contact.trim();

        if(req.session.user.Email == req.body.Email){

          await userHelpers.update1228Profile(userId, req.body);

          if (req.files && req.files.Image) {
            let image = req.files.Image;
            const imageFileName = userId + '.jpg';
            const outputPath = './public/user-images/' + imageFileName;
            
            const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
              workerData: {
                imageBuffer: image.data,
                outputPath: outputPath
              }
            });

            worker.on('message', async (message) => {
              if (message.status === 'success') {
                console.log('Image processing successful');
                // Optionally update user profile with the image filename if needed
              } else {
                console.error('Error processing image:', message.error);
              }
            });

            worker.on('error', (error) => {
              console.error('Worker error:', error);
            });

            worker.on('exit', (code) => {
              if (code !== 0) {
                console.error('Worker stopped with exit code', code);
              }
            });
          }

          res.redirect('/profile');
          return;
        } else{
          req.session.user.changeDezireMail = req.body.Email;
          req.body.Email = req.session.user.Email;
          await userHelpers.update1228Profile(userId, req.body);

          if (req.files && req.files.Image) {
            let image = req.files.Image;
            const imageFileName = userId + '.jpg';
            const outputPath = './public/user-images/' + imageFileName;
            
            const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
              workerData: {
                imageBuffer: image.data,
                outputPath: outputPath
              }
            });

            worker.on('message', async (message) => {
              if (message.status === 'success') {
                console.log('Image processing successful');
                // Optionally update user profile with the image filename if needed
              } else {
                console.error('Error processing image:', message.error);
              }
            });

            worker.on('error', (error) => {
              console.error('Worker error:', error);
            });

            worker.on('exit', (code) => {
              if (code !== 0) {
                console.error('Worker stopped with exit code', code);
              }
            });
          }

          res.render("user/change_mail_pass")
        }
        
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/change_mail_pass', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let changeDezireMail = req.session.user.changeDezireMail;
        const response = await userHelpers.changeEmailAfterPass(req.session.user._id,req.body.Password,changeDezireMail);
        if (response.status) {
          req.session.user.Email = changeDezireMail;
          res.redirect('/profile');
          return;
        } else if (response.locked) {
          res.render('user/change_mail_pass',{change_mail_fail_lock : true, formattedLOCKTimestamp : response.formattedLOCKTimestamp});
          return;
        } else {
          res.render('user/change_mail_pass',{change_mail_fail : true, attemptsLeft: response.attemptsLeft});
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.get('/updatepass', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        res.render('user/updatepass');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.post('/updatepass', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      let userID = req.session.user._id;
      let User = await userHelpers.getPassUpdateProfileDetails(userID);
      try {
        let response = await userHelpers.updateUPass(User, req.body.OldPass,req.body.NewPass,userID);
        if (response.status) {
          await userHelpers.updatePassCount(userID);
          await userHelpers.userPassUpdateDetailLog(userID);
          res.redirect('/profile');
          return;
        } else {
          res.render('user/updatepass', { User, invalid: true }); // Pass invalid flag
          return;
        }
      } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).send("Internal Server Error");
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


//   MAIL SERVICE INTEGRATED
/*router.post('/updatepass', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      try {
        
        const userID = req.session.user._id;
        // Check if OTP resend is requested
        if (req.body.resendOtp) {
          let otpRequests_time = await userHelpers.getUpdatePassOtpRequest(userID);

          let otpRequests = otpRequests_time ? otpRequests_time.UpdatePassOtpRequestCount : 0;
          const lockTime = otpRequests_time ? otpRequests_time.update_passopt_lock_time : null;

          if (otpRequests >= 3) {
            const currentTime = new Date();
            const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours

            if (lockTimeElapsed >= 1) {
              // Reset the OTP request count and lock time
              await userHelpers.UpdatePassupdateOtpRequest(userID);
            } else {
              // Too many OTP requests
              res.render('user/templogin', { tomanyOTPAfterHour: true });
              return;
            }
          }

          // Generate and send new OTP
          const otp = generateOTP();
          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: req.session.user.Email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}`
          };

          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);
            req.session.changePassOtp = otp;

            await userHelpers.setRequestUpdatePassOtp(userID)
            
            res.render('user/passupdatevarifyotp');
          });
          return; // Exit the route handler to avoid further processing
        }

        let checkFail = await userHelpers.getupassFail(userID)
        let upassRequests = checkFail ? checkFail.updatePassRequst : 0;
        const lockTime = checkFail ? checkFail.updatepass_lock_time : null;

        if (upassRequests >= 3) {
          const currentTime = new Date();
          const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours

          if (lockTimeElapsed >= 1) {
            // Reset the OTP request count and lock time
            await userHelpers.updateUPassOTP(userID);
          } else {
            // Too many wrong passwords

            const rem_incorrecect_pass_time = new Date(lockTime.getTime() + 12 * 60 * 60 * 1000).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
            res.render('user/templogin', { tomanyincorrectPASSWORD: true, rem_incorrecect_pass_time });
            return;
          }
        }

        let User = await userHelpers.getPassUpdateProfileDetails(userID);
        let response = await userHelpers.updateUPass(User, req.body.OldPass,req.body.NewPass,userID);

        if (response.status) {

          await userHelpers.updateupassFail(userID)
          let otp_Requests_time = await userHelpers.getUpdatePassOtpRequestTime(userID);
          let OTP_LOCK_TIME = otp_Requests_time ? otp_Requests_time.update_passopt_lock_time: null
          let currentTime = new Date();
          let lockTimeElapsed = OTP_LOCK_TIME ? (currentTime - new Date(OTP_LOCK_TIME)) / (1000 * 60 * 60) : 0; // Difference in hours

          if (lockTimeElapsed >= 1) {
            // Reset the OTP request count and lock time
            await userHelpers.UpdatePassupdateOtpRequest(userID);
          }

          if(lockTimeElapsed >= 1 || OTP_LOCK_TIME == null){

            req.session.user.changeUserPassData = req.body.NewPass;

            // Generate and send new OTP
            const otp = generateOTP();
            const mailOptions = {
              from: "anandhueducateanddevelop@gmail.com",
              to: req.session.user.Email,
              subject: 'Your OTP Code',
              text: `Your OTP code is ${otp}`
            };

            transporter.sendMail(mailOptions, async(error, info) => {
              if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending OTP');
              }
              console.log('Email sent:', info.response);
              await userHelpers.setRequestUpdatePassOtp(userID)
              req.session.changePassOtp = otp;

              res.render('user/passupdatevarifyotp');
              return
            });

          } else{
            let date = new Date(OTP_LOCK_TIME);
            date.setTime(date.getTime() + 3600000); // 3600000 ms = 1 hour
            let now = new Date();
            let timeDifference = date - now; // difference in milliseconds
            let minutesLeft = Math.floor(timeDifference / 60000); // convert to minutes
            res.render('user/templogin',{tomanyOTP: true, minutesLeft})
            return
          }
        } else{
          await userHelpers.setupassFail(userID)
          res.render('user/updatepass', { User, invalid: true, upassfailattemptleft : 2 - upassRequests }); // Pass invalid flag
          return
        }
        
      } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).send("Internal Server Error");
        return
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


router.post('/updatepassOtpConfirmed', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
     if(req.session.changePassOtp == req.body.otp){
      const userID = req.session.user._id
      let passBody =  req.session.user.changeUserPassData
      let response = await userHelpers.updateUPassOTP(userID,passBody);
        if (response.status) {
          await userHelpers.updatePassCount(userID);
          await userHelpers.userPassUpdateDetailLog(userID);
          await userHelpers.UpdatePassupdateOtpRequest(userID);
          delete req.session.user.changeUserPassData;
          delete req.session.changePassOtp;
          res.redirect('/profile');

          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: req.session.user.Email,
            subject: 'Password updation',
            text: `Your password was updated. If that wasn't you, contact alumni cell or change password`
          };

          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);
          });

          return;
        } else {
          res.status(400).send('Error in changing password');
          return;
        }
     } else {
        res.status(400).send('Invalid OTP');
        return
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});*/


/*router.get('/recoverpass', async (req, res) => {
  try {
    res.render('user/recoverpass');
    return;
  } catch (error) {
    console.error("Error in /recoverpass route:", error);
    res.status(500).send("Internal Server Error");
  }
});


//   REFINED E_MARK
router.post('/recoverpass', async (req, res) => {
  try {

    // Check if OTP resend is requested
    if (req.body.resendrecOtp) {
      let recotpRequests_time = await userHelpers.getRecOtpRequest(req.body.senCurreSponrecDer);
      let recotpRequests = recotpRequests_time ? recotpRequests_time.RecoverOtpreQuestcounT : 0;
      const lockTime = recotpRequests_time ? recotpRequests_time.recover_opt_lock_time : null;

      if (recotpRequests >= 3) {
        const currentTime = new Date();
        const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours

        if (lockTimeElapsed >= 12) {
          // Reset the OTP request count and lock time
          await userHelpers.updateRecOtpRequest(req.body.senCurreSponrecDer);
        } else {
          // Too many OTP requests

          const newTime = new Date(new Date(lockTime).getTime() + (12 * 60 * 60 * 1000));
          const formattedRecTimestamp = new Date(newTime).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
          res.render('user/templogin', { toomany_recotp: true, formattedRecTimestamp });
          return;
        }
      }

      // Generate and send new OTP
      const otp = generateOTP();
      const mailOptions = {
        from: "anandhueducateanddevelop@gmail.com",
        to: req.body.senCurreSponrecDer,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
      };

      transporter.sendMail(mailOptions, async(error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Error sending OTP');
        }
        console.log('Email sent:', info.response);
        req.session.recotp = otp;

        await userHelpers.setRequestRecOtp(req.body.senCurreSponrecDer)
        
        res.render('user/recotp',{send_mail: req.body.senCurreSponrecDer});
      });
      return; // Exit the route handler to avoid further processing
    }

    req.body.Email = req.body.Email.trim().toLowerCase();

    let rec_otp_Requests_time = await userHelpers.getRecOtpRequestTime(req.body.Email);
    let REC_OTP_LOCK_TIME = rec_otp_Requests_time ? rec_otp_Requests_time.recover_opt_lock_time: null
    let currentTime = new Date();
    let lockTimeElapsed = REC_OTP_LOCK_TIME ? (currentTime - new Date(REC_OTP_LOCK_TIME)) / (1000 * 60 * 60) : 0; // Difference in hours

    if (lockTimeElapsed >= 12) {
      // Reset the OTP request count and lock time
      await userHelpers.updateRecOtpRequest(req.body.Email);
    }

    if (lockTimeElapsed >= 1 || REC_OTP_LOCK_TIME == null) {

      const otp = generateOTP();
      const mailOptions = {
        from: "anandhueducateanddevelop@gmail.com",
        to: req.body.Email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
      };

      transporter.sendMail(mailOptions, async(error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Error sending OTP');
        }
        console.log('Email sent:', info.response);
        await userHelpers.setRequestRecOtp(req.body.Email)  //  NEWLY ADDED
        req.session.recotp = otp;
        req.session.Pm$p_RapSU$Ar = req.body; // Temporarily store user data
        res.render('user/recotp',{send_mail: req.body.Email});
        return
      });
    }
    else{
      const newTime = new Date(new Date(REC_OTP_LOCK_TIME).getTime() + (12 * 60 * 60 * 1000));
      const formattedRecTimestamp = new Date(newTime).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      res.render('user/templogin',{toomany_recotp: true, formattedRecTimestamp})
      return
    }
  } catch (error) {
    console.error("Error recovering password:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/verify_recoverpass_otp', async(req, res, next) => {
  try {

    const recotp = req.body.otp;
    if(req.session.recotp === recotp){
      let recbody = req.session.Pm$p_RapSU$Ar;
      let response = await userHelpers.doRecoveruserpass(recbody);
      if (response.status) {
        delete req.session.recotp;
        await userHelpers.RecAccountCount(recbody.Email);
        await userHelpers.userPassUpdateRecDataDetailLog(recbody.Email);
        delete req.session.Pm$p_RapSU$Ar;
        await userHelpers.updateRecOtpRequest(recbody.Email);
        res.redirect('/login');

        const mailOptions = {
          from: "anandhueducateanddevelop@gmail.com",
          to: recbody.Email,
          subject: 'Password recovery',
          text: `Your password was recovered. If that wasn't you, contact alumni cell or change password`
        };

        transporter.sendMail(mailOptions, async(error, info) => {
          if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending OTP');
          }
          console.log('Email sent:', info.response);
        });

        return;
      } 
    } else {
      delete req.session.recotp;
      delete req.session.Pm$p_RapSU$Ar;
      res.render('user/recoverpass',{invalid_otp: true});
      return
    }

  } catch (error) {
    console.error('Error during OTP verification:', error);
    next(error); // Pass the error to the next middleware (error handler)
  }
});*/


router.get('/viewNotifications', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let uber = req.session.user.Name;
        const userId = req.session.user._id;
        const admin_id = await userHelpers.getAdminID();  // ONLY ADMIN ID


        // ALL NOTIFICATION COUNT BELOW

        const timestamp = new Date();

        let postcount = await userHelpers.getAllNewOtherpostUpdateNotification(userId, timestamp);
        let post_notif = postcount > 0 ? true : false;

        let existingCommentlikecount = await userHelpers.getAllNewOwnpostLikeNotification(userId);
        let currentCommentlikecount = await userHelpers.getAllNewCurrentOwnpostLikeNotification(userId);

        // Extracting likeCount and commentCount separately
        let existinglikecount = existingCommentlikecount.map(item => ({
          _id: item._id,
          likeCount: item.likeCount
        }));

        let existingCommentcount = existingCommentlikecount.map(item => ({
          _id: item._id,
          commentCount: item.commentCount
        }));

        let currentlikecount = currentCommentlikecount.map(item => ({
          _id: item._id,
          likeCount: item.likeCount
        }));

        let currentCommentcount = currentCommentlikecount.map(item => ({
          _id: item._id,
          commentCount: item.commentCount
        }));

        let increasedIds = [];
        existinglikecount.forEach(existingPost => {
          const currentPost = currentlikecount.find(post => post._id === existingPost._id);
          if (currentPost && currentPost.likeCount > existingPost.likeCount) {
            const difference = currentPost.likeCount - existingPost.likeCount;
              increasedIds.push({
                _id: existingPost._id,
                difference: difference
            });
          }
        });
        let like_notify_number = increasedIds.length;
        let like_notif = like_notify_number > 0 ? true : false;
        let increasedCommenterIds = []; 
        existingCommentcount.forEach(existingPost => {
            const currentPost = currentCommentcount.find(post => post._id === existingPost._id);
            if (currentPost && currentPost.commentCount > existingPost.commentCount) {
                const difference = currentPost.commentCount - existingPost.commentCount;
                increasedCommenterIds.push({
                    _id: existingPost._id,
                    difference: difference
                });
            }
        });
        let Comment_notify_number = increasedCommenterIds.length;
        let Comment_notif = Comment_notify_number > 0 ? true : false;

        let existing_groupchat_count = await userHelpers.getExistingGroupChatCount(userId);
        let current_groupchat_count = await userHelpers.getAllNewGroupchatNotification();
        let groupchatcount = (current_groupchat_count - existing_groupchat_count);
        let groupchat_notif = groupchatcount > 0 ? true : false;

        let interncount = 0;
        if (req.session.user.Status == "Alumni") {
          interncount = await userHelpers.getAllNewInternsNotification(userId, timestamp);
        }
        let intern_notif = interncount > 0 ? true : false;

        let mentorcount = await userHelpers.getAllNewMentorNotification(userId, timestamp);
        let mentor_notif = mentorcount > 0 ? true : false;

        let jobcount = await userHelpers.getAllNewJobNotification(userId, timestamp);
        let job_notif = jobcount > 0 ? true : false;

        let upassCountDiffData = await userHelpers.getUpassDiffCount(userId);
        let upassCountDiff = upassCountDiffData.difference;
        let upassCountStatus = upassCountDiffData.upassConfirm;
        let upass_diff = (upassCountDiff != 0) && (upassCountStatus != true);

        let adminViewCheckStat = await userHelpers.getAdminViewDelMessStatCount(userId);
        let adminViewCheckStatLength = adminViewCheckStat.length;
        let adminViewConsentPending = adminViewCheckStatLength > 0 ? true : null;

        let current_rec_mess = await userHelpers.getAllReceivedMessage(userId);
        let existing_rec_mess = await userHelpers.getAllReceivedExistingMessage(userId);
        let currentSum = current_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let existingSum = existing_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let total_new_mess = currentSum - existingSum; // TOTAL NUMBER OF NEW MESSAGES
        let new_mess_notif = total_new_mess != 0 ? true : false;
        let newmessages = []; // NEW MESSENGERS ID
        current_rec_mess.forEach(current => {
          let existing = existing_rec_mess.find(existing => existing.Reciever_Id === current.Reciever_Id);
          if (!existing || current.count > existing.count) {
            newmessages.push(current.Reciever_Id);
          }
        });
        let mess_count_notify_number = newmessages.length; // NUMBER OF NEW MESSENGERS
        let new_messenger_count_notif = mess_count_notify_number > 0 ? true : false;

        let current_Admin_rec_mess = await userHelpers.getAllAdminReceivedMessage(userId);
        let existing_Admin_rec_mess = await userHelpers.getAllAdminReceivedExistingMessage(userId);
        let currentAdminSum = current_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let existingAdminSum = existing_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
        let total_new_Admin_mess = currentAdminSum - existingAdminSum;
        let new_admin_mess_notif = total_new_Admin_mess > 0 ? true : false;

        let last_broad_time = await userHelpers.getLastBroadTime();
        let last_broad_entry_time = await userHelpers.getLastBroadEntryTime(userId);
        let admin_broadcast = (last_broad_time !== null && (last_broad_entry_time === null || last_broad_entry_time < last_broad_time)) ? 1 : 0;
        let new_admin_broad_notif = admin_broadcast != 0 ? true : false;

        let existing_view_profile_viewers = await userHelpers.getExistingViewViewerCount(userId);
        let current_view_profile_viewers = await userHelpers.getCurrentViewViewerCount(userId);
        let new_view_user_count = current_view_profile_viewers - existing_view_profile_viewers;
        let new_view_notif = new_view_user_count > 0 ? true : false;

        let myExistingMentorQuestions = await userHelpers.getSenderMentors(userId);
        let differenceMentorQuestionReply = await userHelpers.getdifferenceMentorQuestionReply(myExistingMentorQuestions);
        let newReplieObtainedQuestions = differenceMentorQuestionReply.result;
        let mentorQuestionNumbers = newReplieObtainedQuestions.length;
        let totalNewRepliesMentors = differenceMentorQuestionReply.differentSum;
        let new_mentor_reply_notif = totalNewRepliesMentors > 0 ? true : false;

        let check_for_reply = await userHelpers.getDifferenceInCommentLikeReply(userId)
        let ONE_REPLY = check_for_reply.onereply;
        let MANY_REPLY = check_for_reply.manyreply;
        let MANY_LIKE = check_for_reply.manylike;
        let DIFFERENCE = check_for_reply.differences;
        let Total_Difference_Post_Reply_Like = DIFFERENCE.filter(diff => diff.totalReplyDiff > 0).length;
        if(MANY_LIKE){
          Total_Difference_Post_Reply_Like = Total_Difference_Post_Reply_Like + 1;
        }

        await userHelpers.storeNotification1228(
          userId,
          post_notif, postcount,
          like_notif, increasedIds,
          like_notify_number, groupchat_notif,
          groupchatcount, interncount,
          intern_notif, mentorcount,
          mentor_notif, jobcount,
          job_notif, total_new_mess,
          new_mess_notif, newmessages,
          mess_count_notify_number,
          new_messenger_count_notif,
          total_new_Admin_mess,
          new_admin_mess_notif,
          admin_broadcast,
          new_admin_broad_notif,
          new_view_user_count,
          new_view_notif, upass_diff,
          adminViewCheckStat,
          adminViewCheckStatLength,
          adminViewConsentPending,
          newReplieObtainedQuestions,
          mentorQuestionNumbers,
          new_mentor_reply_notif,
          Comment_notify_number, 
          Comment_notif, increasedCommenterIds,
          DIFFERENCE, ONE_REPLY, MANY_REPLY, MANY_LIKE
        );

        let total_notify_number = (mess_count_notify_number + jobcount + mentorcount
          + interncount + groupchatcount + like_notify_number + postcount +
          total_new_Admin_mess + admin_broadcast + new_view_user_count + upassCountDiff
          + adminViewCheckStatLength + totalNewRepliesMentors + Total_Difference_Post_Reply_Like);

        let total_message = (total_new_mess + admin_broadcast);

        req.session.total_notify_number = total_notify_number;
        req.session.total_message = total_message;
        req.session.groupchatcount = groupchatcount;

        // ALL NOTIFICATION COUNT ABOVE



        let viewNotifications = await userHelpers.getViewNotifications(userId);

        if (viewNotifications.length > 1) {
          // Sort notifications by timestamp in ascending order
          viewNotifications.sort((a, b) => new Date(a.entered_timeStamp) - new Date(b.entered_timeStamp));

          // Iterate through the notifications starting from the second oldest
          for (let i = 1; i < viewNotifications.length; i++) {
            const prevNotification = viewNotifications[i - 1];
            const currNotification = viewNotifications[i];

            // Compare parameters of the current notification with the previous one
            for (const key in prevNotification) {
              if (prevNotification.hasOwnProperty(key) && key !== 'entered_timeStamp' && currNotification[key] === prevNotification[key]) {
                prevNotification[key] = null;
              }
            }
          }
        }

        // Sort by entered_timeStamp in descending order
        viewNotifications.sort((a, b) => new Date(b.entered_timeStamp) - new Date(a.entered_timeStamp));

        // Update increasedIds and newmessages and adminViewCheckStat arrays except for the first entry
        viewNotifications.forEach((entry, index) => {
          if (index !== 0) {
            if (entry.increasedIds && entry.increasedIds.length === 0) {
              entry.increasedIds = null;
            }
            if (entry.newmessages && entry.newmessages.length === 0) {
              entry.newmessages = null;
            }
            if (entry.adminViewCheckStat && entry.adminViewCheckStat.length === 0) {
              entry.adminViewCheckStat = null;
            }
            if (entry.newReplieObtainedQuestions && entry.newReplieObtainedQuestions.length === 0) {
              entry.newReplieObtainedQuestions = null;
            }
          }
        });

        const promises = [];   // STARMARK
        const updatedNotifications = [];

        async function processnewmessages() {
          for (const entry of viewNotifications) {
            if (entry.newmessages && entry.newmessages.length > 0) {
              const updatedNewMessages = [];
              for (const userId of entry.newmessages) {
                const userDetails = await userHelpers.getBasicUserProfileDetails(userId);
                const idWithName = { id: userId, name: userDetails.Name };
                updatedNewMessages.push(idWithName);
              }
              entry.newmessages = updatedNewMessages;
            }
            updatedNotifications.push(entry);
          }
        }
        processnewmessages();

        let firstNotification = [];
        let remainingNotification = [];

        function processNotifications(viewNotifications) {
          if (!viewNotifications || viewNotifications.length === 0) {
            // If no notifications found, do nothing
            return;
          } else if (viewNotifications.length > 1) {
            // If more than one element found, split into firstNotification and remainingNotification
            firstNotification = [viewNotifications[0]];
            remainingNotification = viewNotifications.slice(1);
          } else {
            // If only one element found, store it in firstNotification and create an empty array for remainingNotification
            firstNotification = [viewNotifications[0]];
            remainingNotification = [];
          }
        }
        processNotifications(viewNotifications);

        res.render('user/view_notifications',
          {
            user: true,
            showHeader1: true,
            showHeader2: true,
            uber, firstNotification,
            remainingNotification,
            admin_id, total_notify_number,
            total_message, groupchatcount
          });
          return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /viewNotifications:", err);
    res.status(500).send('Something went wrong');
  }
});


router.get('/add-skills', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        res.render('user/add-skills');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /add-skills:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/add-skills', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        await userHelpers.updateonetwoskilltwoeightProfile(req.session.user._id, req.body);
        res.redirect('/profile');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /add-skills/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.get('/edit-skills', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Domains = await userHelpers.getEditSkillProfileDetails(req.session.user._id);
        res.render('user/edit-skills', { Domains });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /edit-skills:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/edit-skills', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        console.log("BODY SKILL : ",req.body)
        await userHelpers.editskillProfile(req.session.user._id, req.body);
        res.redirect('/profile');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /edit-skills/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.get('/add-experience', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        res.render('user/add-experience');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /add-experience:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/add-experience',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.updateexperienceProfile(req.session.user._id,req.body).then(()=>{
        res.redirect('/profile')
        return;
      })
    } 
    else{
      res.render('user/view_page_disabled');
      return;
    }
  }else {
    res.redirect('/login');
    return;
  }
})


router.post('/edit_experience', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const experienceId = req.body.Expid;
        let experience = await userHelpers.getExperienceDetails(req.session.user._id, experienceId);
        res.render('user/edit-experience', { experience });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /edit-experience/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/edit-experience', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        await userHelpers.updateExperience(req.session.user._id, req.body);
        res.redirect('/profile');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /edit-experience/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/delete-experience-form-profile', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const response = await userHelpers.deleteExperience(req.session.user._id, req.body.ExperiencE);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /delete-experience-form-profile:", err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


router.get('/update-profile', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user = await userHelpers.getUpdateProfileDetails(req.session.user._id);
        res.render('user/update-profile', {user});
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /update-profile:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/update-profile', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        
        req.body.AdmissionYear = req.body.AdmissionYear.trim();
        req.body.passoutYear = req.body.passoutYear.trim();
        req.body.currentLocation = req.body.currentLocation.trim();

        await userHelpers.updateuserProfile(req.session.user._id, req.body);
        res.redirect('/profile');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /update-profile/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


//     INTERNSHIP PORTAL WITHOUT SKIP AND LIMIT MACHINE SORT
/*router.get('/internshipportal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus === 'active') {
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;

        // Fetch internship details
        let interns = await userHelpers.getInternDetails(userId);

        // Fetch block lists
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        interns = interns.filter(intern => !iblockList.includes(intern.UserId));
        interns = interns.filter(intern => !iwasblocklist.includes(intern.UserId));

        // Fetch internship JSON and user profile JSON
        let internsJson = await userHelpers.getDoc2VecInternModel(userId);
        let jsonProfile = await userHelpers.passIndiProfileRecJsonDoc2VecModel(userId);

        // Path to the Python script
        const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedInters.py');

        // Spawn Python process
        const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(internsJson), JSON.stringify(jsonProfile)], { encoding: 'utf-8' });
        const sortedInternshipsOutput = pythonProcess.stdout;

        // Parse the sorted internship user IDs
        const machineRecommended = sortedInternshipsOutput
          .split('\n')
          .map(entry => {
            const match = entry.match(/User ID: ([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(userId => userId !== null);

        //console.log("Machine Recommended Order: ", machineRecommended);

        // Sort internships based on the machine recommended order
        interns.sort((a, b) => {
          const indexA = machineRecommended.indexOf(a.UserId.toString());
          const indexB = machineRecommended.indexOf(b.UserId.toString());
          // Handle cases where intern IDs are not in the recommended list
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

        res.render('user/internshipportal', {
          interns,
          showHeader1: true,
          showHeader2: true,
          uber,
          machinesort: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } catch (error) {
        console.error("Error in /internshipportal:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});*/


//     INTERNSHIP PORTAL WITH SKIP AND LIMIT MACHINE SORT
router.get('/internshipportal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus === 'active') {
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;
        const skip = 0;
        const limit = 10;

        // Fetch internship details
        let interns = await userHelpers.getInternDetails_with_skip_limit(userId,skip, limit);

        // Fetch block lists
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        interns = interns.filter(intern => !iblockList.includes(intern.UserId));
        interns = interns.filter(intern => !iwasblocklist.includes(intern.UserId));
        req.session.user.iblockList = iblockList;
        req.session.user.iwasblocklist = iwasblocklist;

        // Fetch internship JSON and user profile JSON
        //let internsJson = await userHelpers.getDoc2VecInternModel(userId);
        let jsonProfile = req.session.user.jsonProfile;
        if(!req.session.user.jsonProfile && req.session.user.jsonProfile== undefined){
          jsonProfile = await userHelpers.passIndiProfileRecJsonDoc2VecModel(userId);
          req.session.user.jsonProfile = jsonProfile;
        }

        const internsJson = [];
        interns.forEach(internship => {
            const internshipInterests = {
                location: internship.LocationCurrent ? internship.LocationCurrent : "",
                interests: internship.interestarea ? [internship.interestarea] : []
            };
            internsJson.push({
                userId: internship._id ? internship._id : "",
                userName: internship.Name ? internship.Name : "",
                ...internshipInterests
            });
        });
        internsJson.forEach(data => {
            if (Array.isArray(data.interests)) {
                data.interests = data.interests.flat();
            }
        });

        // Path to the Python script
        const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedInters.py');

        // Spawn Python process
        const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(internsJson), JSON.stringify(jsonProfile)], { encoding: 'utf-8' });
        const sortedInternshipsOutput = pythonProcess.stdout;

        // Parse the sorted internship user IDs
        const machineRecommended = sortedInternshipsOutput
          .split('\n')
          .map(entry => {
            const match = entry.match(/User ID: ([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(userId => userId !== null);

        //console.log("Machine Recommended Order: ", machineRecommended);

        // Sort internships based on the machine recommended order
        interns.sort((a, b) => {
          const indexA = machineRecommended.indexOf(a.UserId.toString());
          const indexB = machineRecommended.indexOf(b.UserId.toString());
          // Handle cases where intern IDs are not in the recommended list
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

        res.render('user/internshipportal', {
          interns,
          showHeader1: true,
          showHeader2: true,
          uber,
          machinesort: true,
          groupchatcount,
          total_message,
          total_notify_number,
          limit
        });
        return;
      } catch (error) {
        console.error("Error in /internshipportal:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


//     INTERNSHIP PORTAL WITHOUT SKIP AND LIMIT TIME SORT
/*router.get('/internship_portal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus === 'active') {
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;

        // Fetch internship details
        let interns = await userHelpers.getInternDetails(userId);

        // Fetch block lists
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        interns = interns.filter(intern => !iblockList.includes(intern.UserId));
        interns = interns.filter(intern => !iwasblocklist.includes(intern.UserId));

        interns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.render('user/internshipportal', {
          interns,
          showHeader1: true,
          showHeader2: true,
          uber,
          timesort: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } catch (error) {
        console.error("Error in /internshipportal:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});*/


//     INTERNSHIP PORTAL WITH SKIP AND LIMIT TIME SORT
router.get('/internship_portal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus === 'active') {
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;

        const skip = 0;
        const limit = 10;
        let interns = await userHelpers.getInternDetails_with_skip_limit(userId,skip, limit);

        // Fetch block lists
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        interns = interns.filter(intern => !iblockList.includes(intern.UserId));
        interns = interns.filter(intern => !iwasblocklist.includes(intern.UserId));
        req.session.user.iblockList = iblockList;
        req.session.user.iwasblocklist = iwasblocklist;


        res.render('user/internshipportal', {
          interns,
          showHeader1: true,
          showHeader2: true,
          uber,
          timesort: true,
          groupchatcount,
          total_message,
          total_notify_number,
          limit
        });
        return;
      } catch (error) {
        console.error("Error in /internshipportal:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


router.post('/get_remaining_interns', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let interns = await userHelpers.getInternDetails_with_skip_limit(userId,skip, limit);

        let iblockList = req.session.user.iblockList;
        let iwasblocklist = req.session.user.iwasblocklist;
        interns = interns.filter(intern => !iblockList.includes(intern.UserId));
        interns = interns.filter(intern => !iwasblocklist.includes(intern.UserId));
        
        res.json({ success: true, interns });

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering job portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/get_remaining_intern', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {

        let userId = req.session.user._id;
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        
        // Fetch interns details
        let interns = await userHelpers.getInternDetails_with_skip_limit(userId,skip, limit);

        // Fetch block lists
        let iblockList = req.session.user.iblockList;
        let iwasblocklist = req.session.user.iwasblocklist;
        interns = interns.filter(intern => !iblockList.includes(intern._id.toString()));
        interns = interns.filter(intern => !iwasblocklist.includes(intern._id.toString()));

        const jsonProfile = req.session.user.jsonProfile; 

        const internsJson = [];
        interns.forEach(internship => {
            const internshipInterests = {
                location: internship.LocationCurrent ? internship.LocationCurrent : "",
                interests: internship.interestarea ? [internship.interestarea] : []
            };
            internsJson.push({
                userId: internship._id ? internship._id : "",
                userName: internship.Name ? internship.Name : "",
                ...internshipInterests
            });
        });
        internsJson.forEach(data => {
            if (Array.isArray(data.interests)) {
                data.interests = data.interests.flat();
            }
        });

        // Path to the Python script
        const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedInters.py');

        // Spawn Python process
        const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(internsJson), JSON.stringify(jsonProfile)], { encoding: 'utf-8' });
        const sortedInternshipsOutput = pythonProcess.stdout;

        // Parse the sorted internship user IDs
        const machineRecommended = sortedInternshipsOutput
          .split('\n')
          .map(entry => {
            const match = entry.match(/User ID: ([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(userId => userId !== null);

        //console.log("Machine Recommended Order: ", machineRecommended);

        // Sort internships based on the machine recommended order
        interns.sort((a, b) => {
          const indexA = machineRecommended.indexOf(a.UserId.toString());
          const indexB = machineRecommended.indexOf(b.UserId.toString());
          // Handle cases where intern IDs are not in the recommended list
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });
        
        res.json({ success: true, interns });

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering job portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/internship-details', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let indintern = await userHelpers.getIndividualInternshipDetails(req.body.InternId);
        let uber = req.session.user.Name;
        res.render('user/internship-details', {
          indintern,
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /internship-details/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/delete-internship-form-portal', (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        userHelpers.deleteInternship(req.body.InterN, req.session.user._id).then((response) => {
          res.json(response);
          if (response.deleteIntern) {
            const internImagedir = path.resolve(__dirname, '../public/internship-folder/profile-pictures');
            const internImagePath = path.join(internImagedir, req.body.InterN); // Construct the image path
            const internResumedir = path.resolve(__dirname, '../public/internship-folder/resumes');
            const internResumePath = path.join(internResumedir, req.body.InterN); // Construct the image path
            
            // Check for image files with different extensions
            const imgextensions = [
              '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', 
              '.ico', '.heif', '.raw', '.jfif', '.avif', '.exif'
            ];

            const docextension = [ '.pdf', '.doc', '.docx' ]
            
            for (const ext of imgextensions) {
              const filePath = internImagePath + ext;
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Delete the image
                break; // Exit the loop once the image is found and deleted
              }
            }

            for (const ext of docextension) {
              const filePath = internResumePath + ext;
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Delete the image
                break; // Exit the loop once the image is found and deleted
              }
            }
          }
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /delete-internship-form-portal:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/edit_internship', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const internshipId = req.body.InternId;
        let UserID = req.session.user._id;
        let intern = await userHelpers.getIndividualInternshipDetail(internshipId);
        let intern_owner = intern.UserId;
        if(intern_owner == UserID){
          res.render('user/edit-internship', { intern });
          return;
        } else if(intern_owner != UserID){
          res.render('user/unauthorized_attempt');
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /edit-internship/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/edit-internship', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let INTERNID = req.body.InternID;
        let editInternstat = await userHelpers.updateInternship(req.body, req.session.user._id);
        
        // Redirect first before handling file uploads to avoid sending headers twice
        res.redirect('/review-apply-internship');
        
        if (editInternstat.editedIntern) {
          // Handle profile picture upload
          let image = req.files ? req.files.ProfilePicture : null;
          if (image) {
            const internImagesDir = path.resolve(__dirname, '../public/internship-folder/profile-pictures');
            if (!fs.existsSync(internImagesDir)) {
              fs.mkdirSync(internImagesDir, { recursive: true });
            }
            const imageFileName = INTERNID + '.jpg';
            const outputPath = './public/internship-folder/profile-pictures/' + imageFileName;
            const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
              workerData: {
                imageBuffer: image.data,
                outputPath: outputPath
              }
            });

            worker.on('message', async (message) => {
              if (message.status === 'success') {
                await userHelpers.updateInternProfilePicture(INTERNID, imageFileName);
              } else {
                console.error('Error processing image:', message.error);
              }
            });

            worker.on('error', (error) => {
              console.error('Worker error:', error);
            });

            worker.on('exit', (code) => {
              if (code !== 0) {
                console.error('Worker stopped with exit code', code);
              }
            });
          }
          
          // Handle resume upload
          let resume = req.files ? req.files.resume : null;
          if (resume) {
            const internResumeDir = path.resolve(__dirname, '../public/internship-folder/resumes');
            if (!fs.existsSync(internResumeDir)) {
              fs.mkdirSync(internResumeDir, { recursive: true });
            }
            const resumeFileName = INTERNID + path.extname(resume.name);
            resume.mv('./public/internship-folder/resumes/' + resumeFileName, (err) => {
              if (err) {
                console.error("Error uploading resume:", err);
              }
            });
          }
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /edit-internship/:id:", err);
    res.status(500).send('Something went wrong');
  }
});


router.get('/addintern', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const userId = req.session.user._id;
        let Gender = req.session.user.Gender
        res.render('user/addintern', { userId, Gender});
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (err) {
    console.error("Error in /addintern:", err);
    res.status(500).send('Something went wrong');
  }
});


router.post('/addintern', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      const userDatas = { ...req.body, UserId: req.session.user._id, Name: req.session.user.Name };
      try {
        const insertedInternId = await userHelpers.addIntern(userDatas);

        let image = req.files ? req.files.ProfilePicture : null;
        if (image) {
          const internImagesDir = path.resolve(__dirname, '../public/internship-folder/profile-pictures');
          if (!fs.existsSync(internImagesDir)) {
            fs.mkdirSync(internImagesDir, { recursive: true });
          }
          const imageFileName = insertedInternId + '.jpg';
          const outputPath = './public/internship-folder/profile-pictures/' + imageFileName;
          const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
            workerData: {
              imageBuffer: image.data,
              outputPath: outputPath
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              await userHelpers.updateInternProfilePicture(insertedInternId, imageFileName);
            } else {
              console.error('Error processing image:', message.error);
              throw new Error('Image processing failed'); // Throw error to trigger catch block
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            throw error; // Throw error to trigger catch block
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              throw new Error('Worker stopped with exit code ' + code); // Throw error to trigger catch block
            }
          });
        }

        let resume = req.files ? req.files.resume : null;
        if (resume) {
          const internResumeDir = path.resolve(__dirname, '../public/internship-folder/resumes');
          if (!fs.existsSync(internResumeDir)) {
            fs.mkdirSync(internResumeDir, { recursive: true });
          }
          const resumeFileName = insertedInternId + path.extname(resume.name);
          resume.mv('./public/internship-folder/resumes/' + resumeFileName, (err) => {
            if (err) {
              console.error("Error uploading resume:", err);
              throw err; // Throw the error to trigger catch block
            }
          });
          await userHelpers.updateInternResume(insertedInternId, resumeFileName);
        }

        res.redirect('/profile');
        return;
      } catch (error) {
        console.error("Error in /addintern/:id:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


//  MAIL SERVICE INTEGRATED
/*router.post('/addintern', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      const userDatas = { ...req.body, UserId: req.session.user._id, Name: req.session.user.Name };
      try {
        const insertedInternId = await userHelpers.addIntern(userDatas);

        let image = req.files ? req.files.ProfilePicture : null;
        if (image) {
          const internImagesDir = path.resolve(__dirname, '../public/internship-folder/profile-pictures');
          if (!fs.existsSync(internImagesDir)) {
            fs.mkdirSync(internImagesDir, { recursive: true });
          }
          const imageFileName = insertedInternId + '.jpg';
          const outputPath = './public/internship-folder/profile-pictures/' + imageFileName;
          const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
            workerData: {
              imageBuffer: image.data,
              outputPath: outputPath
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              await userHelpers.updateInternProfilePicture(insertedInternId, imageFileName);
            } else {
              console.error('Error processing image:', message.error);
              throw new Error('Image processing failed'); // Throw error to trigger catch block
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            throw error; // Throw error to trigger catch block
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              throw new Error('Worker stopped with exit code ' + code); // Throw error to trigger catch block
            }
          });
        }

        let resume = req.files ? req.files.resume : null;
        if (resume) {
          const internResumeDir = path.resolve(__dirname, '../public/internship-folder/resumes');
          if (!fs.existsSync(internResumeDir)) {
            fs.mkdirSync(internResumeDir, { recursive: true });
          }
          const resumeFileName = insertedInternId + path.extname(resume.name);
          resume.mv('./public/internship-folder/resumes/' + resumeFileName, (err) => {
            if (err) {
              console.error("Error uploading resume:", err);
              throw err; // Throw the error to trigger catch block
            }
          });
          await userHelpers.updateInternResume(insertedInternId, resumeFileName);
        }

        res.redirect('/profile');


        // Prepare the content for the emails
        const workModeText = req.body.workmode === 'inoffice' ? 'In Office' : 
          req.body.workmode === 'workhome' ? 'Work from Home' : 
          'Not Specified';

        const questionContent = 
          `<p>A new internship request was added:</p>
          <p><strong>Currently looking for :</strong> ${req.body.jobintern}</p>
          <p><strong>Seeking for job / internship in the field of :</strong> ${req.body.Interest}</p>
          <p><strong>Work mode preferred:</strong> ${workModeText}</p>
          <p><strong>Current location:</strong> ${req.body.LocationCurrent}</p>
          <p><strong>Posted by:</strong> ${req.session.user.Name}</p>
          <p>Visit the alumni relations cell website to reply or view more.</p>`;

          
        // Get all emails
        let mailsall = await userHelpers.getAllMailOfAlumni();
        const myMail = req.session.user.Email;
        const adminMail = await userHelpers.getBaseAdminMail();
        mailsall.push(adminMail.Email);

        // Send email to all users except `myMail`
        for (const email of mailsall) {
          if (email !== myMail) {
            const mailOptions = {
              from: 'anandhueducateanddevelop@gmail.com',
              to: email,
              subject: 'New internship request : ',
              html: questionContent
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('Error sending email:', error);
              } else {
                console.log('Email sent:', info.response);
              }
            });
          }
        }

        // Send confirmation email to `myMail`
        const myMailOptions = {
          from: 'anandhueducateanddevelop@gmail.com',
          to: myMail,
          subject: 'Internship request submitted Successfully',
          text: 'Your Internship request sent successfully.'
        };

        transporter.sendMail(myMailOptions, (error, info) => {
          if (error) {
            console.error('Error sending confirmation email:', error);
          } else {
            console.log('Confirmation email sent:', info.response);
          }
        });

        return;
      } catch (error) {
        console.error("Error in /addintern/:id:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});*/


router.get('/review-apply-internship', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const userId = req.session.user._id;
        let internsdata = await userHelpers.getEditInternshipDetails(userId);
        let uber = req.session.user.Name;
        res.render('user/review-apply-internship', 
        { 
          internsdata, 
          showHeader1: true, 
          showHeader2: true, uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } catch (error) {
        console.error("Error in /review-apply-internship:", error);
        res.status(500).send('Internal Server Error');
      }
    } 
    else{
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


//    JOB PORTAL WITHOUT SKIP LIMIT FOR MACHINE SORT
/*router.get('/jobportal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus === 'active') {
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;

        // Fetch job details
        let jobs = await userHelpers.getJobDetails(userId);

        // Fetch block lists
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        jobs = jobs.filter(job => !iblockList.includes(job._id.toString()));
        jobs = jobs.filter(job => !iwasblocklist.includes(job._id.toString()));

        // Fetch job JSON and user profile JSON
        let jobsjson = await userHelpers.getDoc2VecJobModel(userId);
        let jsonProfile = await userHelpers.passIndiProfileRecJsonDoc2VecModel(userId);

        // Path to the Python script
        const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedJobs.py');

        // Spawn Python process
        const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(jobsjson), JSON.stringify(jsonProfile)], { encoding: 'utf-8' });
        const sortedJobsOutput = pythonProcess.stdout;

        // Parse the sorted job user IDs
        const machineRecommended = sortedJobsOutput
          .split('\n')
          .map(entry => {
            const match = entry.match(/User ID: ([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(userId => userId !== null);

        //console.log("Machine Recommended Order: ", machineRecommended);

        // Mark jobs as requested or not requested
        jobs.forEach(job => {
          if (job.requests && job.requests.includes(userId.toString())) {
            job.requested = true;
            job.not_requested = false;
          } else {
            job.requested = false;
            job.not_requested = true;
          }
        });

        // Sort jobs based on the machine recommended order
        jobs.sort((a, b) => {
          const indexA = machineRecommended.indexOf(a._id.toString());
          const indexB = machineRecommended.indexOf(b._id.toString());
          // Handle cases where job IDs are not in the recommended list
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

        // Render the job portal page
        res.render('user/jobportal', {
          jobs,
          showHeader1: true,
          showHeader2: true,
          uber,
          userId,
          machinesort: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } catch (error) {
        console.error("Error in /jobportal:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});*/


//    JOB PORTAL WITH SKIP LIMIT FOR MACHINE SORT
router.get('/jobportal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus === 'active') {
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;
        const skip = 0;
        const limit = 10;
        
        // Fetch job details
        let jobs = await userHelpers.getJobDetails_with_skip_limit(userId,skip, limit);

        // Fetch block lists
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        req.session.user.iblockList = iblockList;
        req.session.user.iwasblocklist = iwasblocklist;
        jobs = jobs.filter(job => !iblockList.includes(job._id.toString()));
        jobs = jobs.filter(job => !iwasblocklist.includes(job._id.toString()));

        // Fetch job JSON and user profile JSON
        //let jobsjson = await userHelpers.getDoc2VecJobModel(userId);
        let jsonProfile = req.session.user.jsonProfile;
        if(!req.session.user.jsonProfile && req.session.user.jsonProfile== undefined){
          jsonProfile = await userHelpers.passIndiProfileRecJsonDoc2VecModel(userId);
          req.session.user.jsonProfile = jsonProfile;
        }

        const jobsjson = [];
        jobs.forEach(jobs => {
            const jobInterests = {
                CompanyName: jobs.CompanyName ? jobs.CompanyName : "",
                CompanyDescription: jobs.CompanyDescription ? jobs.CompanyDescription : "",
                jobDescription: jobs.jobDescription ? jobs.jobDescription : "",
                Jobrole: jobs.Jobrole ? jobs.Jobrole : "",
                Eligibility: jobs.Eligibility ? jobs.Eligibility : "",
                Branch: jobs.Branch ? jobs.Branch : ""
            };
            jobsjson.push({
                userId: jobs._id ? jobs._id : "",
                userName: jobs.Name ? jobs.Name : "",
                ...jobInterests
            });
        });
        jobsjson.forEach(data => {
            if (Array.isArray(data.interests)) {
                data.interests = data.interests.flat();
            }
        });

        // Path to the Python script
        const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedJobs.py');

        // Spawn Python process
        const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(jobsjson), JSON.stringify(jsonProfile)], { encoding: 'utf-8' });
        const sortedJobsOutput = pythonProcess.stdout;

        // Parse the sorted job user IDs
        const machineRecommended = sortedJobsOutput
          .split('\n')
          .map(entry => {
            const match = entry.match(/User ID: ([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(userId => userId !== null);

        // Mark jobs as requested or not requested
        jobs.forEach(job => {
          if (job.requests && job.requests.includes(userId.toString())) {
            job.requested = true;
            job.not_requested = false;
          } else {
            job.requested = false;
            job.not_requested = true;
          }
        });

        // Sort jobs based on the machine recommended order
        jobs.sort((a, b) => {
          const indexA = machineRecommended.indexOf(a._id.toString());
          const indexB = machineRecommended.indexOf(b._id.toString());
          // Handle cases where job IDs are not in the recommended list
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

        // Render the job portal page
        res.render('user/jobportal', {
          jobs,
          showHeader1: true,
          showHeader2: true,
          uber,
          userId,
          machinesort: true,
          groupchatcount,
          total_message,
          total_notify_number,
          limit
        });
        return;
      } catch (error) {
        console.error("Error in /jobportal:", error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


//    JOB PORTAL WITHOUT SKIP LIMIT FOR TIME SORT
/*router.get('/job_portal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;
        let jobs = await userHelpers.getJobDetails(userId);

        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        jobs = jobs.filter(job => !iblockList.includes(job.UserId));
        jobs = jobs.filter(job => !iwasblocklist.includes(job.UserId));

        jobs.forEach(job => {
          if (job.requests && job.requests.includes(userId.toString())) {
            job.requested = true;
            job.not_requested = false;
          } else {
            job.requested = false;
            job.not_requested = true;
          } 
        });

        jobs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.render('user/jobportal', 
        { 
          jobs,
          showHeader1: true,
          showHeader2: true,
          uber, userId, timesort: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } catch (error) {
        console.error("Error in /job_portal:", error);
        res.status(500).send('Internal Server Error');
      }
    } 
    else{
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});*/


//    JOB PORTAL WITH SKIP LIMIT FOR TIME SORT
router.get('/job_portal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      try {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;

        const skip = 0;
        const limit = 10;
        let jobs = await userHelpers.getJobDetails_with_skip_limit(userId,skip, limit);

        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);
        jobs = jobs.filter(job => !iblockList.includes(job.UserId));
        jobs = jobs.filter(job => !iwasblocklist.includes(job.UserId));
        req.session.user.iblockList = iblockList;
        req.session.user.iwasblocklist = iwasblocklist;

        jobs.forEach(job => {
          if (job.requests && job.requests.includes(userId.toString())) {
            job.requested = true;
            job.not_requested = false;
          } else {
            job.requested = false;
            job.not_requested = true;
          } 
        });

        res.render('user/jobportal', 
        { 
          jobs,
          showHeader1: true,
          showHeader2: true,
          uber, userId, timesort: true,
          groupchatcount,
          total_message,
          total_notify_number,
          limit
        });
        return;
      } catch (error) {
        console.error("Error in /job_portal:", error);
        res.status(500).send('Internal Server Error');
      }
    } 
    else{
      res.render('user/view_page_disabled');
      return;
    }
  } else {
    res.redirect('/login');
    return;
  }
});


router.post('/get_remaining_jobs', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let jobs = await userHelpers.getJobDetails_with_skip_limit(userId,skip, limit);

        let iblockList = req.session.user.iblockList;
        let iwasblocklist = req.session.user.iwasblocklist;
        jobs = jobs.filter(job => !iblockList.includes(job.UserId));
        jobs = jobs.filter(job => !iwasblocklist.includes(job.UserId));

        jobs.forEach(job => {
          if (job.requests && job.requests.includes(userId.toString())) {
            job.requested = true;
            job.not_requested = false;
          } else {
            job.requested = false;
            job.not_requested = true;
          } 
        });
        
        res.json({ success: true, jobs });

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering job portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/get_remaining_job', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {

        let userId = req.session.user._id;
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        
        // Fetch job details
        let jobs = await userHelpers.getJobDetails_with_skip_limit(userId,skip, limit);

        // Fetch block lists
        let iblockList = req.session.user.iblockList;
        let iwasblocklist = req.session.user.iwasblocklist;
        jobs = jobs.filter(job => !iblockList.includes(job._id.toString()));
        jobs = jobs.filter(job => !iwasblocklist.includes(job._id.toString()));

        const jsonProfile = req.session.user.jsonProfile; 

        const jobsjson = [];
        jobs.forEach(jobs => {
            const jobInterests = {
                CompanyName: jobs.CompanyName ? jobs.CompanyName : "",
                CompanyDescription: jobs.CompanyDescription ? jobs.CompanyDescription : "",
                jobDescription: jobs.jobDescription ? jobs.jobDescription : "",
                Jobrole: jobs.Jobrole ? jobs.Jobrole : "",
                Eligibility: jobs.Eligibility ? jobs.Eligibility : "",
                Branch: jobs.Branch ? jobs.Branch : ""
            };
            jobsjson.push({
                userId: jobs._id ? jobs._id : "",
                userName: jobs.Name ? jobs.Name : "",
                ...jobInterests
            });
        });
        jobsjson.forEach(data => {
            if (Array.isArray(data.interests)) {
                data.interests = data.interests.flat();
            }
        });

        // Path to the Python script
        const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedJobs.py');

        // Spawn Python process
        const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(jobsjson), JSON.stringify(jsonProfile)], { encoding: 'utf-8' });
        const sortedJobsOutput = pythonProcess.stdout;

        // Parse the sorted job user IDs
        const machineRecommended = sortedJobsOutput
          .split('\n')
          .map(entry => {
            const match = entry.match(/User ID: ([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(userId => userId !== null);

        // Mark jobs as requested or not requested
        jobs.forEach(job => {
          if (job.requests && job.requests.includes(userId.toString())) {
            job.requested = true;
            job.not_requested = false;
          } else {
            job.requested = false;
            job.not_requested = true;
          }
        });

        // Sort jobs based on the machine recommended order
        jobs.sort((a, b) => {
          const indexA = machineRecommended.indexOf(a._id.toString());
          const indexB = machineRecommended.indexOf(b._id.toString());
          // Handle cases where job IDs are not in the recommended list
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });
        
        res.json({ success: true, jobs });

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering job portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.get('/addjob', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        res.render('user/addjob');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /addjob:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/view-edit-delete-jobs', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const userId = req.session.user._id;
        let jobs = await userHelpers.getEditJobDetails(userId);
        
        let uber = req.session.user.Name;
        res.render('user/view-edit-delete-job', 
        { 
          jobs,
          showHeader1: true, 
          showHeader2: true, 
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /view-edit-delete-jobs:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/addjob', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const userData = { 
          ...req.body, 
          UserId: req.session.user._id, 
          Name: req.session.user.Name, 
          Branch: req.session.user.Branch, 
          PostedBy: "user" 
        };
        const insertedJobId = await userHelpers.addJob(userData);
        let image = req.files ? req.files.JobImage : null;
        if (image) {
          const jobImagesDir = path.resolve(__dirname, '../public/job-images');
          if (!fs.existsSync(jobImagesDir)) {
            fs.mkdirSync(jobImagesDir, { recursive: true });
          }
          const outputPath = './public/job-images/' + insertedJobId + '.jpg';
          const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
            workerData: {
              imageBuffer: image.data,
              outputPath: outputPath
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              await userHelpers.AddJobHasImage(insertedJobId);
              res.redirect('/profile');
              return
            } else {
              console.error('Error processing image:', message.error);
              res.status(500).send('Error processing image');
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            res.status(500).send('Internal Server Error');
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              res.status(500).send('Internal Server Error');
            }
          });
        } else {
          res.redirect('/profile');
          return
        }
      } else {
        res.render('user/view_page_disabled');
        return
      }
    } else {
      res.redirect('/login');
      return
    }
  } catch (error) {
    console.error("Error in /addjob/:id:", error);
    res.status(500).send('Internal Server Error');
  }
});


//  MAIL SERVICE INTEGRATED
/*router.post('/addjob', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const userData = { 
          ...req.body, 
          UserId: req.session.user._id, 
          Name: req.session.user.Name, 
          Branch: req.session.user.Branch, 
          PostedBy: "user" 
        };
        const insertedJobId = await userHelpers.addJob(userData);

        // Get all emails
        let mailsall = await userHelpers.getallMail();
        const myMail = req.session.user.Email;
        const adminMail = await userHelpers.getBaseAdminMail();
        mailsall.push(adminMail.Email);

        let image = req.files ? req.files.JobImage : null;
        if (image) {
          const jobImagesDir = path.resolve(__dirname, '../public/job-images');
          if (!fs.existsSync(jobImagesDir)) {
            fs.mkdirSync(jobImagesDir, { recursive: true });
          }
          const outputPath = './public/job-images/' + insertedJobId + '.jpg';
          const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
            workerData: {
              imageBuffer: image.data,
              outputPath: outputPath
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              await userHelpers.AddJobHasImage(insertedJobId);
              res.redirect('/profile');

              // Prepare the content for the emails
              const jobContent = req.body.JobLink ? 
                `<p>A new job was added:</p>
                 <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
                 <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
                 <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
                 <p><strong>Posted by:</strong> ${req.session.user.Name}</p>
                 <p><strong>Apply:</strong> <a href="${req.body.JobLink}">${req.body.JobLink}</a></p>
                 <p>Visit the alumni relations cell website to reply or view more.</p>` :
                `<p>A new job was added:</p>
                 <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
                 <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
                 <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
                 <p><strong>Posted by:</strong> ${req.session.user.Name}</p>
                 <p>Visit the alumni relations cell website to reply or view more.</p>`;

              // Send email to all users except `myMail`
              for (const email of mailsall) {
                if (email !== myMail) {
                  const mailOptions = {
                    from: 'anandhueducateanddevelop@gmail.com',
                    to: email,
                    subject: 'New Job Added',
                    html: jobContent
                  };

                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.error('Error sending email:', error);
                    } else {
                      console.log('Email sent:', info.response);
                    }
                  });
                }
              }

              // Send confirmation email to `myMail`
              const myMailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: myMail,
                subject: 'Job Submitted Successfully',
                text: 'Your job was added successfully.'
              };

              transporter.sendMail(myMailOptions, (error, info) => {
                if (error) {
                  console.error('Error sending confirmation email:', error);
                } else {
                  console.log('Confirmation email sent:', info.response);
                }
              });

              return;
            } else {
              console.error('Error processing image:', message.error);
              res.status(500).send('Error processing image');
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            res.status(500).send('Internal Server Error');
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              res.status(500).send('Internal Server Error');
            }
          });
        } else {
          res.redirect('/profile');

          // Prepare the content for the emails
          const jobContent = req.body.JobLink ? 
            `<p>A new job was added:</p>
             <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
             <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
             <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
             <p><strong>Posted by:</strong> ${req.session.user.Name}</p>
             <p><strong>Apply:</strong> <a href="${req.body.JobLink}">${req.body.JobLink}</a></p>
             <p>Visit the alumni relations cell website to reply or view more.</p>` :
            `<p>A new job was added:</p>
             <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
             <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
             <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
             <p><strong>Posted by:</strong> ${req.session.user.Name}</p>
             <p>Visit the alumni relations cell website to reply or view more.</p>`;

          // Send email to all users except `myMail`
          for (const email of mailsall) {
            if (email !== myMail) {
              const mailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: email,
                subject: 'New Job Added',
                html: jobContent
              };

              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.error('Error sending email:', error);
                } else {
                  console.log('Email sent:', info.response);
                }
              });
            }
          }

          // Send confirmation email to `myMail`
          const myMailOptions = {
            from: 'anandhueducateanddevelop@gmail.com',
            to: myMail,
            subject: 'Job Submitted Successfully',
            text: 'Your job was added successfully.'
          };

          transporter.sendMail(myMailOptions, (error, info) => {
            if (error) {
              console.error('Error sending confirmation email:', error);
            } else {
              console.log('Confirmation email sent:', info.response);
            }
          });

          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return
      }
    } else {
      res.redirect('/login');
      return
    }
  } catch (error) {
    console.error("Error in /addjob/:id:", error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.post('/edit_job', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const jobId = req.body.Jobid;
        let user_id = req.session.user._id
        let job = await userHelpers.getIndividualJobDetail(jobId);
        let job_owner = job.UserId
        if(user_id == job_owner){
          res.render('user/edit-job', {job});
          return;
        }
        else if(user_id != job_owner){
          res.render('user/unauthorized_attempt');
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /edit-job/:id:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_job_requests', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let userID = req.session.user._id;
        const jobId = req.body.Jobid;
        let jobOwnerId = await userHelpers.getJobOwnerFromJob(jobId) // ONLY USERID PASSED
        if(userID == jobOwnerId){
          let score = await userHelpers.putJobRecomendationScore(jobId);
          let user = await userHelpers.getuserDetailsForrequest(score);  //  ID, SCORE, NAME, STATUS
          await userHelpers.setRequestViewForNotificationToNull(jobId)
          res.render('user/view_job_requests', {
            user,
            showHeader1: true,
            showHeader2: true,
            uber,
            groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        } else if (userID != jobOwnerId){
          res.render('user/unauthorized_attempt')
          return
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /view_job_requests/:id:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/edit-job', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let editedJobsuccess = await userHelpers.updateJob(req.body, req.session.user._id);
        res.redirect('/view-edit-delete-jobs');

        if (editedJobsuccess.editedJob) {
          let image = req.files ? req.files.JobImage : null;
          if (image) {
            const jobImagesDir = path.resolve(__dirname, '../public/job-images');
            if (!fs.existsSync(jobImagesDir)) {
              fs.mkdirSync(jobImagesDir, { recursive: true });
            }
            const outputPath = './public/job-images/' + req.body.Jobid + '.jpg';
            const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
              workerData: {
                imageBuffer: image.data,
                outputPath: outputPath
              }
            });

            worker.on('message', async (message) => {
              if (message.status === 'success') {
                await userHelpers.AddJobHasImage(req.body.Jobid);
              } else {
                console.error('Error processing image:', message.error);
              }
            });

            worker.on('error', (error) => {
              console.error('Worker error:', error);
            });

            worker.on('exit', (code) => {
              if (code !== 0) {
                console.error('Worker stopped with exit code', code);
              }
            });
          }
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in /edit-job/:id:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/send_job_request', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      let requested_user_id = req.body.userId;
      let job_id = req.body.job_id;
      try {
        // Attempt to add the job recommendation request
        const { userAdded } = await userHelpers.putJobRecomendationRequest(requested_user_id, job_id);

        // Send the response indicating whether the user was added or not
        res.json({ success: true, userAdded: userAdded });

        // Only proceed with the email notification logic if the user was added
        if (userAdded) {
          let request_counted = await userHelpers.getRequestViewForNotification(job_id);

          if (request_counted % 5 === 0) {
            if (req.session.user.lastJobRequestSended == null) {
              req.session.user.lastJobRequestSended = await userHelpers.getlastRequestNotificationSended(job_id);
              if (req.session.user.lastJobRequestSended == null) {
                // LOGIC TO SEND FIRST MAIL
                console.log("FIRST EMAIL SENT SEND JOB REQUEST");
                await userHelpers.setlastRequestNotificationSended(job_id);
                req.session.user.lastJobRequestSended = new Date();
              }
            }

            const isNewDay = isDifferentDay(req.session.user.lastJobRequestSended);
            if (isNewDay) {
              req.session.user.lastJobRequestSended = await userHelpers.getlastRequestNotificationSended(job_id);
              const isNewDayReVerify = isDifferentDay(req.session.user.lastJobRequestSended);
              if (isNewDayReVerify) {
                // SEND MAIL LOGIC HERE
                console.log("NOTIFICATION MAIL SENT - SEND JOB REQUEST.");
                await userHelpers.setlastRequestNotificationSended(job_id);
                req.session.user.lastJobRequestSended = new Date();
              }
            }
          }
        }

        return

      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
        return
      }
    } else {
      res.render('user/view_page_disabled');
    }
  } else {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
});


//   EMAIL INTEGRATION
/*router.post('/send_job_request', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      let requested_user_id = req.body.userId;
      let job_id = req.body.job_id;
      try {
        // Attempt to add the job recommendation request
        const { userAdded } = await userHelpers.putJobRecomendationRequest(requested_user_id, job_id);

        // Send the response indicating whether the user was added or not
        res.json({ success: true, userAdded: userAdded });

        // Only proceed with the email notification logic if the user was added
        if (userAdded) {
          let request_counted = await userHelpers.getRequestViewForNotification(job_id);

          if (request_counted % 5 === 0) {
            if (req.session.user.lastJobRequestSended == null) {
              req.session.user.lastJobRequestSended = await userHelpers.getlastRequestNotificationSended(job_id);
              if (req.session.user.lastJobRequestSended == null) {
                // LOGIC TO SEND FIRST MAIL

                // GET REQUIRED EMAIL
                const usermail = await userHelpers.getUserMailFromJobId(job_id)

                const mailOptions = {
                  from: "anandhueducateanddevelop@gmail.com",
                  to: usermail.email,
                  subject: 'Job requests',
                  text: `You are getting new requsts for a job you posted. Visit student alumni relations cell for more`
                };

                transporter.sendMail(mailOptions, async(error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send('Error sending OTP');
                  }
                  console.log('Email sent:', info.response);
                });

                await userHelpers.setlastRequestNotificationSended(job_id);
                req.session.user.lastJobRequestSended = new Date();
              }
            }

            const isNewDay = isDifferentDay(req.session.user.lastJobRequestSended);
            if (isNewDay) {
              req.session.user.lastJobRequestSended = await userHelpers.getlastRequestNotificationSended(job_id);
              const isNewDayReVerify = isDifferentDay(req.session.user.lastJobRequestSended);
              if (isNewDayReVerify) {
                // SEND MAIL LOGIC HERE

                // GET REQUIRED EMAIL
                const usermail = await userHelpers.getUserMailFromJobId(job_id)

                const mailOptions = {
                  from: "anandhueducateanddevelop@gmail.com",
                  to: usermail.email,
                  subject: 'Job requests',
                  text: `You are getting new requsts for a job you posted. Visit student alumni relations cell for more`
                };

                transporter.sendMail(mailOptions, async(error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send('Error sending OTP');
                  }
                  console.log('Email sent:', info.response);
                });

                await userHelpers.setlastRequestNotificationSended(job_id);
                req.session.user.lastJobRequestSended = new Date();
              }
            }
          }
        }

        return

      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
        return
      }
    } else {
      res.render('user/view_page_disabled');
    }
  } else {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
});*/


router.post('/delete-job-form-portal', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let response = await userHelpers.deleteJob(req.body.JoB, req.session.user._id);
        res.json(response);
        if (response.deleteJob) {
          const jobImagesDir = path.resolve(__dirname, '../public/job-images');
          const jobImagePath = path.join(jobImagesDir, req.body.JoB); // Construct the image path
          
          // Check for image files with different extensions
          const extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', 
            '.ico', '.heif', '.raw', '.jfif', '.avif', '.exif'
          ];
          
          for (const ext of extensions) {
            const filePath = jobImagePath + ext;
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath); // Delete the image
              break; // Exit the loop once the image is found and deleted
            }
          }
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/delete_jobimage_from_portal', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let response = await userHelpers.deleteJobImage(req.body.JoB, req.session.user._id);
        res.json(response);
        if (response.deleteJobImage) {
          const jobImagesDir = path.resolve(__dirname, '../public/job-images');
          const jobImagePath = path.join(jobImagesDir, req.body.JoB); // Construct the image path
          
          // Check for image files with different extensions
          const extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', 
            '.ico', '.heif', '.raw', '.jfif', '.avif', '.exif'
          ];
          
          for (const ext of extensions) {
            const filePath = jobImagePath + ext;
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath); // Delete the image
              break; // Exit the loop once the image is found and deleted
            }
          }
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/groupchat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        if(!req.session.user.restrict_group || req.session.user.restrict_group != true)
        {
          //const referrer = req.get('Referrer');
          let total_notify_number = req.session.total_notify_number;
          let total_message = req.session.total_message;
          let groupchatcount = req.session.groupchatcount;
          const userId = req.session.user._id;  // Use req.session.user._id directly
          let uber = req.session.user.Name;
          let existing_message_count = await userHelpers.getExistingGroupChatCount(userId);  // EDITMARK
          let current_message_count = await userHelpers.getAllNewGroupchatNotification();
          const skip = 0;
          const difference = current_message_count - existing_message_count;
          const limit = difference > 100 ? 100 : Math.max(50, difference);
          let messages = await userHelpers.getAllMessage(skip, limit);

          if (difference > 0 && difference <= messages.length) {
            messages[difference - 1].last_notification = true;
          }

          messages.reverse();
          let pinned_message = await userHelpers.GetPinnedMessage();
          let polldata = await userHelpers.getPollInformation(userId);  

          // Check and set last_notification if current_message_count is greater than existing_message_count

          res.render('user/groupchat', {
            showHeader1: true,
            showHeader2: true,
            userId,
            uber,
            //referrer,
            messages,
            groupchatcount,
            total_message,
            total_notify_number,
            pinned_message,
            limit,
            polldata
          });
          return;
        } else {
          res.render("user/restricted_user",{groupChatRestrict: true})
          return
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/get_remaining_groupchatmessages', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let messages = await userHelpers.getAllMessage(skip, limit);
        //messages.reverse();

        res.json({ success: true, messages });  

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/send-message', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let name = req.session.user.Name;
        let actualMessageId = null;
        let MessageId = null;
        let status = "textmessage";
        let actualMessageUsername = null;
        let actualMessageContent = null;
        let userId = req.session.user._id;
        let SENDBY = null;

        let messageContent = req.body.messageContent;
        actualMessageId = req.body.actualMessageId;
        MessageId = req.body.MessageId;
        actualMessageContent = req.body.actualMessageContent;
        actualMessageUsername = req.body.actualMessageUsername;
        SENDBY = req.body.SENDBY;
        const timestamp = new Date();
        const formattedTimestamp = req.body.formattedTimestamp;

        if(req.session.user.GroupMessageInitiation == null ){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          if(req.session.user.GroupMessageInitiation == null ){
            //  LOGIC TO SEND FIRST MAIL
            console.log("MAIL SEND TO ALL GROUP CHAT INITIALTION FIRST MAIL")
            req.session.user.GroupMessageInitiation = new Date()
          }
        } else if(req.session.user.GroupMessageInitiation != null){
          if((isDifferentDay(req.session.user.GroupMessageInitiation)) == true){
            let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
            req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          }
        }

        const response = await userHelpers.handleGroupChatMessage(MessageId, userId, name, messageContent, actualMessageId, actualMessageUsername, actualMessageContent, timestamp, status, SENDBY, formattedTimestamp);
        res.json(response);

        if (response.addedGroupMessage){
          if(req.session.user.GroupMessageInitiation != null){
            const isNewDay = isDifferentDay(req.session.user.GroupMessageInitiation);
            if (isNewDay) {
              // SEND MAIL HERE
              console.log("MAIL SEND TO ALL GROUP CHAT INITIALTION")
              req.session.user.GroupMessageInitiation = new Date()
            }
          }
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


//  ACTUAL EMAIL INTEGRATED
/*router.post('/send-message', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let name = req.session.user.Name;
        let actualMessageId = null;
        let MessageId = null;
        let status = "textmessage";
        let actualMessageUsername = null;
        let actualMessageContent = null;
        let userId = req.session.user._id;
        let SENDBY = null;

        let messageContent = req.body.messageContent;
        actualMessageId = req.body.actualMessageId;
        MessageId = req.body.MessageId;
        actualMessageContent = req.body.actualMessageContent;
        actualMessageUsername = req.body.actualMessageUsername;
        SENDBY = req.body.SENDBY;
        const timestamp = new Date();
        const formattedTimestamp = req.body.formattedTimestamp;

        if(req.session.user.GroupMessageInitiation == null ){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          if(req.session.user.GroupMessageInitiation == null ){

            // Get all emails
            let mailsall = await userHelpers.getallMail();
            const myMail = req.session.user.Email;
            const adminMail = await userHelpers.getBaseAdminMail();
            mailsall.push(adminMail.Email);

            // Prepare the content for the emails
            const jobContent =
              `<p>Someone initiated the groupchat. Join the now.</p>
              <p>Visit student alumni relations portal for more.</p>`;

            // Send email to all users except `myMail`
            for (const email of mailsall) {
              if (email !== myMail) {
                const mailOptions = {
                  from: 'anandhueducateanddevelop@gmail.com',
                  to: email,
                  subject: 'Join groupchat',
                  html: jobContent
                };

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                  } else {
                    console.log('Email sent:', info.response);
                  }
                });
              }
            }

            req.session.user.GroupMessageInitiation = new Date()
          }
        } else if(req.session.user.GroupMessageInitiation != null){
          if((isDifferentDay(req.session.user.GroupMessageInitiation)) == true){
            let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
            req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          }
        }

        const response = await userHelpers.handleGroupChatMessage(MessageId, userId, name, messageContent, actualMessageId, actualMessageUsername, actualMessageContent, timestamp, status, SENDBY, formattedTimestamp);
        res.json(response);

        if (response.addedGroupMessage){
          if(req.session.user.GroupMessageInitiation != null){
            const isNewDay = isDifferentDay(req.session.user.GroupMessageInitiation);
            if (isNewDay) {

              // Get all emails
              let mailsall = await userHelpers.getallMail();
              const myMail = req.session.user.Email;

              // Prepare the content for the emails
              const jobContent =
                `<p>Someone initiated the groupchat. Join the now.</p>
                <p>Visit student alumni relations portal for more.</p>`;

              // Send email to all users except `myMail`
              for (const email of mailsall) {
                if (email !== myMail) {
                  const mailOptions = {
                    from: 'anandhueducateanddevelop@gmail.com',
                    to: email,
                    subject: 'Join groupchat',
                    html: jobContent
                  };

                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.error('Error sending email:', error);
                    } else {
                      console.log('Email sent:', info.response);
                    }
                  });
                }
              }

              req.session.user.GroupMessageInitiation = new Date()
            }
          }
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});*/


router.post('/delete-message-from-groupchat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        await userHelpers.d2eighteleteMessage12(req.body.MessagE, req.session.user._id).then((response) => {
          res.json(response);
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/add_reaction_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let emoji = req.body.EmOjIcOnTeNt;
        let user_id = req.session.user._id;
        let user_Name = req.session.user.Name;
        await userHelpers.addRemoveReaction(messageId, emoji, user_id, user_Name).then((response) => {
          res.json(response);
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/get_message_by_id', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let user_id = req.session.user._id;

        let message = await userHelpers.getMessageById(messageId, user_id);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_message_by_id_text', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let message = await userHelpers.getMessageByIdText(messageId, req.session.user._id);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_message_by_id_emoji', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let message = await userHelpers.getMessageByIdEmoji(messageId);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/add_pin_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        if(req.body.userID == req.session.user._id){
          let response = await userHelpers.addPin(req.body.MeSsAgEiD);
          res.json(response);
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/remove_pin_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        if(req.body.userID == req.session.user._id){
          let response = await userHelpers.removePin(req.body.MeSsAgEiD);
          res.json(response);
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/add-post-togroup', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const userId = req.session.user._id;
        const Name = req.session.user.Name;
        const postData = { ...req.body };
        let messageContent = postData.messageContent;
        messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
        postData.messageContent = messageContent;
        const timestamp = new Date();
        const status = "multimedia";
        const MessageId = req.body.MessageId;
        const imageFileNames = [];
        const videoFileNames = [];
        const baseFolderPath = `./public/group-media/${userId}/${MessageId}/`;

        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        
        if(req.session.user.GroupMessageInitiation == null ){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          if(req.session.user.GroupMessageInitiation == null ){
            //  LOGIC TO SEND FIRST MAIL
            console.log("MAIL SEND TO ALL GROUP CHAT INITIALTION FIRST MAIL")
            req.session.user.GroupMessageInitiation = new Date()
          }
        } else if(req.session.user.GroupMessageInitiation != null){
          if((isDifferentDay(req.session.user.GroupMessageInitiation)) == true){
            let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
            req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          }
        }

        await userHelpers.addPostGroup(postData, timestamp, status, userId, Name, formattedTimestamp);

        const files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];

        // Process each file
        const fileProcessingPromises = files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${MessageId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = path.join(baseFolderPath, fileName);

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        }));

        await Promise.all(fileProcessingPromises);

        await userHelpers.addPostGroupImages(MessageId, imageFileNames);
        await userHelpers.addPostGroupVideos(MessageId, videoFileNames);
        res.json({ addedGroupPostMessage: true });

        if(req.session.user.GroupMessageInitiation != null){
          const isNewDay = isDifferentDay(req.session.user.GroupMessageInitiation);
          if (isNewDay) {
            // SEND MAIL HERE
            console.log("MAIL SEND TO ALL GROUP CHAT INITIATION")
            req.session.user.GroupMessageInitiation = new Date()
          }
        }

        return;

      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add_poll_togroup', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {

        if ((req.body.caption !== null && req.body.caption !== "") && req.body.option1) {
          await userHelpers.initializePOLLInGroup(req.body, req.session.user._id, req.session.user.Name);
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}); 


//  MAIL INTEGRATED
/*router.post('/add_poll_togroup', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {

        if ((req.body.caption !== null && req.body.caption !== "") && req.body.option1) {
          await userHelpers.initializePOLLInGroup(req.body, req.session.user._id, req.session.user.Name);
        }

        let mailsall = await userHelpers.getallMail();
        const myMail = req.session.user.Email;
        const adminMail = await userHelpers.getBaseAdminMail();
        mailsall.push(adminMail.Email);

        // Prepare the content for the emails
        const jobContent =
        `<p>A poll posted in groupchat by ${req.session.user.Name}. React to it.</p>
        <p>Visit student alumni relations portal for more.</p>`;

        // Send email to all users except `myMail`
        for (const email of mailsall) {
          if (email !== myMail) {
            const mailOptions = {
              from: 'anandhueducateanddevelop@gmail.com',
              to: email,
              subject: 'Join groupchat',
              html: jobContent
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('Error sending email:', error);
              } else {
                console.log('Email sent:', info.response);
              }
            });
          }
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});*/


router.post('/delete_poll', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        if(req.session.user._id == req.body.UsErId)
        {
          let response = await userHelpers.deletePoll()
          res.json(response)
          return;
        } else{
          res.render("user/unauthorized_attempt")
          return
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/submit_group_poll', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let response = await userHelpers.submitPoll(req.body.vAlUe,req.session.user._id,req.session.user.Name);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_all_pollresult', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let response = await userHelpers.getAllPollResult();
        res.json({success:true,response});
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


//     EMAIL INTEGRATED
/*router.post('/add-post-togroup', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const userId = req.session.user._id;
        const Name = req.session.user.Name;
        const postData = { ...req.body };
        let messageContent = postData.messageContent;
        messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
        postData.messageContent = messageContent;
        const timestamp = new Date();
        const status = "multimedia";
        const MessageId = req.body.MessageId;
        const imageFileNames = [];
        const videoFileNames = [];
        const baseFolderPath = `./public/group-media/${userId}/${MessageId}/`;

        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        
        if(req.session.user.GroupMessageInitiation == null ){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          if(req.session.user.GroupMessageInitiation == null ){

            // Get all emails
            let mailsall = await userHelpers.getallMail();
            const myMail = req.session.user.Email;
            const adminMail = await userHelpers.getBaseAdminMail();
            mailsall.push(adminMail.Email);

            // Prepare the content for the emails
            const jobContent =
              `<p>Someone initiated the groupchat. Join the now.</p>
              <p>Visit student alumni relations portal for more.</p>`;

            // Send email to all users except `myMail`
            for (const email of mailsall) {
              if (email !== myMail) {
                const mailOptions = {
                  from: 'anandhueducateanddevelop@gmail.com',
                  to: email,
                  subject: 'Join groupchat',
                  html: jobContent
                };

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                  } else {
                    console.log('Email sent:', info.response);
                  }
                });
              }
            }

            req.session.user.GroupMessageInitiation = new Date()
          }
        } else if(req.session.user.GroupMessageInitiation != null){
          if((isDifferentDay(req.session.user.GroupMessageInitiation)) == true){
            let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
            req.session.user.GroupMessageInitiation = GroupMessageInitiation;
          }
        }

        await userHelpers.addPostGroup(postData, timestamp, status, userId, Name, formattedTimestamp);

        const files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];

        // Process each file
        const fileProcessingPromises = files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${MessageId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = path.join(baseFolderPath, fileName);

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        }));

        await Promise.all(fileProcessingPromises);

        await userHelpers.addPostGroupImages(MessageId, imageFileNames);
        await userHelpers.addPostGroupVideos(MessageId, videoFileNames);
        res.json({ addedGroupPostMessage: true });

        if(req.session.user.GroupMessageInitiation != null){
          const isNewDay = isDifferentDay(req.session.user.GroupMessageInitiation);
          if (isNewDay) {

            // Get all emails
            let mailsall = await userHelpers.getallMail();
            const myMail = req.session.user.Email;

            // Prepare the content for the emails
            const jobContent =
              `<p>Someone initiated the groupchat. Join the now.</p>
              <p>Visit student alumni relations portal for more.</p>`;

            // Send email to all users except `myMail`
            for (const email of mailsall) {
              if (email !== myMail) {
                const mailOptions = {
                  from: 'anandhueducateanddevelop@gmail.com',
                  to: email,
                  subject: 'Join groupchat',
                  html: jobContent
                };

                transporter.sendMail(mailOptions, (error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                  } else {
                    console.log('Email sent:', info.response);
                  }
                });
              }
            }

            console.log("MAIL SEND TO ALL")
            req.session.user.GroupMessageInitiation = new Date()
          }
        }

        return;

      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.get('/add-post', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        res.render('user/add-post');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add-post', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let UserId = req.session.user._id;
        const postData = { ...req.body, UserId, Name: req.session.user.Name };

        if (postData.description) {
          postData.description = postData.description.replace(/\s+/g, ' ').trim();
        }

        const timestamp = new Date();
        let imageFileNames = [];
        let videoFileNames = [];

        try {
          const insertedPostId = await userHelpers.addPost(postData, timestamp);

          const baseFolderPath = `./public/posts/${UserId}/${insertedPostId}/`;
          if (!fs.existsSync(baseFolderPath)) {
            fs.mkdirSync(baseFolderPath, { recursive: true });
          }

          let files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
          
          await Promise.all(files.map(file => new Promise((resolve, reject) => {
            const fileExtension = file.name.split('.').pop();
            const fileName = `${insertedPostId}_${files.indexOf(file) + 1}.${fileExtension}`;
            const outputPath = baseFolderPath + fileName;

            const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
              workerData: {
                mediaBuffer: file.data,
                outputPath: outputPath,
                fileType: file.mimetype.includes('image') ? 'image' : 'video'
              }
            });

            worker.on('message', async (message) => {
              if (message.status === 'success') {
                if (file.mimetype.includes('image')) {
                  imageFileNames.push(fileName);
                } else if (file.mimetype.includes('video')) {
                  videoFileNames.push(fileName);
                }
                resolve();
              } else {
                console.error('Error processing file:', message.error);
                reject(new Error('File processing failed'));
              }
            });

            worker.on('error', (error) => {
              console.error('Worker error:', error);
              reject(error);
            });

            worker.on('exit', (code) => {
              if (code !== 0) {
                console.error('Worker stopped with exit code', code);
                reject(new Error('Worker stopped with exit code ' + code));
              }
            });
          })));

          await userHelpers.addPostImages(insertedPostId, imageFileNames);
          await userHelpers.addPostVideos(insertedPostId, videoFileNames);

          res.redirect('/profile');
          return
        } catch (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
        }
      } else {
        res.render('user/view_page_disabled');
        return
      }
    } else {
      res.redirect('/login');
      return
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/view-own-post', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const userId = req.session.user._id;
        const skip = 0;
        const limit = 10;
        let ownPosts = await userHelpers.getOwnPostDetails(userId, skip, limit);
        //ownPosts.reverse();
        let uber = req.session.user.Name;

        // Process each post to fetch user details for likes
        for (let post of ownPosts) {
          if (post.comments && post.comments.length > 0) {
            post.comments = post.comments.map(comment => {
              let liked_comment = false;
              if (comment.comment_likes && comment.comment_likes.length > 0) {
                liked_comment = comment.comment_likes.includes(userId);
              }

              if (comment.replies && comment.replies.length > 0) {
                comment.replies = comment.replies.reverse().map(reply => ({
                  ...reply,
                  liked_comment_reply: reply.comment_reply_likes 
                    ? reply.comment_reply_likes.includes(userId) 
                    : false // Ensure `comment_reply_likes` is checked
                }));
              }

              return {
                ...comment,
                liked_comment
              };
            });
          }
        }

        ownPosts = ownPosts.map(post => ({
          ...post,
          _id: post._id.toString(),
          liked: post.likes && post.likes.some(like => like.insertedId === userId),
        }));

        res.render('user/view-own-post', {
          ownPosts,
          showHeader1: true,
          showHeader2: true,
          showHeader3: true,
          uber,
          userId,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
});


router.post('/get_remaining_posts', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let USER_ID = req.session.user._id;
        let { skip, limit } = req.body; // Expecting skip and limit in the request body
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let ownPosts = await userHelpers.getOwnPostDetails(USER_ID, skip, limit);
        //ownPosts.reverse();
        
        for (let post of ownPosts) {
          if (post.comments && post.comments.length > 0) {
            post.comments = post.comments.map(comment => {
              let liked_comment = false;
              if (comment.comment_likes && comment.comment_likes.length > 0) {
                liked_comment = comment.comment_likes.includes(USER_ID);
              }

              if (comment.replies && comment.replies.length > 0) {
                comment.replies = comment.replies.reverse().map(reply => ({
                  ...reply,
                  liked_comment_reply: reply.comment_reply_likes 
                    ? reply.comment_reply_likes.includes(USER_ID) 
                    : false // Ensure `comment_reply_likes` is checked
                }));
              }

              return {
                ...comment,
                liked_comment
              };
            });
          }
        }

        ownPosts = ownPosts.map(post => ({
          ...post,
          _id: post._id.toString(),
          liked: post.likes && post.likes.some(like => like.insertedId === USER_ID),
        }));


        res.json({ ownPosts });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/view_post', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const userId = req.session.user._id;
        let post_id = req.body.PoStid;
        let post = await userHelpers.getSingleDetails(post_id); // Fetch a single post
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        // Function to process the single post
        const processSinglePost = async (post) => {

          // Process comments and replies
          if (post.comments && post.comments.length > 0) {
            post.comments = post.comments.map(comment => {
              let liked_comment = false;
              if (comment.comment_likes && comment.comment_likes.length > 0) {
                liked_comment = comment.comment_likes.includes(userId);
              }

              if (comment.replies && comment.replies.length > 0) {
                comment.replies = comment.replies.reverse().map(reply => ({
                  ...reply,
                  liked_comment_reply: reply.comment_reply_likes 
                    ? reply.comment_reply_likes.includes(userId) 
                    : false // Ensure `comment_reply_likes` is checked
                }));
              }

              return {
                ...comment,
                liked_comment
              };
            });
          }

          // Map the processed post
          const processedPost = {
            ...post,
            _id: post._id.toString(),
            liked: post.likes && post.likes.some(like => like.insertedId === userId),
          };

          return processedPost;
        };

        // Process the single post
        const processedPost = await processSinglePost(post);

        res.render('user/view-post', {
          ownPosts: [processedPost],
          showHeader1: true,
          showHeader2: true,
          showHeader3: true,
          uber,
          userId,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
});


router.get('/view-other-post', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const userId = req.session.user._id;
        const skip = 0;
        const limit = 10;
        let otherPosts = await userHelpers.getOtherPostDetails(userId, skip, limit);
        let iblockList = await userHelpers.getindiBlockLogData(userId);
        let iwasblocklist = await userHelpers.getBlockedByUsers(userId);

        otherPosts = otherPosts.filter(otherPost => !iblockList.includes(otherPost.UserId));
        otherPosts = otherPosts.filter(otherPost => !iwasblocklist.includes(otherPost.UserId));
        //otherPosts.reverse();
        let uber = req.session.user.Name;

        // Process each post to fetch user details for likes
        for (let post of otherPosts) {
          if (post.comments && post.comments.length > 0) {
            post.comments = post.comments.map(comment => {
              let liked_comment = false;
              if (comment.comment_likes && comment.comment_likes.length > 0) {
                liked_comment = comment.comment_likes.includes(userId);
              }

              if (comment.replies && comment.replies.length > 0) {
                comment.replies = comment.replies.reverse().map(reply => ({
                  ...reply,
                  liked_comment_reply: reply.comment_reply_likes 
                  ? reply.comment_reply_likes.includes(userId) 
                  : false // Ensure `comment_reply_likes` is checked
              }));
            }

              return {
                ...comment,
                liked_comment
              };
            });
          }
        }

        otherPosts = otherPosts.map(post => ({
          ...post,
          _id: post._id.toString(),
          liked: post.likes && post.likes.some(like => like.insertedId === userId),
        }));

        res.render('user/view-other-post', {
          otherPosts,
          userId,
          showHeader1: true,
          showHeader2: true,
          showHeader3: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_otherposts', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let USER_ID = req.session.user._id;
        let { skip, limit } = req.body; // Expecting skip and limit in the request body
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let ownPosts = await userHelpers.getOtherPostDetails(USER_ID, skip, limit);
        //ownPosts.reverse();
        
        for (let post of ownPosts) {
          if (post.comments && post.comments.length > 0) {
            post.comments = post.comments.map(comment => {
              let liked_comment = false;
              if (comment.comment_likes && comment.comment_likes.length > 0) {
                liked_comment = comment.comment_likes.includes(USER_ID);
              }

              if (comment.replies && comment.replies.length > 0) {
                comment.replies = comment.replies.reverse().map(reply => ({
                  ...reply,
                  liked_comment_reply: reply.comment_reply_likes 
                    ? reply.comment_reply_likes.includes(USER_ID) 
                    : false // Ensure `comment_reply_likes` is checked
                }));
              }

              return {
                ...comment,
                liked_comment
              };
            });
          }
        }

        ownPosts = ownPosts.map(post => ({
          ...post,
          _id: post._id.toString(),
          liked: post.likes && post.likes.some(like => like.insertedId === USER_ID),
        }));


        res.json({ ownPosts });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/add-like', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let USER_ID = req.session.user._id;
        let POST_ID = req.body.PostID;
        let USER_NAME = req.session.user.Name;
        let response = await userHelpers.add1228Like(USER_ID, POST_ID, USER_NAME);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//      ADVANCED FEATURE     FUTUREMARK     ALSO COMMENTED AT USERHELPERS
/*router.post('/get_comments', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let USER_ID = req.session.user._id;
        let POST_ID = req.body.PoStId;
        let response = await userHelpers.getComment(POST_ID, USER_ID);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});*/


router.post('/add_comment', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let comment_owner_id = req.session.user._id;
        let comment_owner_name = req.session.user.Name;
        let Comment_data = req.body.CoMmEnT;
        let time_comment = new Date();
        let status = "COMMENT";
        if (Comment_data) {
          Comment_data = Comment_data.replace(/\s+/g, ' ').trim();
        }
        let response = await userHelpers.addComment(post_Id, comment_owner_id, comment_owner_name, Comment_data, time_comment, status);
        let comment_id = (response.comment_id).toString();
        res.json(response);
        await userHelpers.addCommentTrackerEntry(comment_owner_id, post_Id, comment_id);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/add_comment_reply', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let Comment_id = req.body.CoMmEnTiD;
        let Reply_content = req.body.RePlYcOnTeNt;
        let Comment_owner_name = req.body.CoMmEnToWnERnAmE;
        let Redirection_ID = req.body.ReDiReCtIoNiD;
        let Redirection_Status = req.body.ReDiReCtIoNsTaTuS;
        let comment_owner_id = req.body.CoMmEnToWnErId
        let Reply_owner_id = req.session.user._id;
        let Reply_owner_name = req.session.user.Name;
        let time_comment = new Date();
        let status = "REPLYOFCOMMENT";
        if (Reply_content) {
          Reply_content = Reply_content.replace(/\s+/g, ' ').trim();
        }

        let response = await userHelpers.addCommentReply(post_Id, Comment_id, Reply_content, Comment_owner_name, 
          Reply_owner_id, Reply_owner_name, time_comment, status, Redirection_ID, Redirection_Status);
        let reply_id = (response.reply_id).toString();
        res.json(response);
        await userHelpers.addCommentReplyTrackerEntry(Reply_owner_id, post_Id, reply_id, Redirection_ID, comment_owner_id);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/delete_comment_post', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let Comment_id = req.body.CoMmEnTiD;
        let reply_Count = req.body.RePlYcOuNt;
        const user_id = req.session.user._id;
        const response = await userHelpers.deletePostComment(post_Id, Comment_id, reply_Count, user_id);
        res.json(response);
        if(response.deleted_Comment){
          if(reply_Count<10){
            await userHelpers.removeCommentTrackerEntry(user_id,post_Id,Comment_id)
          }
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/delete_reply_comment_post', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let Comment_id = req.body.CoMmEnTiD;
        let Reply_id = req.body.RePlYiD;
        const user_id = req.session.user._id;
        const response = await userHelpers.deletePostCommentReply(post_Id, Comment_id, Reply_id, user_id);
        res.json(response);
        if(response.deleted_reply_Comment){
          await userHelpers.removeCommentReplyTrackerEntry(user_id, post_Id, Reply_id)
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/edit_comment_post', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let Post_ID = req.body.PoStId;
        let Comment_ID = req.body.CoMmEnTiD;
        let Comment_content = req.body.CoMmEnTcOnTeNt;
        
        if (Comment_content) {
          Comment_content = Comment_content.replace(/\s+/g, ' ').trim();
        }

        const response = await userHelpers.editCommentPost(Post_ID, Comment_ID, Comment_content, req.session.user._id);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/edit_comment_reply_post', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let Comment_Id = req.body.CoMmEnTiD;
        let reply_Id = req.body.RePlYiD;
        let Reply_content = req.body.CoMmEnTcOnTeNt;
        
        if (Reply_content) {
          Reply_content = Reply_content.replace(/\s+/g, ' ').trim();
        }

        const response = await userHelpers.editCommentReplyPost(post_Id, Comment_Id, reply_Id, Reply_content, req.session.user._id);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/add_like_comment', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let Comment_Id = req.body.CoMmEnTiD;
        let comment_owner_id = req.body.CoMmEnToWnErId;
        let user_id = req.session.user._id;
        
        const response = await userHelpers.addCommentLike(post_Id, Comment_Id, user_id);
        let add_remove_status = response.add_remove_status
        // add_remove_status IS TRUE WHEN NEW LIKE IS ADDED
        // add_remove_status IS FALSE WHEN LIKE IS REMOVED
        delete response.add_remove_status;
        res.json(response);
        await userHelpers.addCommentAndReplyLikeTrackerEntry(comment_owner_id, post_Id, Comment_Id, add_remove_status);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/add_like_comment_reply', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let post_Id = req.body.PoStId;
        let Comment_Id = req.body.CoMmEnTiD;
        let reply_Id = req.body.RePlYiD;
        let user_id = req.session.user._id;
        let comment_owner_id = req.body.CoMmEnToWnErId;
        
        const response = await userHelpers.addCommentReplyLike(post_Id, Comment_Id, reply_Id, user_id);
        let add_remove_reply_status = response.add_remove_reply_status
        // add_remove_reply_status IS TRUE WHEN NEW LIKE IS ADDED
        // add_remove_reply_status IS FALSE WHEN LIKE IS REMOVED
        delete response.add_remove_reply_status;
        res.json(response);
        await userHelpers.addCommentAndReplyLikeTrackerEntry(comment_owner_id, post_Id, reply_Id, add_remove_reply_status)
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/edit-post', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let postID = req.body.PoStId;
        let description = req.body.d_escription;
        let location = req.body.l_ocation;
        let response = await userHelpers.editPost(postID, description, location, req.session.user._id);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled', { userId: req.session.user._id });
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error editing post:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/delete_post', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let PostID = req.body.PostID;
        const commentators = await userHelpers.getAllCommentators(PostID);
        const response = await userHelpers.deletePost(PostID, req.session.user._id);
        if(response.deletePost){
          await userHelpers.deleteCommentEntry(PostID, commentators)
          const postContent = path.join(__dirname, '../public/posts/', req.session.user._id, PostID);
          try {
            if (fs.existsSync(postContent)) {
              fs.rmSync(postContent, { recursive: true, force: true });
            }
          } catch (error) {
            console.error('Error deleting post directory:', error);
          }
        }
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled', { userId: req.session.user._id });
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.get('/mentorshipportal', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const userId = req.session.user._id;
        let uber = req.session.user.Name;
        const skip = 0;
        const limit = 20

        let mentors = await userHelpers.getMentorDetails(skip, limit);
        mentors.reverse();
        
        res.render('user/mentorshipportal', {
          userId,
          showHeader1: true,
          showHeader2: true,
          uber,
          mentors,
          groupchatcount,
          total_message,
          total_notify_number,
          limit
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering mentorship portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/get_remaining_mentors', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let mentors = await userHelpers.getMentorDetails(skip, limit);
        
        res.json({ success: true, mentors });

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering mentorship portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/add-question', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let userName = req.session.user.Name;
        let status = "question";
        let questionInput = req.body.questionInput;
        let userdata = {
          userName: userName,
          userId: userId,
          Status: status,
          CurrentStat: req.session.user.Status,
          questionInput: questionInput
        };
        await userHelpers.addQuestionMentorship(userdata).then(async (insertedQuestionId) => {
          insertedQuestionId = insertedQuestionId.toString();
          await userHelpers.addQuestionEntry(userId, insertedQuestionId);
          res.json({addedMentorQuestion : true, insertedQuestionId});
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error adding question:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


//   MAIL SERVICE INTEGRATED
/*router.post('/add-question', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let userName = req.session.user.Name;
        let status = "question";
        let questionInput = req.body.questionInput;
        let userdata = {
          userName: userName,
          userId: userId,
          Status: status,
          CurrentStat: req.session.user.Status,
          questionInput: questionInput
        };
        await userHelpers.addQuestionMentorship(userdata).then(async (insertedQuestionId) => {
          insertedQuestionId = insertedQuestionId.toString();
          await userHelpers.addQuestionEntry(userId, insertedQuestionId);
          res.json({ addedMentorQuestion: true, insertedQuestionId });
          
          // Prepare the content for the emails
          const questionContent = `A new question was added: \n\n${questionInput}\n\nVisit the alumni relations cell website to reply or view more.`;
          
          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.user.Email;

          // Send email to all users except `myMail`
          for (const email of mailsall) {
            if (email !== myMail) {
              const mailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: email,
                subject: 'New Question Added',
                text: questionContent
              };

              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.error('Error sending email:', error);
                } else {
                  console.log('Email sent:', info.response);
                }
              });
            }
          }

          // Send confirmation email to `myMail`
          const myMailOptions = {
            from: 'anandhueducateanddevelop@gmail.com',
            to: myMail,
            subject: 'Question Submitted Successfully',
            text: 'Your question was sent successfully.'
          };

          transporter.sendMail(myMailOptions, (error, info) => {
            if (error) {
              console.error('Error sending confirmation email:', error);
            } else {
              console.log('Confirmation email sent:', info.response);
            }
          });

          return

        });
      } else {
        res.render('user/view_page_disabled');
        return
      }
    } else {
      res.redirect('/login');
      return
    }
  } catch (error) {
    console.error('Error adding question:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});*/


router.post('/search_mentor', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let mentorkeyword = req.body;
        let uber = req.session.user.Name;
        let userId = req.session.user._id;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let mentors = await userHelpers.searchMentor(mentorkeyword);
        res.render('user/specific_mentor_portal', {
          mentors,
          showHeader1: true,
          showHeader2: true,
          uber,
          userId,
          total_notify_number,
          total_message,
          groupchatcount
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error searching mentor:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/delete-mentor', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const response = await userHelpers.deleteMentor(req.body.MentoR, req.session.user._id);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error deleting mentor:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/add-reply', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let userName = req.session.user.Name;
        let questionId = req.body.questionId;
        let status = "reply";
        let questionInput = req.body.questionInput
        let userDataWithBody = {
          questionId : questionId,
          userName: userName,
          userId: userId,
          Status: status,
          CurrentStat: req.session.user.Status,
          questionInput: questionInput
        };
        await userHelpers.addReply(userDataWithBody).then(async (insertedReplyId) => {
          insertedReplyId = insertedReplyId.toString();
          await userHelpers.incrementReplyCount(questionId);
          res.json({addedMentorReply: true, insertedReplyId})
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


//   MAIL SERVICE INTEGRATED
/*router.post('/add-reply', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let userName = req.session.user.Name;
        let questionId = req.body.questionId;
        let status = "reply";
        let questionInput = req.body.questionInput
        let userDataWithBody = {
          questionId : questionId,
          userName: userName,
          userId: userId,
          Status: status,
          CurrentStat: req.session.user.Status,
          questionInput: questionInput
        };
        await userHelpers.addReply(userDataWithBody).then(async (insertedReplyId) => {
          insertedReplyId = insertedReplyId.toString();
          await userHelpers.incrementReplyCount(questionId);
          res.json({addedMentorReply: true, insertedReplyId})

          let user_mail_input = await userHelpers.getUserMailFromMentorId(questionId)

          //  MAIL HERE
          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: user_mail_input.email,
            subject: 'Reply to your mentor question',
            text: `You got a reply for the mentor question you posted.\n\nReply : \n${questionInput}\n\nQuestion : \n${user_mail_input.questionInput}\n\nVisit alumni relations cell for more information.`
          };

          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);
          });

          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});*/


router.post('/delete-mentor-reply', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const response = await userHelpers.deleteMentorReply(req.body.MentorreplY, req.body.QuestioN, req.session.user._id);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error deleting mentor reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/edit-question', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let questiontext = req.body.questionInput;
        let questionId = req.body.questionId;
        const response = await userHelpers.editQuestion(questiontext, questionId, req.session.user._id);
        res.json(response)
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error editing question:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/add-reply-ofreply', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let userName = req.session.user.Name;
        let questionId = req.body.questionId;
        let replyId = req.body.replyId;
        let replytoUsername = req.body.replytoUsername;
        let status = "replyofreply";
        let questionInput = req.body.replyInput;
        let userDataWithBody = {
          replyId: replyId,
          replytoUsername: replytoUsername,
          questionId: questionId,
          userName: userName,
          userId: userId,
          Status: status,
          CurrentStat: req.session.user.Status,
          questionInput: questionInput
        };
        await userHelpers.addReply(userDataWithBody).then(async (insertedReplyReplyId) => {
          await userHelpers.incrementReplyCount(questionId);
          insertedReplyReplyId = insertedReplyReplyId.toString();
          res.json({addedMentorReplyReply: true, insertedReplyReplyId})
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error adding reply of reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


//   MAIL SERVICE INTEGRATED
/*router.post('/add-reply-ofreply', async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userId = req.session.user._id;
        let userName = req.session.user.Name;
        let questionId = req.body.questionId;
        let replyId = req.body.replyId;
        let replytoUsername = req.body.replytoUsername;
        let status = "replyofreply";
        let questionInput = req.body.replyInput;
        let userDataWithBody = {
          replyId: replyId,
          replytoUsername: replytoUsername,
          questionId: questionId,
          userName: userName,
          userId: userId,
          Status: status,
          CurrentStat: req.session.user.Status,
          questionInput: questionInput
        };
        await userHelpers.addReply(userDataWithBody).then(async (insertedReplyReplyId) => {
          await userHelpers.incrementReplyCount(questionId);
          insertedReplyReplyId = insertedReplyReplyId.toString();
          res.json({addedMentorReplyReply: true, insertedReplyReplyId})

          let user_mail_input = await userHelpers.getUserMailFromMentorId(questionId)

          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: user_mail_input.email,
            subject: 'Reply to your mentor reply',
            text: `You got a reply for the mentor reply you posted.\n\nReply : \n${questionInput}\n\nYour reply : \n${user_mail_input.questionInput}\n\nVisit alumni relations cell for more information.`
          };

          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);
          });

          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error adding reply of reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});*/


router.post('/edit-reply', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let replyId = req.body.replyId;
        let replyInput = req.body.replyInput;
        let questionId = req.body.questionId;
        const response = await userHelpers.editReply(replyInput, questionId, replyId, req.session.user._id);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error editing reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/add_reaction_mentorship', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let mentorId = req.body.MeNtOrId;
        let emoji = req.body.EmOjIcOnTeNt;
        let user_id = req.session.user._id;
        let user_Name = req.session.user.Name;
        await userHelpers.addRemoveMentorReaction(mentorId, emoji, user_id, user_Name).then((response) => {
          res.json(response);
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/get_mentor_by_id_emoji', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let mentorId = req.body.MeNtOrId;
        let mentor = await userHelpers.getMentorByIdEmoji(mentorId);
        res.json({ mentor });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_mentor_by_id_text', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let mentorID = req.body.MeNtOrId;
        let mentor = await userHelpers.getMentorByIdText(mentorID, req.session.user._id);
        res.json({ mentor });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/add_reaction_reply_mentorship', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let mentorId = req.body.MeNtOrId;
        let emoji = req.body.EmOjIcOnTeNt;
        let replyId = req.body.RePlYiD;
        let user_id = req.session.user._id;
        let user_Name = req.session.user.Name;
        await userHelpers.addRemoveMentorReplyReaction(replyId, mentorId, emoji, user_id, user_Name).then((response) => {
          res.json(response);
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/get_mentor_reply_by_id_emoji', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let mentorId = req.body.MeNtOrId;
        let replyId = req.body.RePlYiD;
        let mentorReply = await userHelpers.getMentorReplyByIdEmoji(replyId, mentorId);
        res.json({ mentorReply });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_mentor_reply_by_id_text', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let mentorID = req.body.MeNtOrId;
        let replyID = req.body.RePlYiD;
        let mentorReply = await userHelpers.getMentorReplyByIdText(mentorID, replyID, req.session.user._id);
        res.json({ mentorReply });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/one-on-one-chat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        //const referrer = req.get('Referrer');
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;

        let uber = req.session.user.Name;
        const Sender_Id = req.session.user._id;
        const Reciever_Id = req.body.user2ToSendRecieve;

        let reciever = await userHelpers.getBasicProfile(Reciever_Id);
        delete reciever.Status;
        let sender = {};
        sender.Name = uber;
        sender._id = Sender_Id;
        
          let iblockList = await userHelpers.getindiBlockLogData(Sender_Id);
          let iwasblocklist = await userHelpers.getBlockedByUsers(Sender_Id);
          let iBlocked = iblockList.includes(Reciever_Id);
          let iWasBlocked = iwasblocklist.includes(Reciever_Id);
          let NoBlock = !(iBlocked || iWasBlocked);

          if (NoBlock) {
            const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
            const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
            
            let time_entered_inchat = new Date();
            time_entered_inchat = time_entered_inchat.toISOString();
            await userHelpers.updateEnteredTimeUnread(Sender_Id, Reciever_Id, Room_Id, time_entered_inchat);

            let sendmessages = await userHelpers.oneONoneCHAT(Sender_Id, Reciever_Id);
            let recievedmessages = await userHelpers.oneONoneCHAT(Reciever_Id, Sender_Id);

            const Current_messageCount = await userHelpers.getArrayCount(Sender_Id, Reciever_Id);
            const Existing_messageCount = await userHelpers.getExistMessageCountOneChat(Sender_Id, Reciever_Id);
            
            if (Current_messageCount > (Existing_messageCount+1)) {
              recievedmessages[Existing_messageCount].last_notification = true;
            }

            sendmessages = sendmessages.map(message => ({ ...message, Send: true}));
            recievedmessages = recievedmessages.map(message => ({ ...message, Recieve: true}));

            let messages = [...sendmessages, ...recievedmessages];
            let ChatLastSeen = await userHelpers.FetchupdateTimeLastSeen(Room_Id, Reciever_Id);

            const dateObject = new Date(ChatLastSeen);
            const options = { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
            ChatLastSeen = new Intl.DateTimeFormat('en-US', options).format(dateObject);

            messages.sort((a, b) => a.timestamp - b.timestamp);

            res.render('user/one-on-one-chat', {
              reciever,
              sender,
              uber,
              //referrer,
              Room_Id,
              showHeader1: true,
              showHeader2: true,
              messages,
              ChatLastSeen,
              groupchatcount,
              total_message,
              total_notify_number
            });
            return;
          } else if (iBlocked) {
            res.render('user/show_block_message', { iBlocked });
            return;
          } else if (iWasBlocked) {
            res.render('user/show_block_message', { iWasBlocked });
            return;
          }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error in one-on-one chat:', error);
    res.status(500).send('Internal Server Error');
  }
});


// TEST BUD
/*router.post('/get_remaining_one_on_one_chat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){

        const Sender_Id = req.session.user._id;
        const Reciever_Id = req.body.user2ToSendRecieve;

        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        limit = Math.floor(limit / 2);
        console.log("SKIP : ",skip)
        console.log("LIMIT : ",limit)
        
        let sendmessages = await userHelpers.oneONoneCHAT(Sender_Id, Reciever_Id,skip,limit);
        let recievedmessages = await userHelpers.oneONoneCHAT(Reciever_Id, Sender_Id,skip,limit);
        
        sendmessages = sendmessages.map(message => ({ ...message, Send: true}));
        recievedmessages = recievedmessages.map(message => ({ ...message, Recieve: true}));
        let messages = [...sendmessages, ...recievedmessages];
        messages.sort((a, b) => a.timestamp - b.timestamp);

        res.json({ success: true, messages });  

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error in one-on-one chat:', error);
    res.status(500).send('Internal Server Error');
  }
});*/

 
router.post('/send-one-message', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const Sender_name = req.session.user.Name;
        const Sender_Id = req.session.user._id;
        let status = "textmessage";
        const Reciever_name = req.body.Reciever_name;
        let messageContent = req.body.messageContent;
        let actualMessageId = req.body.actualMessageId;
        let MessageId = req.body.MessageId;
        let actualMessageContent = req.body.actualMessageContent;
        const Reciever_Id = req.body.recieverUserId;
        let ReadableTime = req.body.ReadableTime;
        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = new Date();
        let time_entered_inchat = timestamp.toISOString();

        // Handle sending message and related operations
        await userHelpers.handleOneChatMessage(
          MessageId, messageContent, 
          actualMessageId, 
          actualMessageContent, 
          timestamp, status, Reciever_Id, 
          Sender_Id, ReadableTime, 
          Sender_name, Reciever_name
        ).then(async (response) => {
          res.json(response);

          if(response.addedonemessage){
            if(req.session.user.Room_Id == null){
              let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
              if(get_Message_Time_Interval == null){
                console.log("SEND FIRST MAIL ONE ON ONE CHAT")
                // LOGIC TO SEND INITIAL MESSAGE
                req.session.user.Room_Id = new Date()
              }
              req.session.user.Room_Id = get_Message_Time_Interval
            } else if(req.session.user.Room_Id != null){
              if((isDifferentDay(req.session.user.Room_Id)) == true){
                let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
                req.session.user.Room_Id = get_Message_Time_Interval;
              }
            }
          }
        });


        await userHelpers.AddInverseChat(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnread(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);

        if(req.session.user.Room_Id != null){
          let current_message_count = await userHelpers.getArrayCount(Reciever_Id,Sender_Id)
          let existing_message_count = await userHelpers.getExistMessageCountOneChat(Reciever_Id,Sender_Id)
          if((current_message_count-existing_message_count)>0){
            const newNeededTimeChek = isDifferentDay(req.session.user.Room_Id)
            if(newNeededTimeChek){
              //   LOGIC TO SEND MAIL HERE
              console.log("SEND MAIL ONE ON ONE CHAT")
              req.session.user.Room_Id = new Date()
            }
          }
        }

        return;

        // Log comment explaining why this function is used
        // (continuing comments as per the original)
        // it is because new_reciever list become empty after leaving from chatwith as they are no more new recievers
        // here what i do is that when i click send message, then i am just inserting a timestamp in individual chat (TIME_UNREAD_COLLECTION)
        // with sender id as to which user i send.
        // in this way i am explicitly saying that the reciever has leaved the chat the same time the sender sended a message.
        // so that i can fetch and compare the last time he leaved with current time to show the badge of unread messages
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


//    EMAIL INTEGRATED
/*router.post('/send-one-message', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const Sender_name = req.session.user.Name;
        const Sender_Id = req.session.user._id;
        let status = "textmessage";
        const Reciever_name = req.body.Reciever_name;
        let messageContent = req.body.messageContent;
        let actualMessageId = req.body.actualMessageId;
        let MessageId = req.body.MessageId;
        let actualMessageContent = req.body.actualMessageContent;
        const Reciever_Id = req.body.recieverUserId;
        let ReadableTime = req.body.ReadableTime;
        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = new Date();
        let time_entered_inchat = timestamp.toISOString();

        // Handle sending message and related operations
        await userHelpers.handleOneChatMessage(
          MessageId, messageContent, 
          actualMessageId, 
          actualMessageContent, 
          timestamp, status, Reciever_Id, 
          Sender_Id, ReadableTime, 
          Sender_name, Reciever_name
        ).then(async (response) => {
          res.json(response);

          if(response.addedonemessage){
            if(req.session.user.Room_Id == null){
              let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
              if(get_Message_Time_Interval == null){
                // LOGIC TO SEND INITIAL MESSAGE

                // GET REQUIRED EMAIL
                let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);

                const mailOptions = {
                  from: "anandhueducateanddevelop@gmail.com",
                  to: send_Mail.Email,
                  subject: 'Message enquiry',
                  text: `You got a personal message from ${Sender_name} for the first time. Visit student alumni relations cell for more`
                };
          
                transporter.sendMail(mailOptions, async(error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send('Error sending OTP');
                  }
                  console.log('Email sent:', info.response);
                });

                req.session.user.Room_Id = new Date()
              }
              req.session.user.Room_Id = get_Message_Time_Interval
            } else if(req.session.user.Room_Id != null){
              if((isDifferentDay(req.session.user.Room_Id)) == true){
                let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
                req.session.user.Room_Id = get_Message_Time_Interval;
              }
            }
          }
        });

        await userHelpers.AddInverseChat(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnread(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);

        if(req.session.user.Room_Id != null){
          let current_message_count = await userHelpers.getArrayCount(Reciever_Id,Sender_Id)
          let existing_message_count = await userHelpers.getExistMessageCountOneChat(Reciever_Id,Sender_Id)
          if((current_message_count-existing_message_count)>0){
            const newNeededTimeChek = isDifferentDay(req.session.user.Room_Id)
            if(newNeededTimeChek){
              //   LOGIC TO SEND MAIL HERE

              // GET REQUIRED EMAIL
              let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);

              const mailOptions = {
                from: "anandhueducateanddevelop@gmail.com",
                to: send_Mail.Email,
                subject: 'Message enquiry',
                text: `You got a personal message from ${Sender_name}. Visit student alumni relations cell for more`
              };
        
              transporter.sendMail(mailOptions, async(error, info) => {
                if (error) {
                  console.error('Error sending email:', error);
                  return res.status(500).send('Error sending OTP');
                }
                console.log('Email sent:', info.response);
              });

              req.session.user.Room_Id = new Date()
            }
          }
        }

        return;

        // Log comment explaining why this function is used
        // (continuing comments as per the original)
        // it is because new_reciever list become empty after leaving from chatwith as they are no more new recievers
        // here what i do is that when i click send message, then i am just inserting a timestamp in individual chat (TIME_UNREAD_COLLECTION)
        // with sender id as to which user i send.
        // in this way i am explicitly saying that the reciever has leaved the chat the same time the sender sended a message.
        // so that i can fetch and compare the last time he leaved with current time to show the badge of unread messages
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});*/


router.post('/add-one-post-tochat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const postData = { ...req.body };
        const Sender_name = req.session.user.Name;
        const Reciever_Id = req.body.Reciever_Id;
        delete postData.Reciever_Id;
        const Sender_Id = req.session.user._id;
        const timestamp = new Date();
        const time_entered_inchat = timestamp.toISOString();
        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        const status = "multimedia";
        const MessageId = req.body.MessageId;
        const imageFileNames = [];
        const videoFileNames = [];
        const baseFolderPath = `./public/one-on-one-chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;

        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        await userHelpers.addPostOne(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
        
        if(req.session.user.Room_Id == null){
          let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
          if(get_Message_Time_Interval == null){
            console.log("SEND FIRST MAIL ONE ON ONE CHAT")
            // LOGIC TO SEND INITIAL MESSAGE
          }
          req.session.user.Room_Id = get_Message_Time_Interval
        } else if(req.session.user.Room_Id != null){
          if((isDifferentDay(req.session.user.Room_Id)) == true){
            let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
            req.session.user.Room_Id = get_Message_Time_Interval;
          }
        }
        
        await userHelpers.AddInverseChat(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnread(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);  //  ERRORERRORMARK  //  EDITEDEDITEDMARK [reverse sender, reciever id in case of error]

        const files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];

        await Promise.all(files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${MessageId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = baseFolderPath + fileName;

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        })));

        await userHelpers.addPostOneImages(Sender_Id, Reciever_Id, MessageId, imageFileNames);
        await userHelpers.addPostOneVideos(Sender_Id, Reciever_Id, MessageId, videoFileNames);

        res.json({ addedOnePostMessage: true });

        if(req.session.user.Room_Id != null){
          let current_message_count = await userHelpers.getArrayCount(Reciever_Id,Sender_Id)
          let existing_message_count = await userHelpers.getExistMessageCountOneChat(Reciever_Id,Sender_Id)
          if((current_message_count-existing_message_count)>0){
            const newNeededTimeChek = isDifferentDay(req.session.user.Room_Id)
            if(newNeededTimeChek){
              //   LOGIC TO SEND MAIL HERE
              console.log("SEND MAIL HERE ONE ON ONE CHAT")
            }
          }
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//   EMAIL FEATURE INTEGRATED
/*router.post('/add-one-post-tochat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const postData = { ...req.body };
        const Sender_name = req.session.user.Name;
        const Reciever_Id = req.body.Reciever_Id;
        delete postData.Reciever_Id;
        const Sender_Id = req.session.user._id;
        const timestamp = new Date();
        const time_entered_inchat = timestamp.toISOString();
        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        const status = "multimedia";
        const MessageId = req.body.MessageId;
        const imageFileNames = [];
        const videoFileNames = [];
        const baseFolderPath = `./public/one-on-one-chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;

        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        await userHelpers.addPostOne(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
        
        if(req.session.user.Room_Id == null){
          let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
          if(get_Message_Time_Interval == null){
            // LOGIC TO SEND INITIAL MESSAGE

            // GET REQUIRED EMAIL
            let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);

            const mailOptions = {
              from: "anandhueducateanddevelop@gmail.com",
              to: send_Mail.Email,
              subject: 'Message enquiry',
              text: `You got a personal message from ${Sender_name} for the first time. Visit student alumni relations cell for more`
            };
      
            transporter.sendMail(mailOptions, async(error, info) => {
              if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending OTP');
              }
              console.log('Email sent:', info.response);
            });

          }
          req.session.user.Room_Id = get_Message_Time_Interval
        } else if(req.session.user.Room_Id != null){
          if((isDifferentDay(req.session.user.Room_Id)) == true){
            let get_Message_Time_Interval = await userHelpers.getMessageTimeInterval(Sender_Id, Reciever_Id)
            req.session.user.Room_Id = get_Message_Time_Interval;
          }
        }
        
        await userHelpers.AddInverseChat(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnread(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);  //  ERRORERRORMARK  //  EDITEDEDITEDMARK [reverse sender, reciever id in case of error]

        const files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];

        await Promise.all(files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${MessageId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = baseFolderPath + fileName;

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        })));

        await userHelpers.addPostOneImages(Sender_Id, Reciever_Id, MessageId, imageFileNames);
        await userHelpers.addPostOneVideos(Sender_Id, Reciever_Id, MessageId, videoFileNames);

        res.json({ addedOnePostMessage: true });

        if(req.session.user.Room_Id != null){
          let current_message_count = await userHelpers.getArrayCount(Reciever_Id,Sender_Id)
          let existing_message_count = await userHelpers.getExistMessageCountOneChat(Reciever_Id,Sender_Id)
          if((current_message_count-existing_message_count)>0){
            const newNeededTimeChek = isDifferentDay(req.session.user.Room_Id)
            if(newNeededTimeChek){
              //   LOGIC TO SEND MAIL HERE
              
              // GET REQUIRED EMAIL
              let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);

              const mailOptions = {
                from: "anandhueducateanddevelop@gmail.com",
                to: send_Mail.Email,
                subject: 'Message enquiry',
                text: `You got a personal message from ${Sender_name}. Visit student alumni relations cell for more`
              };
        
              transporter.sendMail(mailOptions, async(error, info) => {
                if (error) {
                  console.error('Error sending email:', error);
                  return res.status(500).send('Error sending OTP');
                }
                console.log('Email sent:', info.response);
              });

            }
          }
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.post('/add_reaction_onechatchat', (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageID = req.body.MeSsAgEiD;
        let SenderId = req.session.user._id;
        let receiverId = req.body.ReCiEvErId;
        let Emoji = req.body.EmOjIcOnTeNt;
        userHelpers.addOneReaction(messageID, SenderId, receiverId, Emoji).then((response) => {
          res.json(response);
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_message_by_id_one', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let recieverId = req.body.rEcIeVeRiD;
        let user_iD = req.session.user._id;

        let message = await userHelpers.getMessageByOneTwoId(messageId, user_iD, recieverId);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id_one_text', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let recieverId = req.body.rEcIeVeRiD;
        let user_iD = req.session.user._id;

        let message = await userHelpers.getMessageByOneIdText(messageId, user_iD, recieverId);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id_one_Emoji', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let recieverId = req.body.rEcIeVeRiD;
        let user_iD = req.session.user._id;

        let message = await userHelpers.getMessageByOneIdEmoji(messageId, recieverId, user_iD);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/delete-message-from-chat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        await userHelpers.deleteOneMessage(req.body.MessagE, req.session.user._id, req.body.RecievE);
        res.json({ success: true});
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.get('/chatwith', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        const userId = req.session.user._id;
        let lastEntered = new Date();
        lastEntered = lastEntered.toISOString();
        await userHelpers.LastEnteredChatWith(lastEntered,userId);
        let Current_Send_List = await userHelpers.chatCOUNT(userId);//ONE_ON_ONE_CHAT_COLLECTION used
        //tells whom all we had sended atleast one message when entering chatwith at that time
        let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetails(userId) //CHAT_BACK_AND_FORTH_BOOK used
        //tells whom all we had recieved atleast one message when entering chatwith at that time
        let Current_Recieve_List_count = Current_Reciever_List.length;
        //number of all users we had recieved atleast one message when entering chatwith at that time
        let ExistingCount = await userHelpers.FetchChatRoomUpdate(userId);//ONE_CHAT_FIRST_CHAT_DETAILS used
        //all details when leaving from chatwith page
        let Existing_Send_List = ExistingCount.Send_List;
        //list of all users whom we sended at least one message when leaved chatwith page
        let Existing_Reciever_List = ExistingCount.Reciever_List;
        //list of all users whom we recieved at least one message when leaved chatwith page
        let Existing_Recieve_List_count = Existing_Reciever_List.length;
        // count of all users whom we recieved at least one message when leaved chatwith page
        let allSendRecieve = Array.from(new Set([...Current_Send_List, ...Current_Reciever_List]));
        // set (unique) of all current senders and recievers
        let broadTimeData = await userHelpers.fetchAdminBroadcastEntryDetailsBySenderID(userId)
        // used to fetch the details of when i last entered and leaved from admin broadcast message


        let New_Reciever = [];
        if (Existing_Recieve_List_count < Current_Recieve_List_count) {
            New_Reciever = Current_Reciever_List.filter(currentReceiver => !Existing_Reciever_List.includes(currentReceiver));
        } else {
            New_Reciever = [];
        }// finding new reciever by checking who is extra in Current_Reciever_List

        let fetch = await userHelpers.FetchupdateTimeUnread(Existing_Reciever_List,userId); // TIME_UNREAD_COLLECTION used
        // here Existing_Reciever_List and userId is used to find all the details from that recieved individual chat
        // returns an array which contains all individual chatinformation of me
        // that is fetching timestamp when last leaved from all individual chat, 
        // number of recieved message count from all individual chat, 
        // then room id of all individual chat
        // that is each entry of that array have leaved timestamp, recieved message count, roomid

        let messageCountArray = [];
        for (const Reciever_Id of Existing_Reciever_List) {
          //const count = await userHelpers.getArrayCount(userId, Reciever_Id);// ONE_ON_ONE_CHAT_COLLECTION used
          //const messageCount = count[0]?.userArrayLength || 0;
          const messageCount = await userHelpers.getArrayCount(userId, Reciever_Id);  // CHAT BACK AND FORTH USED
          // messageCount shows how much message had i recieved in total from that chat
          const timeStamp = new Date();
          messageCountArray.push({ userId, Reciever_Id,timeStamp, messageCount });
          // messageCountArray is an array which has this messageCount, Reciever_Id, userId(my id)
          // and a timestamp to show current time, current time because we are comparing with timastamp in fetch
          // that is comparing timestamp of fetched existing value with current time to check weather the number of any 
          // messages (messageCount) has increased to check weather new message has obtained 
        }
        // used to get details of current individual chat
        // like fetch function above, but instead of getting all the current values
        // here it fetches my id , reciever id, timestamp, recieved message count of each individual chat
        // here only details are shown if atleast i had recieved one message from the other user
        // even if there is chat with other person, but had not recieved any message, that is only sended, details are not displayed

        let Current_Message_Count_Conversation = [];
        Current_Message_Count_Conversation = messageCountArray.map(({ userId, Reciever_Id, timeStamp, messageCount }) => {
          const sortedIds = [userId, Reciever_Id].sort().join('');
          const _id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        
          return {
            _id,
            timeStamp:timeStamp.toISOString(),
            messageCount
          };
        }); 
        // combines both my id and reciever id to form a room id and formatting into same structure as that of fetch

        let sendedmessageUI = await userHelpers.getsendedMessageUIDetails(userId);
        //getting last sended message by me from all individual chat 
        let receivedMessageUI = await userHelpers.getReceivedMessageUIDetails(userId);
        //getting last recieved message to me from an individual chat
        let broadcastMessage = await userHelpers.getBroadcastMessageUIDetails();
        // getting last admin broadcasted message

        let broadcastmessageUI = [];
        if (broadcastMessage && Object.keys(broadcastMessage).length > 0) {
            let { _id, MessageId, ...filteredBroadcast } = broadcastMessage;
            let formattedBroadcast = {
                messageContent: filteredBroadcast.messageContent,
                timestamp: filteredBroadcast.timestamp,
                status: filteredBroadcast.status,
                Sender_name: filteredBroadcast.Sender_name,
                Sender_Id: filteredBroadcast.Sender_Id,
                ImageNames: filteredBroadcast.ImageNames,
                VideoNames: filteredBroadcast.VideoNames
            };
            broadcastmessageUI = [formattedBroadcast];
        }
        if (!Array.isArray(broadcastmessageUI)) {
          broadcastmessageUI = [broadcastmessageUI];
        }  // formatting last broadcasted message

        sendedmessageUI = Object.values(sendedmessageUI).map(message => {
          return {
            ...message,
            ID: Object.keys(sendedmessageUI).find(key => sendedmessageUI[key] === message),
            Send: true,
            lastSeen_applicable:true,
            one_Broadchat_applicable:false
          };
        });// formatting last sended message

        receivedMessageUI = receivedMessageUI.map(message => {
          message.ID = message.Sender_Id;
          delete message.Sender_Id;
          message.Recieve = true;
          message.lastSeen_applicable = true;
          message.one_Broadchat_applicable = false;
          return message;
        });// formating last recieved message

      if (!Array.isArray(broadcastmessageUI)) {
        broadcastmessageUI = [broadcastmessageUI];
      }   
      if (Array.isArray(broadcastmessageUI) && broadcastmessageUI.length > 0) {
        broadcastmessageUI = broadcastmessageUI.map(message => {
            message.ID = message.Sender_Id;
            delete message.Sender_Id;
            message.Recieve = true;
            // Check if broadTimeData is not empty and entered_timeStamp exists
            if (broadTimeData && broadTimeData.entered_timeStamp) {
                // Check if the timestamp is older than entered_timeStamp
                if (new Date(message.timestamp) < new Date(broadTimeData.entered_timeStamp)) {
                    message.badgeApplicable = false;
                } else {
                    message.badgeApplicable = true;
                }
            } else {
                // If broadTimeData is empty or entered_timeStamp doesn't exist, set badgeApplicable to true
                message.badgeApplicable = true;
            }
            message.lastSeen_applicable = false;
            message.one_Broadchat_applicable = true;
            return message;
        });
      } else {
          broadcastmessageUI = []; // Set broadcastMessageUI to an empty array if broadcastMessage is empty
      }// making last broadcast message into an array


      let combinedMessages = sendedmessageUI.concat(receivedMessageUI);
      combinedMessages = combinedMessages.concat(broadcastmessageUI); 
      // combining all last messages(sended, recieved, broadcasted )   

        let latestMessagesMap = new Map();
        combinedMessages.forEach(message => {
          const messageId = message.ID;

          if (!latestMessagesMap.has(messageId) || new Date(message.timestamp) > new Date(latestMessagesMap.get(messageId).timestamp)) {
            latestMessagesMap.set(messageId, message);
          }
        });//getting the last message from a chat by looking the timestamp
        // that means both last sended and recieved messages are there for a single chat. from that finding which is the last
        // weather sended or recieved.
        // uses timestamp to find last among both

        combinedMessages = Array.from(latestMessagesMap.values());
        combinedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        // sorting all the final messages in the order of timestamp(sended[if latest], recieved[if latest],broadcasted)

        if (New_Reciever && New_Reciever.length > 0) {      
          combinedMessages.forEach(message => {
            if (message.Recieve && New_Reciever.includes(message.ID)) {
              message.newMessenger = true;
            }
          });
        }// sets the value of newMessenger true if there is a new reciever which we found earlier
        // new messenger variable is used to show that a new connection was established.
        // this new reciever is added to existing reciever list when leaved from chat with

        let newMessageCount = [];
        Current_Message_Count_Conversation.forEach(currentMessage => {
          const matchedFetch = fetch.find(fetchMessage => fetchMessage._id === currentMessage._id);

          if (matchedFetch) {
            const oneSecondBefore = new Date(matchedFetch.timeStamp);
            oneSecondBefore.setSeconds(oneSecondBefore.getSeconds() - 1);
          
            if (new Date(currentMessage.timeStamp) > oneSecondBefore) {
              const messageCountDiff = currentMessage.messageCount - matchedFetch.messageCount;
              newMessageCount.push({ _id: currentMessage._id, messageCount: messageCountDiff });
            }
          }          
        });// finding the new message count by using the difference of existing recieved individual message count got from fetch
        // and current recieved individual message count from Current_Message_Count_Conversation

        combinedMessages.forEach(message => {
          if (message.Recieve) {
            newMessageCount.forEach(newMessage => {
              if (newMessage._id.includes(message.ID)) {
                message.newNotification = newMessage.messageCount;
              }
            });
          }else if(message.Send){
            message.newNotification = 0;
          }
        });// assigning message difference value only to recieved message as it is not needed for sended message
        // recived message generally needed recieved count and sended message needed blue tick methods to know weather they had read it

        combinedMessages.forEach(message => {
          if (message.Recieve) {
            let newMessageObtained = false;          
            newMessageCount.forEach(newMessage => {
              if (newMessage._id.includes(message.ID)) {
                message.newNotification = newMessage.messageCount;
                if (message.newNotification > 0) {
                  newMessageObtained = true;
                }
              }
            });      
            message.newMessageObtained = newMessageObtained;
          } else if (message.Send) {
            message.newNotification = 0;
            message.newMessageObtained = false;
          } else {
            message.newMessageObtained = false;
          }
        });// setting a variable named newMessageObtained as true if there is a new message recieved from existing messaged chat(not new connection)

        let Neeed_Send_List = [];
        combinedMessages.forEach((message) => {
          if (message.Send) {
            Neeed_Send_List.push(message.ID);
          }
        });
        // gets all the list of users to which i sended message
        // but note here that my status needed to be send, that means the last message with the individual chat must be a message sended by me
        // if it is a recieved message, then the user is not shown

        let new_room_id_collection = [];
        Existing_Send_List.forEach((receiver) => {
          const sortedIds = [userId, receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          new_room_id_collection.push(Room_Id);
        }); //same as room id collection, but uses existing sended list instead of existing recieved list
        // DIFFERENT FROM FETCH, HERE FOR NEW FETCH, ROOM ID AND NEEDED SENDER LIST IS USED AS THERE IS ALREADY SENDER ID AND RECIEVER ID AVAILABLE
        // HERE ONLY RECIEVER ID AVAILABLE, I CAN BE A RECIEVER OF MANY, SO SEARCHING WITH RECIEVER IS NOT RELIABLE, SO USED UNIQUE ROOM ID
        // ALSO ROOM ID COLLECTION IS UNIQUE FOR A CHAT. THAT IS IF I AM USING, I CAN BE RECIEVER OF MANY CHATS.
        // IF I AM USING ROOMID, I CAN TARGET THAT REQUIRED CHAT INSTEAD OF CHATS TO INCREASE EFFICIENCY

        let newFetch = await userHelpers.FetchupdateTimeUnreadSeen(new_room_id_collection,Neeed_Send_List);// TIME_UNREAD_COLLECTION used
        //used to get the details of all users to which i sended message
        // fetches details like when they leaved from my chat
        // if it is empty, then that means they hadn't opened my chat yet

        combinedMessages.forEach(async (message) => {
          if (message.Send) {
            const fetchEntry = newFetch.find((fetchMessage) => fetchMessage._id.includes(message.ID));
            if (fetchEntry) {
              const fetchTimestamp = new Date(fetchEntry.time_entered_inchat);
              const combinedTimestamp = new Date(message.timestamp);  
              if (combinedTimestamp < fetchTimestamp) {
                message.seen = true;
              }
            }
          }
        });
        // checking the last time they leaved from my chat.
        // if they leaved from my chat after the message was sent, then seen is set as true.
        // if they leaved from my chat before the message was sent, then seen is set as false

        let newDoubleTickDelivered = await userHelpers.fetchDoubleTickTime(Neeed_Send_List); //ONE_CHAT_FIRST_CHAT_DETAILS used
        // fetching the time the users last leaved from chatwith
        combinedMessages.forEach(async (message) => {
          if (message.Send) {
            const matchingEntry = newDoubleTickDelivered.find((deliveredMessage) => deliveredMessage.Sender_Id === message.ID);
            if (matchingEntry && new Date(matchingEntry.last_entered_time) > new Date(message.timestamp)) {
              message.delivered = true;
            }
          }
        });
        // checking weather the message is delivered.
        // that is if they leaved from  chatwith after the message was sent, then delivered is set as true.
        // if they leaved from chatwith before the message was sent, then delivered is set as false


        let AllDoubleTickDeliveredLastSeen = await userHelpers.fetchDoubleTickTime(allSendRecieve); //ONE_CHAT_FIRST_CHAT_DETAILS used
        combinedMessages.forEach(async (message) => {
          const matchingEntry = AllDoubleTickDeliveredLastSeen.find((lastSeenTime) => lastSeenTime.Sender_Id === message.ID);
          if (matchingEntry) {
              const dateObject = new Date(matchingEntry.timestamp);
              const options = { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
              const formattedTime = new Intl.DateTimeFormat('en-US', options).format(dateObject);
              message.lastSeen = formattedTime;
          }
        });
        //last seen of all chats inside chatwith is shown
        // user needs to leave from chatwith to get the last seen
        res.render('user/chatwith', 
        {
          combinedMessages, 
          uber, showHeader1: true, 
          showHeader2: true ,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } 
      else{
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error fetching chat room update:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});


router.get('/one_on_admin_broadcast', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let myID = req.session.user._id;

        let pinned_message = await userHelpers.GetPinnedAdminO_n_eT_w_oT_wo_E_i_g_htBroadMessage();
        let polldata = await userHelpers.getBroadPollInformation(myID);

        let timeStamp = new Date();
        timeStamp = timeStamp.toString();
        await userHelpers.EnterAdminMessageOne(myID, timeStamp);
        
        let currentAdminBroadCastCount = await userHelpers.getAllCountOfCurrentAdminBroad();
        let existingAdminBroadCastCount = await userHelpers.getExistingBroadcastCount(myID);
        const skip = 0;
        const difference = currentAdminBroadCastCount - existingAdminBroadCastCount;
        const limit = difference > 100 ? 100 : Math.max(50, difference);
        let Admin_broadcasts = await userHelpers.GetAllAdminBroadcastMessage(skip, limit); 

        if (difference > 0 && difference <= Admin_broadcasts.length) {
          Admin_broadcasts[difference - 1].last_notification = true;
        }
        

        Admin_broadcasts.reverse();

        res.render('user/one_on_admin_broadcast', {
          showHeader1: true,
          showHeader2: true,
          uber,
          myID,
          Admin_broadcasts,
          groupchatcount,
          total_message,
          total_notify_number,
          pinned_message,
          limit, polldata
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_broadcastmessages', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let Admin_broadcasts = await userHelpers.GetAllAdminBroadcastMessage(skip, limit); 
        res.json({ success: true, Admin_broadcasts }); 

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add_reaction_adminBroadcast', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let messageId = req.body.MeSsAgEiD;
        let emoji = req.body.EmOjIcOnTeNt;
        let user_id = req.session.user._id;
        let user_Name = req.session.user.Name;

        await userHelpers.addRemoveAdminBroadcastReaction(messageId, emoji, user_id, user_Name).then((response) => {
          res.json(response);
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/get_message_by_id_broadcast_emoji', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        try {
          let message = await userHelpers.getAdminBroadMessageByIdEmoji(messageId);
          res.json({ message });
          return;
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_message_by_id_broadcast', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        try {
          let message = await userHelpers.getAdminBroadMessageById(messageId);
          res.json({ message });
          return;
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/submit_broad_poll', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let response = await userHelpers.submitbroadPoll(req.body.vAlUe,req.session.user._id,req.session.user.Name);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_all_broad_pollresult', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let response = await userHelpers.getAllbroadPollResult();
        res.json({success:true,response});
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get('/searchfriends', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        
        res.render('user/searchFriends', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/search-friend', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Name = req.body.searchName;
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let usersAll = await userHelpers.GetUserThroughSearch(Name); //  NAME, STATUS, EMPLOYEMENT STATUS, ID
        
        res.render('user/searchFriends', {
          showHeader1: true,
          showHeader2: true,
          uber,
          usersAll,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/more-advance-search', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        
        res.render('user/more-advance-search', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/search-by-passoutyear', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        
        res.render('user/searchPassout', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/search-by-passoutyear', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let passout = req.body.searchPassout;
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let usersAll = await userHelpers.GetUserPassoutThroughSearch(passout);  // NAME, ID, PASSOUT YEAR, EMPLOYEMENT_STATUS
        res.render('user/searchPassout', {
          showHeader1: true,
          showHeader2: true,
          uber,
          usersAll,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/search-by-location', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/searchLocation', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/search-by-location', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let location = req.body.searchLocation;
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let usersAll = await userHelpers.GetUserLocationThroughSearch(location);  //  NAME, STATUS, CURRENT LOCATION, EMPLOYEMENT STATUS
        res.render('user/searchLocation', {
          showHeader1: true,
          showHeader2: true,
          uber,
          usersAll,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/search-by-domain', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/searchDomain', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/search-by-domain', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let domain = req.body.searchDomain;
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let usersAll = await userHelpers.GetUserDomainThroughSearch(domain);  //  NAME, ID, STATUS, EMPLOYEMENT STATUS 
        res.render('user/searchDomain', {                                     //   (NO DOMAIN - NEED TO VIEW PROFILE TO SEE DOMAINS)
          showHeader1: true, 
          showHeader2: true, 
          uber, usersAll,
          groupchatcount,
          total_message,
          total_notify_number 
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/search-by-filter', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/search-by-filter', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

  
router.post('/search-by-filter', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let filter = req.body;
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let usersAll = await userHelpers.GetFilteredUsersThroughSearch(filter);  // ID, NAME, CURRENT LOCATION, PASSOUT YEAR, STATUS
        res.render('user/search-by-filter',                                      // BRANCH, EMPLOYEMENT STATUS, ADMISSION YEAR
          { 
            showHeader1: true, 
            showHeader2: true, 
            uber, usersAll,
            groupchatcount,
            total_message,
            total_notify_number
           });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/settings', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/settings', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/delete_account', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/delete_account', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_account', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const reason = req.body.delete_reason;
        const user_id = req.session.user._id;
        
        await userHelpers.InsertDeletionIdReasonAccountUser(user_id, reason);
        await userHelpers.markDeletion(user_id);
        
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            res.status(500).send("Error destroying session.");
          } else {
            // Redirect to login page after session is destroyed
            res.redirect('/login');
            return;
          }
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/reactivate_account', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      const user_ID = req.session.user._id;
      const isActive = await userHelpers.ReactivateUserAccount(user_ID);

      if (isActive.status_change_activated == true) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            res.status(500).send("Error destroying session");
            return;
          } else {
            res.redirect('/login');
            return;
          }
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error reactivating account:", error);
    res.status(500).send("Error reactivating account");
  }
});


router.get('/contact_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        
        res.render('user/contact_admin', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error fetching admin ID or rendering contact admin page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/block_user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;

        res.render('user/block_user', {
          showHeader1: true,
          showHeader2: true,
          uber,
          block_detail_understand: true,
          ShowBlockUsers: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error rendering block user page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/see_all_blocked_users', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let user_id = req.session.user._id;

        let usersAll = await userHelpers.getindiBlockLogData(user_id);
        let seeBlockUsers = await userHelpers.getUserDetailsFromBlockArray(usersAll);  // EDITMARK  , I THINK ANOTHER FUNCTION PRESENT

        res.render('user/block_user', {
          showHeader1: true,
          showHeader2: true,
          uber,
          block_detail_understand: true,
          ShowBlockUsers: true,
          seeBlockUsers,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error rendering see all blocked users page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/unblock_user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let view = req.body.ProfileId;
        let user_id = req.session.user._id;
        await userHelpers.RemoveBlock(view, user_id);
        res.redirect('/settings');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error unblocking user in profile:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/search_block_byname', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let Name = req.body.searchName;
        
        let usersAll = await userHelpers.GetUserThroughSearch(Name);   //  NAME, STATUS, EMPLOYEMENT STATUS, ID
        
        res.render('user/block_user', {
          showHeader1: true,
          showHeader2: true,
          uber,
          usersAll,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error searching blocked users by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/block-user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let sender = req.body.ProfileId;
        let uber = req.session.user.Name;
        
        let sender_detail = await userHelpers.getLowProfile(sender);
        
        res.render('user/block_user_action', {
          showHeader1: true,
          showHeader2: true,
          uber,
          sender_detail,
          has_sender_byid: true,
          showsearch: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error blocking user by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/block_user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let user_id = req.session.user._id;
        let blocked_id = req.body.blocked_id;
        let block_reason = req.body.block_reason;

        if (blocked_id !== user_id) {
          await userHelpers.sendBlockData(user_id, blocked_id, block_reason);
          res.redirect('/settings');
          return;
        } else {
          res.redirect('/settings');
          return;
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/report_user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        
        res.render('user/report_user', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error rendering report user page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/search_report_byname', verifyLogin, async (req, res) => {
  try { 
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let uber = req.session.user.Name;
        let Name = req.body.searchName;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let usersAll = await userHelpers.GetUserThroughSearch(Name);
        res.render('user/report_user', {
          showHeader1: true,
          showHeader2: true,
          uber,
          usersAll,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error searching report by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/report-user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let sender = req.body.ProfileId;
        let uber = req.session.user.Name;
        let sender_detail = await userHelpers.getLowProfile(sender);
        res.render('user/report_user_action', {
          showHeader1: true,
          showHeader2: true,
          uber,
          sender_detail,
          has_sender_byid: true,
          showsearch: true,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error fetching user profile for report:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/report_user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let user_id = req.session.user._id;
        let reporter_id = req.body.reporter_id;
        let report_reason = req.body.report_reason;
        await userHelpers.sendReportData(user_id, reporter_id, report_reason, req.session.user.Name);
        res.redirect('/settings');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error sending report data:", error);
    res.status(500).send("Internal Server Error");
  }
});


//  EMAIL INTEGRATED
/*router.post('/report_user', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let user_id = req.session.user._id;
        let reporter_id = req.body.reporter_id;
        let report_reason = req.body.report_reason;
        let response = await userHelpers.sendReportData(user_id, reporter_id, report_reason);
        if(response.sended_report){

          res.redirect('/settings');
          
          // GET REQUIRED EMAIL
          let required_mail = await userHelpers.getBaseAdminMail()

          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: required_mail.Email,
            subject: 'Block report',
            text: `You had got a block report`
          };
    
          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);
          });

          return
        }
        else{
          res.status(500).send("Error sending report");
          return
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error sending report data:", error);
    res.status(500).send("Internal Server Error");
  }
});*/


router.get('/ask_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/ask_admin', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error rendering ask_admin page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/ask_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const userId = req.session.user._id;
        const Name_IN = req.session.user.Name;
        let content = req.body.content;
        content = content.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
        req.body.content = content;
        
        const timestamp = new Date();
        const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        
        let insertedAskId = await userHelpers.addAskedAdmin(req.body, Name_IN, userId, formattedTimestamp, timestamp);

        const baseFolderPath = `./public/ask-admin/${userId}/${insertedAskId}/`;
        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        const files = req.files ? (Array.isArray(req.files.askImage) ? req.files.askImage : [req.files.askImage]) : [];

        const imageFileNames = [];
        const videoFileNames = [];

        // Process each file using worker threads
        const fileProcessingPromises = files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${insertedAskId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = path.join(baseFolderPath, fileName);

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        }));

        await Promise.all(fileProcessingPromises);

        await userHelpers.addaskImages(insertedAskId, imageFileNames);
        await userHelpers.addaskVideos(insertedAskId, videoFileNames);

        res.redirect('/contact_admin');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//   EMAIL INTEGRATED
/*router.post('/ask_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        const userId = req.session.user._id;
        const Name_IN = req.session.user.Name;
        let content = req.body.content;
        content = content.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
        req.body.content = content;
        
        const timestamp = new Date();
        const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        
        let insertedAskId = await userHelpers.addAskedAdmin(req.body, Name_IN, userId, formattedTimestamp);

        const baseFolderPath = `./public/ask-admin/${userId}/${insertedAskId}/`;
        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        const files = req.files ? (Array.isArray(req.files.askImage) ? req.files.askImage : [req.files.askImage]) : [];

        const imageFileNames = [];
        const videoFileNames = [];

        // Process each file using worker threads
        const fileProcessingPromises = files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${insertedAskId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = path.join(baseFolderPath, fileName);

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        }));

        await Promise.all(fileProcessingPromises);

        await userHelpers.addaskImages(insertedAskId, imageFileNames);
        await userHelpers.addaskVideos(insertedAskId, videoFileNames);

        res.redirect('/contact_admin');

        // GET REQUIRED EMAIL
        let required_mail = await userHelpers.getBaseAdminMail()

        const mailOptions = {
          from: "anandhueducateanddevelop@gmail.com",
          to: required_mail.Email,
          subject: 'Query report',
          text: `You had got a query report`
        };
  
        transporter.sendMail(mailOptions, async(error, info) => {
          if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending OTP');
          }
          console.log('Email sent:', info.response);
        });

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.post('/one_on_admin_chat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;

        let uber = req.session.user.Name;
        let Sender_Id = req.session.user._id;
        let Reciever_Id = req.body.User_Id;
        let reciever = await userHelpers.getBaseAdmin();
        let sender = {};
        sender.Name = uber;
        sender._id = Sender_Id;

        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');

        let time_entered_inchat = new Date();
        time_entered_inchat = time_entered_inchat.toISOString();
        await userHelpers.updateEnteredTimeUnreadAdmin(Sender_Id, Reciever_Id, Room_Id, time_entered_inchat);

        let sendmessages = await userHelpers.oneONoneCHATAdmin(Sender_Id, Reciever_Id);
        let recievedmessages = await userHelpers.oneONoneCHATAdmin(Reciever_Id, Sender_Id);

        const CURRENT_messageCount = await userHelpers.getArrayCountAdmin(Sender_Id, Reciever_Id);
        const Existing_messageCount = await userHelpers.GetExistingAdminIndiMessCount(Sender_Id, Reciever_Id);
        
        if (CURRENT_messageCount > (Existing_messageCount + 1)) {
          recievedmessages[Existing_messageCount].last_notification = true;
        }

        sendmessages = sendmessages.map(message => ({ ...message, Send: true}));
        recievedmessages = recievedmessages.map(message => ({ ...message, Recieve: true}));
        let messages = [...sendmessages, ...recievedmessages];

        messages.sort((a, b) => a.timestamp - b.timestamp);

        res.render('user/one_on_admin_chat', {
          uber,
          Room_Id,
          showHeader1: true,
          showHeader2: true,
          messages,
          sender,
          reciever,
          groupchatcount,
          total_message,
          total_notify_number
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in one_on_admin_chat route:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_message_by_id_admin_one', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let recieverId = req.body.rEcIeVeRiD;
        let user_iD = req.session.user._id;

        let message = await userHelpers.getMessageByAdminOneId(messageId, user_iD, recieverId);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in get_message_by_id_admin_one route:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id_admin_one_text', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let recieverId = req.body.rEcIeVeRiD;
        let user_iD = req.session.user._id;

        let message = await userHelpers.getMessageByAdminOneIdText(messageId, user_iD, recieverId);
        res.json({ message });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in get_message_by_id_admin_one_text route:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/add_reaction_Admin_onechatchat', async(req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageID = req.body.MeSsAgEiD;
        let SenderId = req.session.user._id;
        let receiverId = req.body.ReCiEvErId;
        let Emoji = req.body.EmOjIcOnTeNt;
        await userHelpers.addOneAdminReaction(messageID, SenderId, receiverId, Emoji).then((response) => {
            res.json(response);
            return;
          })
          .catch((error) => {
            console.error("Error adding reaction:", error);
            res.status(500).json({ error: "Error adding reaction." });
          });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in add_reaction_Admin_onechatchat route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_message_by_id_Admin_one_Emoji', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let messageId = req.body.MeSsAgEiD;
        let receiverId = req.body.rEcIeVeRiD;
        let userId = req.session.user._id;

        try {
          let message = await userHelpers.getMessageByAdminOneIdEmoji(messageId, receiverId, userId);
          res.json({ message });
          return;
        } catch (error) {
          console.error("Error fetching message by ID:", error);
          res.status(500).json({ error: "Error fetching message by ID." });
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error in get_message_by_id_Admin_one_Emoji route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/send_one_admin_message', verifyLogin, async (req, res) => {
  try { 
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let Sender_name = req.session.user.Name;
        let Sender_Id = req.session.user._id
        let status = "textmessage";
        let messageContent = req.body.messageContent;
        let actualMessageId = req.body.actualMessageId;
        let MessageId = req.body.MessageId;
        let actualMessageContent = req.body.actualMessageContent;
        let Reciever_name = req.body.Reciever_name;
        let Reciever_Id = req.body.recieverUserId;
        let ReadableTime = req.body.ReadableTime;
        const Room_Id = req.body.Room_Id;
        const timestamp = new Date();
        let time_entered_inchat = timestamp.toISOString();

        await userHelpers.handleOneChatMessageAdmin(
          MessageId, messageContent, 
          actualMessageId, 
          actualMessageContent, 
          timestamp, status, Reciever_Id, 
          Sender_Id, ReadableTime, 
          Sender_name, Reciever_name
        ).then((response) => {
          res.json(response);
        });

        await userHelpers.AddadminMessageFlag(Sender_Id);
        await userHelpers.AddInverseChatAdmin(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);
        return;
        
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


//  EMAIL INTEGRATION
/*router.post('/send_one_admin_message', verifyLogin, async (req, res) => {
  try { 
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        const Sender_name = req.session.user.Name;
        const Sender_Id = req.session.user._id
        let status = "textmessage";
        let messageContent = req.body.messageContent;
        let actualMessageId = req.body.actualMessageId;
        let MessageId = req.body.MessageId;
        let actualMessageContent = req.body.actualMessageContent;
        const Reciever_name = req.body.Reciever_name;
        const Reciever_Id = req.body.recieverUserId;
        let ReadableTime = req.body.ReadableTime;
        const Room_Id = req.body.Room_Id;
        const timestamp = new Date();
        let time_entered_inchat = timestamp.toISOString();

        await userHelpers.handleOneChatMessageAdmin(
          MessageId, messageContent, 
          actualMessageId, 
          actualMessageContent, 
          timestamp, status, Reciever_Id, 
          Sender_Id, ReadableTime, 
          Sender_name, Reciever_name
        ).then(async(response) => {
          res.json(response);

          if(response.addedoneAdminmessage){
            if(req.session.user.Room_Id == null){
              let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
              if(get_Message_Time_Interval == null){
                // LOGIC TO SEND INITIAL MESSAGE

                // GET REQUIRED EMAIL
                let send_Mail = await userHelpers.getBaseAdminMail(Reciever_Id);

                const mailOptions = {
                  from: "anandhueducateanddevelop@gmail.com",
                  to: send_Mail.Email,
                  subject: 'Message enquiry',
                  text: `You got a personal message from ${Sender_name} for the first time. Visit student alumni relations cell for more`
                };
          
                transporter.sendMail(mailOptions, async(error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send('Error sending OTP');
                  }
                  console.log('Email sent:', info.response);
                });

                req.session.user.Room_Id = new Date()
              }
              req.session.user.Room_Id = get_Message_Time_Interval
            } else if(req.session.user.Room_Id != null){
              if((isDifferentDay(req.session.user.Room_Id)) == true){
                let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
                req.session.user.Room_Id = get_Message_Time_Interval;
              }
            }
          }
        });

        await userHelpers.AddadminMessageFlag(Sender_Id);
        await userHelpers.AddInverseChatAdmin(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);
       
        if(req.session.user.Room_Id != null){
          let current_message_count = await userHelpers.getArrayCountAdmin(Reciever_Id,Sender_Id)
          let existing_message_count = await userHelpers.GetExistingAdminIndiMessCount(Reciever_Id,Sender_Id)  // EDIT IN THIS FUNCTION
          if((current_message_count-existing_message_count)>0){
            const newNeededTimeChek = isDifferentDay(req.session.user.Room_Id)
            if(newNeededTimeChek){
              //   LOGIC TO SEND MAIL HERE

              // GET REQUIRED EMAIL
              let send_Mail = await userHelpers.getBaseAdminMail(Reciever_Id);

              const mailOptions = {
                from: "anandhueducateanddevelop@gmail.com",
                to: send_Mail.Email,
                subject: 'Message enquiry',
                text: `You got a personal message from ${Sender_name}. Visit student alumni relations cell for more`
              };
        
              transporter.sendMail(mailOptions, async(error, info) => {
                if (error) {
                  console.error('Error sending email:', error);
                  return res.status(500).send('Error sending OTP');
                }
                console.log('Email sent:', info.response);
              });

              req.session.user.Room_Id = new Date()
            }
          }
        }
       
        return;
        
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});*/


router.post('/add_one_post_admin_tochat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const postData = { ...req.body };
        const Room_Id = postData.Room_Id;
        delete postData.Room_Id;
        const Sender_name = req.session.user.Name;
        const Reciever_Id = postData.Reciever_Id;
        delete postData.Reciever_Id;
        const Sender_Id = req.session.user._id;
        const timestamp = new Date();
        const time_entered_inchat = timestamp.toISOString();
        const status = "multimedia";
        const MessageId = req.body.MessageId;
        const imageFileNames = [];
        const videoFileNames = [];
        const baseFolderPath = `./public/one_on_admin_one_chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;

        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        await userHelpers.addPostOneAdmin(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
        await userHelpers.AddadminMessageFlag(Sender_Id);
        await userHelpers.AddInverseChatAdmin(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);

        const files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
        
        await Promise.all(files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${MessageId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = baseFolderPath + fileName;

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        })));

        await userHelpers.addPostOneImagesAdmin(Sender_Id, Reciever_Id, MessageId, imageFileNames);
        await userHelpers.addPostOneVideosAdmin(Sender_Id, Reciever_Id, MessageId, videoFileNames);

        res.json({ addedOnePostAdminMessage: true });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//   EMAIL INTEGRATED
/*router.post('/add_one_post_admin_tochat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        const postData = { ...req.body };
        const Room_Id = postData.Room_Id;
        delete postData.Room_Id;
        const Sender_name = req.session.user.Name;
        const Reciever_Id = postData.Reciever_Id;
        delete postData.Reciever_Id;
        const Sender_Id = req.session.user._id;
        const timestamp = new Date();
        const time_entered_inchat = timestamp.toISOString();
        const status = "multimedia";
        const MessageId = req.body.MessageId;
        const imageFileNames = [];
        const videoFileNames = [];
        const baseFolderPath = `./public/one_on_admin_one_chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;

        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }

        await userHelpers.addPostOneAdmin(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
        
        if(req.session.user.Room_Id == null){
          let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
          if(get_Message_Time_Interval == null){
            // LOGIC TO SEND INITIAL MESSAGE

            // GET REQUIRED EMAIL
            let send_Mail = await userHelpers.getBaseAdminMail(Reciever_Id);

            const mailOptions = {
              from: "anandhueducateanddevelop@gmail.com",
              to: send_Mail.Email,
              subject: 'Message enquiry',
              text: `You got a personal message from ${Sender_name} for the first time. Visit student alumni relations cell for more`
            };
      
            transporter.sendMail(mailOptions, async(error, info) => {
              if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending OTP');
              }
              console.log('Email sent:', info.response);
            });

            req.session.user.Room_Id = new Date()
          }
          req.session.user.Room_Id = get_Message_Time_Interval
        } else if(req.session.user.Room_Id != null){
          if((isDifferentDay(req.session.user.Room_Id)) == true){
            let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
            req.session.user.Room_Id = get_Message_Time_Interval;
          }
        }
        
        await userHelpers.AddadminMessageFlag(Sender_Id);
        await userHelpers.AddInverseChatAdmin(Sender_Id, Reciever_Id);
        await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id, Sender_Id, Room_Id, time_entered_inchat);

        const files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
        
        await Promise.all(files.map(file => new Promise((resolve, reject) => {
          const fileExtension = file.name.split('.').pop();
          const fileName = `${MessageId}_${files.indexOf(file) + 1}.${fileExtension}`;
          const outputPath = baseFolderPath + fileName;

          const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
            workerData: {
              mediaBuffer: file.data,
              outputPath: outputPath,
              fileType: file.mimetype.includes('image') ? 'image' : 'video'
            }
          });

          worker.on('message', async (message) => {
            if (message.status === 'success') {
              if (file.mimetype.includes('image')) {
                imageFileNames.push(fileName);
              } else if (file.mimetype.includes('video')) {
                videoFileNames.push(fileName);
              }
              resolve();
            } else {
              console.error('Error processing file:', message.error);
              reject(new Error('File processing failed'));
            }
          });

          worker.on('error', (error) => {
            console.error('Worker error:', error);
            reject(error);
          });

          worker.on('exit', (code) => {
            if (code !== 0) {
              console.error('Worker stopped with exit code', code);
              reject(new Error('Worker stopped with exit code ' + code));
            }
          });
        })));

        await userHelpers.addPostOneImagesAdmin(Sender_Id, Reciever_Id, MessageId, imageFileNames);
        await userHelpers.addPostOneVideosAdmin(Sender_Id, Reciever_Id, MessageId, videoFileNames);

        res.json({ addedOnePostAdminMessage: true });

        if(req.session.user.Room_Id != null){
          let current_message_count = await userHelpers.getArrayCountAdmin(Reciever_Id,Sender_Id)
          let existing_message_count = await userHelpers.GetExistingAdminIndiMessCount(Reciever_Id,Sender_Id)  // EDIT IN THIS FUNCTION
          if((current_message_count-existing_message_count)>0){
            const newNeededTimeChek = isDifferentDay(req.session.user.Room_Id)
            if(newNeededTimeChek){
              //   LOGIC TO SEND MAIL HERE

              // GET REQUIRED EMAIL
              let send_Mail = await userHelpers.getBaseAdminMail(Reciever_Id);

              const mailOptions = {
                from: "anandhueducateanddevelop@gmail.com",
                to: send_Mail.Email,
                subject: 'Message enquiry',
                text: `You got a personal message from ${Sender_name}. Visit student alumni relations cell for more`
              };
        
              transporter.sendMail(mailOptions, async(error, info) => {
                if (error) {
                  console.error('Error sending email:', error);
                  return res.status(500).send('Error sending OTP');
                }
                console.log('Email sent:', info.response);
              });

              req.session.user.Room_Id = new Date()
            }
          }
        }

        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.get('/chatwith_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        const userId = req.session.user._id;
        let user_id = await userHelpers.getAdminID();
        user_id = user_id.toString();
        let ExistingCount = await userHelpers.FetchChatRoomUpdateAdmin(userId);
        let Existing_Reciever_List = ExistingCount.Reciever_List;
        let Existing_Recieve_List_count = Existing_Reciever_List.length;
        let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(userId) 
        let Current_Recieve_List_count = Current_Reciever_List.length;
        let Admin_Send_flag = await userHelpers.Fetch_1_2_2_adminMessageFlag_8(userId)

        if(Existing_Recieve_List_count == 0 && Admin_Send_flag == 0){
          res.render('user/chatwith_admin', 
            {
              userId,user_id,first_convey:true,
              showHeader1: true,
              showHeader2: true,
              uber,groupchatcount,
              total_notify_number
            });
          return;

        } else if(Existing_Recieve_List_count >= 1 || Admin_Send_flag == 1){ 
          let New_Reciever = [];
          if (Existing_Recieve_List_count < Current_Recieve_List_count) {
              New_Reciever = Current_Reciever_List.filter(currentReceiver => !Existing_Reciever_List.includes(currentReceiver));
          } else {
              New_Reciever = [];
          }

          let fetch = await userHelpers.FetchupdateTimeUnreadAdmin(Existing_Reciever_List,userId); // TIME_UNREAD_COLLECTION used       

          let messageCountArray = [];
          for (const Reciever_Id of Existing_Reciever_List) {
            const messageCount = await userHelpers.getArrayCountAdmin(userId, Reciever_Id);// CHAT_BACK_AND_FORTH_BOOK_ADMIN used
            const timeStamp = new Date();
            messageCountArray.push({ userId, Reciever_Id,timeStamp, messageCount });
          }
        
          let Current_Message_Count_Conversation = [];
          Current_Message_Count_Conversation = messageCountArray.map(({ userId, Reciever_Id, timeStamp, messageCount }) => {
            const sortedIds = [userId, Reciever_Id].sort().join('');
            const _id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          
            return {
              _id,
              timeStamp:timeStamp.toISOString(),
              messageCount
            };
          }); 

          let sendedmessageUI = await userHelpers.getsendedMessageUIDetailsAdmin(userId);
          let receivedMessageUI = await userHelpers.getReceivedMessageUIDetailsAdmin(userId); // CURRENT RECIEVED MESSAGES

          sendedmessageUI = Object.values(sendedmessageUI).map(message => {
            return {
              ...message,
              ID: Object.keys(sendedmessageUI).find(key => sendedmessageUI[key] === message),
              Send: true,
            };
          });// formatting last sended message

          receivedMessageUI = receivedMessageUI.map(message => {
            message.ID = message.Sender_Id;
            delete message.Sender_Id;
            message.Recieve = true;
            return message;
          });// formating last recieved message

          let combinedMessages = sendedmessageUI.concat(receivedMessageUI);

          let latestMessagesMap = new Map();
          combinedMessages.forEach(message => {
            const messageId = message.ID;

            if (!latestMessagesMap.has(messageId) || new Date(message.timestamp) > new Date(latestMessagesMap.get(messageId).timestamp)) {
              latestMessagesMap.set(messageId, message);
            }
          });

          combinedMessages = Array.from(latestMessagesMap.values());
          combinedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          // sorting all the final messages in the order of timestamp(sended[if latest], recieved[if latest],broadcasted)

          if (New_Reciever && New_Reciever.length > 0) {      
            combinedMessages.forEach(message => {
              if (message.Recieve && New_Reciever.includes(message.ID)) {
                message.newMessenger = true;
              }
            });
          }

          let newMessageCount = [];
          Current_Message_Count_Conversation.forEach(currentMessage => {
            const matchedFetch = fetch.find(fetchMessage => fetchMessage._id === currentMessage._id);

            if (matchedFetch) {
              const oneSecondBefore = new Date(matchedFetch.timeStamp);
              oneSecondBefore.setSeconds(oneSecondBefore.getSeconds() - 1);
            
              if (new Date(currentMessage.timeStamp) > oneSecondBefore) {
                const messageCountDiff = currentMessage.messageCount - matchedFetch.messageCount;
                newMessageCount.push({ _id: currentMessage._id, messageCount: messageCountDiff });
              }
            } 
          });


          combinedMessages.forEach(message => {
            if (message.Recieve) {
              newMessageCount.forEach(newMessage => {
                if (newMessage._id.includes(message.ID)) {
                  message.newNotification = newMessage.messageCount;
                }
              });
            }else if(message.Send){
              message.newNotification = 0;
            }
          });// assigning message difference value only to recieved message as it is not needed for sended message
          // recived message generally needed recieved count and sended message needed blue tick methods to know weather they had read it

          combinedMessages.forEach(message => {
            if (message.Recieve) {
              let newMessageObtained = false;          
              newMessageCount.forEach(newMessage => {
                if (newMessage._id.includes(message.ID)) {
                  message.newNotification = newMessage.messageCount;
                  if (message.newNotification > 0) {
                    newMessageObtained = true;
                  }
                }
              });      
              message.newMessageObtained = newMessageObtained;
            } else if (message.Send) {
              message.newNotification = 0;
              message.newMessageObtained = false;
            } else {
              message.newMessageObtained = false;
            }
          });// setting a variable named newMessageObtained as true if there is a new message recieved from existing messaged chat(not new connection)
 
          res.render('user/chatwith_admin', 
          {
            userId, combinedMessages, 
            showHeader1: true,
            showHeader2: true,
            uber,groupchatcount,
            total_message,
            total_notify_number
          });
          return;
        }
      } 
      else{
        res.render('user/view_page_disabled');
        return
      }    
    }else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error fetching chat room update:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});


router.get('/grant_admin_access_buttons', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userID = req.session.user._id;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        toggle_status = await userHelpers.fetchViewAdminTransferState(userID);

        res.render('user/grant_admin_access_buttons', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number,
          toggle_status
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/enable_admin_deleted_one_on_one_chat_visitor', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let userID = req.session.user._id;
        const result = await userHelpers.EnableVisitTransfer(userID);
        res.json({ success: true, powertransfer_enabled: result.powertransfer_enabled });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});


router.get('/gallery', async (req, res, next) => {
  try {
    let contents = await userHelpers.getAllGallery()
    res.render('user/arc_gallery',{showHeader1: true, contents});
    return;
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.get('/user_guideline', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        res.render('user/help_guideline',
          {
            showHeader1: true,
            showHeader2: true,
            uber,groupchatcount,
            total_message,
            total_notify_number
          });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    next(error); // Passes the error to the next middleware (error handler)
  }
});


router.get('/view_askadmin_enquiries_from_this_profile', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        const enq = await userHelpers.view_your_enquiries(req.session.user._id)
        enq.reverse();
        res.render('user/view_askadmin_enquiries_from_this_profile', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number,
          enq
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error rendering view askadmin enquiry page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/view_each_enquiry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let view_enquiry = req.body.enquiryId;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let enquiries = await userHelpers.GetindiEnquiries(view_enquiry);
        let multimedia = (enquiries.VideoNames && enquiries.VideoNames.length > 0) || (enquiries.ImageNames && enquiries.ImageNames.length > 0);
        res.render('user/view_each_enquiry', 
          {
            enquiries, multimedia,
            showHeader1: true,
            showHeader2: true,
            uber,
            groupchatcount,
            total_message,
            total_notify_number,
          });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing each enquiry:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/view_user_report_from_this_profile', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        const reports_in = await userHelpers.view_your_reports(req.session.user._id);
        res.render('user/view_user_report_from_this_profile', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number,
          reports_in
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error rendering view report page:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/view_each_report', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus === "active") {
        let view_report = req.body.report_id;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user.Name;
        let enquiries = await userHelpers.GetindiReports(view_report);
        let multimedia = (enquiries.VideoNames && enquiries.VideoNames.length > 0) || (enquiries.ImageNames && enquiries.ImageNames.length > 0);
        res.render('user/view_each_report', 
          {
            enquiries, multimedia,
            showHeader1: true,
            showHeader2: true,
            uber,
            groupchatcount,
            total_message,
            total_notify_number,
          });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing each enquiry:", error);
    res.status(500).send('Internal Server Error');
  }
});




//    NOTIFICATION    


router.post('/send_timestamp_leave_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = new Date();

        const messageCount = await userHelpers.getAllNewGroupchatNotification()

        await userHelpers.updateTimeOnleaveGroupchat(Sender_Id, timestamp, messageCount).then((response) => {
          res.redirect('/');
          return;
        });
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send-timestamp-leave-chat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Reciever_Id = req.body.Reciever_ID;
        let Sender_Id = req.session.user._id;

        // Try-catch block for async operations
        try {
          const messageCount = await userHelpers.getArrayCount(Sender_Id, Reciever_Id);
          const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          const timestamp = req.body.timestamp;

          await userHelpers.updateTimeUnread(Sender_Id, Room_Id, timestamp, messageCount).then((response) => {
            res.json(response);
            
          });

          let sendmessages = await userHelpers.oneONoneCHAT(Sender_Id, Reciever_Id);
          let messages = [...sendmessages];
          if (messages.length > 0) {
            await userHelpers.ChatRoomUpdateOnProfileReturns(Sender_Id, timestamp, Reciever_Id);
            return;
          }
          
          // this function is used to mark the time inside ONE_CHAT_FIRST_CHAT_DETAILS when leaving from 
          // direct message through profile
          // our id, to whom we sended id, at what time we leaved the chat is passed
          // even though we dont send a message, but only entered in individual chat, then the id of that
          // person is marked in send_list. but dont worry, it will get erased when we leave from chatwith if we dont sended any message
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal server error' });
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send-timestamp-leave-menu', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        try {
          let Send_List = await userHelpers.chatCOUNT(Sender_Id);
          let Reciever_List = await userHelpers.getReceivedMessageSendDetails(Sender_Id);
          let Send_List_count = Send_List.length;
          let Recieve_List_count = Reciever_List.length;
          await userHelpers.ChatRoomUpdate(Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count).then((response) => {
            res.redirect('/');
            return;
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal server error' });
        }
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_admin_broadcast', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        let timeStamp = new Date();
        timeStamp = timeStamp.toISOString();
        let currentAdminBroadCastCount = await userHelpers.getAllCountOfCurrentAdminBroad()
        await userHelpers.LeaveAdminMessageOne(Sender_Id, timeStamp,currentAdminBroadCastCount);
        res.status(200).json({ success: true });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_adminchat', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Reciever_Id = req.body.Reciever_Id;
        let Sender_Id = req.session.user._id;
        const messageCount = await userHelpers.getArrayCountAdmin(Sender_Id, Reciever_Id);
        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = req.body.timestamp;

        await userHelpers.updateTimeUnreadAdmin(Sender_Id, Room_Id, timestamp, messageCount).then((response) => {
          res.json(response);
        });

        let sendmessages = await userHelpers.oneONoneCHATAdmin(Sender_Id, Reciever_Id);
        let messages = [...sendmessages];
        if (messages.length > 0) {
          await userHelpers.ChatRoomUpdateOnProfileReturnsAdmin(Sender_Id, timestamp, Reciever_Id);
        }
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_adminmenu', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        let Send_List = await userHelpers.chatCOUNTAdmin(Sender_Id);
        let Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(Sender_Id);
        let Send_List_count = Send_List.length;
        let Recieve_List_count = Reciever_List.length;
        await userHelpers.ChatRoomUpdateAdmin(Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_jobportal', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        await userHelpers.updateTimeOnleaveJobPortal(Sender_Id, timestamp).then((response) => {
          res.redirect('/');
          return;
        });

      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_internportal', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        await userHelpers.updateTimeOnleaveInternshipPortal(Sender_Id, timestamp).then((response) => {
          res.redirect('/');
          return;
        });

      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_ownposts', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        const postsData = req.body.postsData;
        const response = await userHelpers.updateTimeOnleaveOwnPosts(Sender_Id, timestamp, postsData);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_otherposts', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        const response = await userHelpers.updateTimeOnleaveOtherPosts(Sender_Id, timestamp);
        res.json(response);
        return;

      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_mentorportal', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        
        let UserMentorQuestions = await userHelpers.getSenderMentors(Sender_Id);
        await userHelpers.equalizeExistingCurrentReplyCount(UserMentorQuestions);
        await userHelpers.updateTimeOnleaveMentorshipPortal(Sender_Id, timestamp);

        res.redirect('/');
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/send_timestamp_leave_view_profileviewers', async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let Sender_Id = req.session.user._id;
        const timestamp = req.body.timestamp;
        let existing_view_count = req.body.viewDataCOUNT;
        const response = await userHelpers.updateTimeOnleaveViewProfileviewers(Sender_Id, timestamp, existing_view_count);
        res.json(response);
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/confirm_update_pass_yes', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user_id = req.session.user._id;

        await userHelpers.confirmUpdatePass(user_id);
        res.json({ success: true }); // Send success response
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});


router.get('/admin_view_detail_onechat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user_id = req.session.user._id; 
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let adminViewDataOneChat = await userHelpers.getAdminViewDataOneChat(user_id);

        let viewDATA = [];
        if (adminViewDataOneChat && adminViewDataOneChat.length > 0) {
          for (const viewer of adminViewDataOneChat) {
            const userDetails = await userHelpers.getBasicUserProfileDetails(viewer.viewId);
            if (userDetails) {
              const timestamp = new Date(viewer.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
              viewDATA.push({
                viewId: viewer.viewId,
                timestamp: timestamp,
                Name: userDetails.Name,
                Status: userDetails.Status
              });
            }
          }
  
          viewDATA.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        res.render('user/admin_view_detail_onechat', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number,
          viewDATA
        });   
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/confirm_privatechat_access_pass_yes', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user_id = req.session.user._id;    
        await userHelpers.confirmAdminPassPrivateChat(user_id);
        res.json({ success: true }); // Send success response
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

 
router.get('/confirm_privatechat_access_pass_no', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user_id = await userHelpers.getAdminID();
        user_id = user_id.toString();
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        
        res.render('user/user_denied_adminview_onechat', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number,
          user_id
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/confirm_update_pass_no', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let user_id = await userHelpers.getAdminID();
        user_id = user_id.toString();
        let uber = req.session.user.Name;
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        
        res.render('user/user_denied_changepass', {
          showHeader1: true,
          showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number,
          user_id
        });
        return;
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/clear_post_reply_notif', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let postID = req.body.pOsTiD;
        let user_ID = req.session.user._id;
        await userHelpers.clearPostReplyNotif(user_ID, postID);
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/clear_post_like_notif', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let postID = req.body.pOsTiD;
        let user_ID = req.session.user._id;
        await userHelpers.clearPostLikeNotif(user_ID, postID);
      } else {
        res.render('user/view_page_disabled');
        return;
      }
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;
