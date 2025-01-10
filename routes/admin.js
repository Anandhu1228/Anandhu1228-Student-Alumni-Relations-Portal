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
const fs = require('fs');
var path = require('path');
const xlsx = require('xlsx');
const { parse } = require('handlebars')
const adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');
const session = require('express-session');
const { log } = require('handlebars');
const { response } = require('../app');
const sharp = require('sharp');
const { Worker } = require('worker_threads');
const verifyLogin = (req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
    return;
  }else{
    res.redirect('/admin')
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


router.get('/', function(req, res) {
  try {
      res.render('admin/login_button');
      return;
  } catch (error) {
      console.error("Error in GET / route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/admin-view-page', async (req, res) => {
  try {
      if (req.session.adminLoggedIn) {
          let aber = req.session.admin.Name;
          const userId = req.session.admin._id;
          await adminHelpers.insertloggedINTime(userId);


          //  ALL NOTIFICATION CALCULATION BELOW

           let ExistingCount = await userHelpers.FetchChatRoomUpdateAdmin(userId); // ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN USED
           let Existing_Reciever_List = ExistingCount.Reciever_List;
           let Existing_Recieve_List_count = Existing_Reciever_List.length;
           let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(userId) // CHAT_BACK_AND_FORTH_BOOK_ADMIN USED
           let Current_Recieve_List_count = Current_Reciever_List.length;
 
           let New_Reciever = [];
           if (Existing_Recieve_List_count < Current_Recieve_List_count) {
               New_Reciever = Current_Reciever_List.filter(currentReceiver => !Existing_Reciever_List.includes(currentReceiver));
           } else {
               New_Reciever = [];
           } // POTENTIAL TO USE THE EXACT NEW USER IN NOTIFICATION 
           // HERE ONLY MESSAGE "SOMEONE NEW HAS MESSAGED YOU" IS USED INSTEAD OF SPECIFIC USER

           let new_Messenger = New_Reciever.length;
           let new_messenger_found = new_Messenger > 0 ? true : false;

           let fetch = await userHelpers.FetchupdateTimeUnreadAdmin(Existing_Reciever_List,userId); // TIME_UNREAD_COLLECTION_ADMIN used

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
           // POTENTIAL TO FIND NEW MESSAGE FROM EVERY EXISTING USER
           // HERE FOR "YOU HAVE GOT MESSAGES FROM EXISTING CONVERSATION" IS USED

           function sumExistingNewMessageCounts(messageCounts) {
            return messageCounts.reduce((sum, item) => sum + item.messageCount, 0);
          }
           const AllNewExistingMessageCountAdmin = await sumExistingNewMessageCounts(newMessageCount);
           let newMessagesInExisting_Found = AllNewExistingMessageCountAdmin > 0 ? true : false;

           let existing_groupchat_count = await adminHelpers.fetch_Groupchat_last_leave_count_Admin(userId);
           let current_groupchat_count = await userHelpers.getAllNewGroupchatNotification();
           let groupchatcount_admin = (current_groupchat_count - existing_groupchat_count);
           let groupchat_notif_admin = groupchatcount_admin > 0 ? true : false;

           let existing_mentor_count = await adminHelpers.fetch_MentorPortal_last_leave_count_Admin(userId);
           let current_mentor_count = await adminHelpers.get_current_MentorPortal_count_Admin();
           let mentorcount_admin = (current_mentor_count - existing_mentor_count);
           let newMentor_notif_admin = mentorcount_admin > 0 ? true : false;

           let existing_admin_Enquiry_count = await adminHelpers.GetLastEnquiryCountAdmin(userId);
           let current_admin_Enquiry_count = await adminHelpers.GetCurrentEnquiryCountAdmin();
           let new_enquiry_count_admin = (current_admin_Enquiry_count - existing_admin_Enquiry_count);
           let newEnquiry_notif_admin = new_enquiry_count_admin > 0 ? true : false;

           let existing_Job_count = await adminHelpers.fetch_JobPortal_last_leave_count_Admin(userId);
           let current_Job_count = await adminHelpers.get_current_JobPortal_count_Admin();
           let new_Job_Notif_Count = (current_Job_count - existing_Job_count);
           let new_Job_Notif = new_Job_Notif_Count > 0 ? true : false;

           let existing_Intern_count = await adminHelpers.fetch_InternPortal_last_leave_count_Admin(userId);
           let current_Intern_count = await adminHelpers.get_current_InternPortal_count_Admin();
           let new_Intern_Notif_Count = (current_Intern_count - existing_Intern_count);
           let new_Intern_Notif = new_Intern_Notif_Count > 0 ? true : false;

           await adminHelpers.storeAdminNotification(
            userId,
            new_Intern_Notif_Count,new_Intern_Notif,
            new_Job_Notif_Count,new_Job_Notif,
            new_enquiry_count_admin,newEnquiry_notif_admin,
            mentorcount_admin,newMentor_notif_admin,
            AllNewExistingMessageCountAdmin,newMessagesInExisting_Found,
            new_Messenger,new_messenger_found,New_Reciever,
            groupchatcount_admin,groupchat_notif_admin
          );
           
           let totalNotification = 
           ( new_Intern_Notif_Count + new_Job_Notif_Count +
             new_enquiry_count_admin + mentorcount_admin +
             groupchatcount_admin + AllNewExistingMessageCountAdmin + new_Messenger 
           )
           req.session.totalNotification = totalNotification;

          //    ALL NOTIFICATION CALCULATION ABOVE


          res.render('admin/admin-view-page', { showAdminHeader1: true, aber, totalNotification });
          return;
      } else {
          res.render('admin/adminlogin');
          req.session.adminLoginErr = false;
          return;
      }
  } catch (error) {
      console.error("Error in GET /admin-view-page route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/adminlogin', async (req, res) => {
  try {
      req.body.Email = req.body.Email.trim().toLowerCase();
      let response = await adminHelpers.doAdminLogin(req.body);
      if (response.status) {
          req.session.adminLoggedIn = true;
          req.session.admin = response.admin;
          res.redirect('/admin/admin-view-page');
          return;
      } else if (response.accesssfail) {
          res.render('admin/adminlogin', { admin_block: true });
          return;
      } else if (response.locked) {
          req.session.adminLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
          res.render('admin/adminlogin', { "LoginERROR": req.session.adminLoginErr });
          return;
      } else {
          req.session.adminLoginErr = "Invalid Username or Password";
          res.render('admin/adminlogin', { "LoginERROR": req.session.adminLoginErr });
          return;
      }
  } catch (error) {
      console.error("Error in POST /adminlogin route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


//   EMAIL SERVICE INTEGRATED
/*router.post('/adminlogin', async (req, res) => {
  try {

    // Check if OTP resend is requested
    if (req.body.resendOtp) {
      let otpRequests_time = await adminHelpers.getOtpRequest(req.body.senCurreSponDer);

      let otpRequests = otpRequests_time ? otpRequests_time.OtpreQuestcounT : 0;
      const lockTime = otpRequests_time ? otpRequests_time.opt_lock_time : null;

      if (otpRequests >= 3) {
        const currentTime = new Date();
        const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours

        if (lockTimeElapsed >= 1) {
          // Reset the OTP request count and lock time
          await adminHelpers.updateOtpRequest(req.body.senCurreSponDer);
        } else {
          // Too many OTP requests
          res.render('admin/templogin', { tomanyOTPAfterHour: true });
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

        await adminHelpers.setRequestOtp(req.body.senCurreSponDer)
        
        res.render('admin/otp',{send_mail: req.body.senCurreSponDer});
      });
      return; // Exit the route handler to avoid further processing
    }

    req.body.Email = req.body.Email.trim().toLowerCase();

    let otp_Requests_time = await adminHelpers.getOtpRequestTime(req.body.Email);
    let OTP_LOCK_TIME = otp_Requests_time ? otp_Requests_time.opt_lock_time: null
    let currentTime = new Date();
    let lockTimeElapsed = OTP_LOCK_TIME ? (currentTime - new Date(OTP_LOCK_TIME)) / (1000 * 60 * 60) : 0; // Difference in hours

    if (lockTimeElapsed >= 1) {
      // Reset the OTP request count and lock time
      await adminHelpers.updateOtpRequest(req.body.Email);
    }

    if (lockTimeElapsed >= 1 || OTP_LOCK_TIME == null) {

      const response = await adminHelpers.doAdminLogin(req.body);
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

          await adminHelpers.setRequestOtp(req.body.Email);

          req.session.otp = otp;
          req.session.Pm$p_AU$Ar = response.admin; // Temporarily store user data
          res.render('admin/otp',{send_mail: req.body.Email});
          return
        });

      } else if (response.accesssfail) {
          res.render('admin/adminlogin', { admin_block: true });
          return;
      } else if (response.locked) {
          req.session.adminLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
          res.render('admin/adminlogin', { "LoginERROR": req.session.adminLoginErr });
          return;
      } else {
          req.session.adminLoginErr = "Invalid Username or Password";
          res.render('admin/adminlogin', { "LoginERROR": req.session.adminLoginErr });
          return;
      }
    } else{
      let date = new Date(OTP_LOCK_TIME);
      date.setTime(date.getTime() + 3600000); // 3600000 ms = 1 hour
      let now = new Date();
      let timeDifference = date - now; // difference in milliseconds
      let minutesLeft = Math.floor(timeDifference / 60000); // convert to minutes
      res.render('admin/templogin',{tomanyOTP: true, minutesLeft})
      return
    }
  } catch (error) {
      console.error("Error in POST /adminlogin route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/verify-otp', async(req, res, next) => {
  try {
    const { otp } = req.body;
    
    if (req.session.otp === otp) {
      req.session.adminLoggedIn = true;
      req.session.admin = req.session.Pm$p_AU$Ar; // Transfer the user details
      
      delete req.session.otp;
      delete req.session.Pm$p_AU$Ar; // Clean up temp user data
      await adminHelpers.updateOtpRequest(req.session.admin.Email);
      
      res.redirect('/admin/admin-view-page');
    } else {
      res.status(400).send('Invalid OTP');
    }
  } catch (error) {
    console.error('Error during OTP verification:', error);
    next(error); // Pass the error to the next middleware (error handler)
  }
});*/


router.get('/adminlogout', async (req, res) => {
  try {
      if (req.session && req.session.admin) {
          let adminId = req.session.admin._id;
          req.session.destroy(async (err) => {
              if (err) {
                  console.log(err);
                  res.status(500).send("An error occurred while logging out.");
              } else {
                  try {
                      await adminHelpers.insertloggedOUTTime(adminId);
                      res.redirect('/admin');
                      return;
                  } catch (innerError) {
                      console.error("Error inserting logout time:", innerError);
                      res.status(500).send("An error occurred while logging out.");
                  }
              }
          });
      } else {
          res.redirect('/admin');
          return;
      }
  } catch (error) {
      console.error("Error in GET /adminlogout route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/admin-view-profile', verifyLogin, async (req, res) => {
  try {
    let view = req.body.profileId;
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
     
      const profile = await adminHelpers.getProfileForViewProfile(view);

      res.render('admin/admin-view-profile', {
        showAdminHeader1: true,
        aber,
        profile,
        totalNotification
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /admin-view-profile/:id route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search_alumni_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_Alumni_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search_alumni_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search-alumni_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      Name = req.body.searchName;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminAlumniNameThroughSearch(Name);
      res.render('admin/search_Alumni_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in POST /search-alumni_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/alumni-advance-search_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/alumni-advance-search_admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /alumni-advance-search_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search-alumni-by-passoutyear_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_AlumniPassout_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search-alumni-by-passoutyear_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search-alumni-by-passoutyear_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let passout = req.body.searchPassout;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminAlumniPassoutThroughSearch(passout);
      res.render('admin/search_AlumniPassout_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in POST /search-alumni-by-passoutyear_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search-alumni-by-location_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_AlumniLocation_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search-alumni-by-location_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search-alumni-by-location_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let location = req.body.searchLocation;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminAlumni1Location2Through28Search(location);
      res.render('admin/search_AlumniLocation_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in POST /search-alumni-by-location_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search-alumni-by-domain_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_AlumniDomain_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search-alumni-by-domain_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search-alumni-by-domain_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let domain = req.body.searchDomain;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminAlumniDomainThroughSearch(domain);
      res.render('admin/search_AlumniDomain_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in POST /search-alumni-by-domain_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search_student_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_Student_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search_student_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search-student_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminStudentNameThroughSearch(Name);
      res.render('admin/search_Student_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in POST /search-student_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/student-advance-search_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/student-advance-search_admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /student-advance-search_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search-student-by-admissionyear_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_StudentAdmission_Year_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err); // Passes the error to the next error-handling middleware
  }
});


router.post('/search-student-by-admissionyear_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      admission_year = req.body.searchAdmission;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminStudentAdmissionYearThroughSearch(admission_year);
      res.render('admin/search_StudentAdmission_Year_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/search-student-by-location_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_StudentLocation_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/search-student-by-location_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      location = req.body.searchLocation;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminStudentLocationThroughSearch(location);
      res.render('admin/search_StudentLocation_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/search-student-by-domain_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_StudentDomain_Admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/search-student-by-domain_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      domain = req.body.searchDomain;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminStudentDomainThroughSearch(domain);
      res.render('admin/search_StudentDomain_Admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


//           REFINED
//        SECURITY CHECK
router.get('/search-alumni-by-filter_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search-alumni-by-filter_admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/search-alumni-by-filter_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      filter = req.body;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminAlumniFilteredThroughSearch(filter);
      res.render('admin/search-alumni-by-filter_admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/search-student-by-filter_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search-student-by-filter_admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/search-student-by-filter_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      filter = req.body;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetStudentAdminFilteredThroughSearch(filter);
      res.render('admin/search-student-by-filter_admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/search_removal_candidate', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_removal_candidate', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/search_removal_candidate', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let Name = req.body.searchName;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAdminCandidateThroughSearch(Name);
      res.render('admin/search_removal_candidate', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/delete_candidate_by_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let admin_id = req.session.admin._id;
      await adminHelpers.deleteCandidateByAdmin(req.body.ProfileID).then((response) => {
        res.json(response);
        if (response.deleteCandidate) {
          const userImagesDir = path.resolve(__dirname, '../public/user-images');
          const userImagePath = path.join(userImagesDir, req.body.ProfileID); // Construct the image path
          
          // Check for image files with different extensions
          const extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', 
            '.ico', '.heif', '.raw', '.jfif', '.avif', '.exif'
          ];
          
          for (const ext of extensions) {
            const filePath = userImagePath + ext;
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath); // Delete the image
              break; // Exit the loop once the image is found and deleted
            }
          }
        }
      });
      await adminHelpers.insertRemovedCandidateByAdminLogs(req.body.ProfileID, req.body.ProfileNAME, req.body.ProfileSTATUS, admin_id);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/search_company_owned_alumni', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAlumniOwnedCompany();
      res.render('admin/search_company_owned_alumni', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/search_working_alumni_in_company', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_working_alumni_in_company', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/search_working_alumni_in_company', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let companyName = req.body.companyName;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAlumniSearchWorkingCompany(companyName);
      res.render('admin/search_working_alumni_in_company', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/get_all_working_alumni', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAlumniWorkingCompany();
      res.render('admin/get_all_working_alumni', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/admin_other_functionalities', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/admin_other_functionalities', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/edit_status_user', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/edit_status_user', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/edit_status_user', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let Name = req.body.searchName;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/edit_status_user', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/edit_status_user_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let userID = req.body.profileId;
      let totalNotification = req.session.totalNotification;
      const profile = await adminHelpers.getProfilefORsTATUS12_28(userID);
      res.render('admin/edit_status_user_admin', { showAdminHeader1: true, aber, profile, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.post('/edit_status_userAdmin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userID = req.body.profileID;
      let admin_id = req.session.admin._id;
      let Status = req.body.Status;
      let Name = req.body.Name;
      await adminHelpers.changeUserStatus(userID, Status);
      await adminHelpers.changeUserStatusByAdmin(userID, Name, Status, admin_id);
      res.redirect('/admin/edit_status_user');
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/edit_status_userall_admin', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      await adminHelpers.changeAllUserStatus();
      res.redirect('/admin/edit_status_user');
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});


router.get('/view_deleted_group_chat_messages',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
        let admin_id = req.session.admin._id;
        const skip = 0;
        const limit = 10;
        let messages = await adminHelpers.getAllDeletedGroupMessageAdmin(skip, limit);
        messages.reverse();
        
        res.render('admin/view_deleted_group_chat_messages', { 
          showAdminHeader1: true, 
            aber, limit,
            messages, 
            totalNotification
        });

        await adminHelpers.AdminViewDeletedGroupChat(admin_id);
        return;
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
  }else {
    res.redirect('/admin');
    return;
  }
})


router.post('/get_remaining_deleted_group_chat_messages',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try {
      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);
      let messages = await adminHelpers.getAllDeletedGroupMessageAdmin(skip, limit);
      //messages.reverse();
      
      res.json({ success: true, messages });

      return;
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
  }else {
    res.redirect('/admin');
    return;
  }
})


router.get('/send_delete_group_chat_messages_admin', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    try {
      let aber = req.session.admin.Name;
      let userId = req.session.admin._id;
      let current_message_count  = await userHelpers.getAllNewGroupchatNotification();
      let existing_message_count  = await adminHelpers.getExistingGroupChatCountAdmin(userId);
      const skip = 0;
      const difference = current_message_count - existing_message_count;
      const limit = difference > 100 ? 100 : Math.max(50, difference);
      let totalNotification = req.session.totalNotification;
      let messages = await adminHelpers.getAllMessageAdmin(skip, limit);

      if (difference > 0 && difference <= messages.length) {
        messages[difference - 1].last_notification = true;
      }

      messages.reverse();
      let pinned_message = await userHelpers.GetPinnedMessage();
      let polldata = await adminHelpers.getPollInformation();  

      res.render('admin/send_delete_group_chat_messages_admin', { 
        showAdminHeader1: true, 
        userId, 
        aber, 
        messages, 
        pinned_message,
        totalNotification,
        limit,
        polldata
      });
      
      return;
       
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/get_remaining_groupchatmessages', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    try {
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let messages = await adminHelpers.getAllMessageAdmin(skip, limit);
        res.json({ success: true, messages }); 

        return;
       
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/get_message_by_id_text', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
        let messageId = req.body.MeSsAgEiD;
        let message = await userHelpers.getMessageByIdText(messageId, req.session.admin._id);
        res.json({ message });
        return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let user_id = req.session.admin._id;
      let message = await userHelpers.getMessageById(messageId, user_id);
      res.json({ message });
        return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/add_reaction_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let emoji = req.body.EmOjIcOnTeNt;
      let user_id = req.session.admin._id;
      let user_Name = req.session.admin.Name;
      await userHelpers.addRemoveReaction(messageId, emoji, user_id, user_Name).then((response) => {
        res.json(response);
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id_emoji', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let message = await userHelpers.getMessageByIdEmoji(messageId);
      res.json({ message });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/add_pin_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let response = await userHelpers.addPin(messageId);
      res.json(response);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/remove_pin_groupchat', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let response = await userHelpers.removePin(messageId);
      res.json(response);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/send-message_admin', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    let name = req.session.admin.Name;
    let actualMessageId = null;
    let MessageId = null;
    let status = "textmessage"
    let actualMessageUsername = null;
    let actualMessageContent = null;
    let userId = req.session.admin._id;
    let SENDBY = null;
    try {
      let messageContent = req.body.messageContent;
      actualMessageId = req.body.actualMessageId;
      MessageId = req.body.MessageId;
      actualMessageContent = req.body.actualMessageContent;
      actualMessageUsername = req.body.actualMessageUsername;
      SENDBY = req.body.SENDBY;
      const timestamp = new Date();
      const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      
      if(req.session.admin.GroupMessageInitiation == null ){
        let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
        req.session.admin.GroupMessageInitiation = GroupMessageInitiation;
        if(req.session.admin.GroupMessageInitiation == null ){
          //  LOGIC TO SEND FIRST MAIL
          req.session.admin.GroupMessageInitiation = new Date()
        }
      } else if(req.session.admin.GroupMessageInitiation != null){
        if((isDifferentDay(req.session.admin.GroupMessageInitiation)) == true){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.admin.GroupMessageInitiation = GroupMessageInitiation;
        }
      }
      
      const response = await adminHelpers.handleGroupChatMessageAdmin(MessageId,userId,name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY, formattedTimestamp);
      res.json(response);

      if (response.addedGroupMessage){
        if(req.session.admin.GroupMessageInitiation != null){
          const isNewDay = isDifferentDay(req.session.admin.GroupMessageInitiation);
          if (isNewDay) {
            // SEND MAIL HERE
            console.log("MAIL SEND TO ALL")
            req.session.admin.GroupMessageInitiation = new Date()
          }
        }
      }

      return;
  } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }else {
    res.redirect('/admin');
    return;
  }
});


//    EMAIL INTEGRATED
/*router.post('/send-message_admin', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    let name = req.session.admin.Name;
    let actualMessageId = null;
    let MessageId = null;
    let status = "textmessage"
    let actualMessageUsername = null;
    let actualMessageContent = null;
    let userId = req.session.admin._id;
    let SENDBY = null;
    try {
        let messageContent = req.body.messageContent;
        actualMessageId = req.body.actualMessageId;
        MessageId = req.body.MessageId;
        actualMessageContent = req.body.actualMessageContent;
        actualMessageUsername = req.body.actualMessageUsername;
        SENDBY = req.body.SENDBY;
        const timestamp = new Date();
        const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        
        if(req.session.admin.GroupMessageInitiation == null ){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.admin.GroupMessageInitiation = GroupMessageInitiation;
          if(req.session.admin.GroupMessageInitiation == null ){

            // Get all emails
            let mailsall = await userHelpers.getallMail();
            const myMail = req.session.admin.Email;

            // Prepare the content for the emails
            const jobContent =
              `<p>Admin initiated the groupchat. Join the now.</p>
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

            req.session.admin.GroupMessageInitiation = new Date()
          }
        } else if(req.session.admin.GroupMessageInitiation != null){
          if((isDifferentDay(req.session.admin.GroupMessageInitiation)) == true){
            let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
            req.session.admin.GroupMessageInitiation = GroupMessageInitiation;
          }
        }
        
        const response = await adminHelpers.handleGroupChatMessageAdmin(MessageId,userId,name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY, formattedTimestamp);
        res.json(response);

        if (response.addedGroupMessage){
          if(req.session.admin.GroupMessageInitiation != null){
            const isNewDay = isDifferentDay(req.session.admin.GroupMessageInitiation);
            if (isNewDay) {
              // Get all emails
              let mailsall = await userHelpers.getallMail();
              const myMail = req.session.admin.Email;

              // Prepare the content for the emails
              const jobContent =
                `<p>Admin initiated the groupchat. Join the now.</p>
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

              req.session.admin.GroupMessageInitiation = new Date()
            }
          }
        }

        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }else {
    res.redirect('/admin');
    return;
  }
});*/


router.post('/delete-message-from-groupchat_admin', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      await adminHelpers.deleteMessageAdmin(req.body.MessagE).then((response) => {
        res.json(response);
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err); // Passes the error to the next error-handling middleware
  }
});


router.post('/add-post-togroup_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const postData = { ...req.body };
      let messageContent = postData.messageContent;
      messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
      postData.messageContent = messageContent;
      const timestamp = new Date();
      const status = "multimedia";
      const User_Id = req.session.admin._id;
      const Name = req.session.admin.Name;
      const MessageId = req.body.MessageId;
      const imageFileNames = [];
      const videoFileNames = [];
      const baseFolderPath = `./public/group-media/${User_Id}/${MessageId}/`;
      
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      await adminHelpers.addPostGroupAdmin(postData, timestamp, status, User_Id, Name, formattedTimestamp);
      
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

      await adminHelpers.addPostGroupImagesAdmin(MessageId, imageFileNames);
      await adminHelpers.addPostGroupVideosAdmin(MessageId, videoFileNames);
      
      res.json({ addedGroupPostMessage: true });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add_poll_togroup', async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      if ((req.body.caption !== null && req.body.caption !== "") && req.body.option1) {
        await userHelpers.initializePOLLInGroup(req.body, req.session.admin._id, req.session.admin.Name);
      }

      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// EMAIL INTEGRATED
/*router.post('/add_poll_togroup', async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      if ((req.body.caption !== null && req.body.caption !== "") && req.body.option1) {
        await userHelpers.initializePOLLInGroup(req.body, req.session.admin._id, req.session.admin.Name);
      }

      let mailsall = await userHelpers.getallMail();
      const myMail = req.session.user.Email;

      // Prepare the content for the emails
      const jobContent =
      `<p>A poll posted in groupchat by ${req.session.admin.Name}. React to it.</p>
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
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});*/


router.post('/delete_poll', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      if(req.session.admin._id == req.body.UsErId)
      {
        let response = await userHelpers.deletePoll()
        res.json(response)
        return;
      } else{
        res.render("user/unauthorized_attempt")
        return
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_all_pollresult', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let response = await userHelpers.getAllPollResult();
      res.json({success:true,response});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


//    EMAIL INTEGRATED
/*router.post('/add-post-togroup_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const postData = { ...req.body };
      let messageContent = postData.messageContent;
      messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
      postData.messageContent = messageContent;
      const timestamp = new Date();
      const status = "multimedia";
      const User_Id = req.session.admin._id;
      const Name = req.session.admin.Name;
      const MessageId = req.body.MessageId;
      const imageFileNames = [];
      const videoFileNames = [];
      const baseFolderPath = `./public/group-media/${User_Id}/${MessageId}/`;
      
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      
      if(req.session.admin.GroupMessageInitiation == null ){
        let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
        req.session.admin.GroupMessageInitiation = GroupMessageInitiation;
        if(req.session.admin.GroupMessageInitiation == null ){

          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.admin.Email;

          // Prepare the content for the emails
          const jobContent =
            `<p>Admin initiated the groupchat. Join the now.</p>
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

          req.session.admin.GroupMessageInitiation = new Date()
        }
      } else if(req.session.admin.GroupMessageInitiation != null){
        if((isDifferentDay(req.session.admin.GroupMessageInitiation)) == true){
          let GroupMessageInitiation = await userHelpers.FetchGroupMessageInitiationTime()
          req.session.admin.GroupMessageInitiation = GroupMessageInitiation;
        }
      }
      
      await adminHelpers.addPostGroupAdmin(postData, timestamp, status, User_Id, Name, formattedTimestamp);
      
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

      await adminHelpers.addPostGroupImagesAdmin(MessageId, imageFileNames);
      await adminHelpers.addPostGroupVideosAdmin(MessageId, videoFileNames);
      res.json({ addedGroupPostMessage: true });

      if(req.session.admin.GroupMessageInitiation != null){
        const isNewDay = isDifferentDay(req.session.admin.GroupMessageInitiation);
        if (isNewDay) {

          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.admin.Email;

          // Prepare the content for the emails
          const jobContent =
            `<p>Admin initiated the groupchat. Join the now.</p>
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
          req.session.admin.GroupMessageInitiation = new Date()
        }
      }

      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.get('/view_deleted_one_one_chat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/view_search_deleted_one_first_candidate', {
        showAdminHeader1: true,
        aber,
        showsearch: true,
        totalNotification
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_search_deleted_one_first_candidate', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/view_search_deleted_one_first_candidate', {
        showAdminHeader1: true,
        aber,
        usersAll,
        totalNotification
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_search_deleted_one_first-candidate', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let sender = req.body.profileId;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let sender_detail = await adminHelpers.getBasicProfile(sender);
      res.render('admin/view_search_deleted_one_second_candidate', {
        showAdminHeader1: true,
        aber,
        sender_detail,
        has_sender: true,
        showsearch: true,
        totalNotification
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_search_deleted_one_second_candidate', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let sender_id = req.body.sender_id;
      let totalNotification = req.session.totalNotification;
      let sender_detail = await adminHelpers.getBasicProfile(sender_id);
      let Name = req.body.searchName;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/view_search_deleted_one_second_candidate', {
        showAdminHeader1: true,
        aber,
        usersAll,
        sender_detail,
        has_sender: true,
        totalNotification
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_deleted_one_one_chat', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let admin_id = req.session.admin._id;
      let sender_id = req.body.sender_id;
      let totalNotification = req.session.totalNotification;
      let reciever_id = req.body.reciever_id;
      let sender_conscent = await adminHelpers.fetchUserConcentOnDeletedOneChatView(sender_id);
      let reciever_conscent = await adminHelpers.fetchUserConcentOnDeletedOneChatView(reciever_id);

      if (sender_conscent.viewEnabledForAdmin === true || reciever_conscent.viewEnabledForAdmin === true) {
        await userHelpers.addAdminViewDelMesStat(sender_id, reciever_id);
        await userHelpers.addAdminViewDelMesStat(reciever_id, sender_id);
        let del_one_mess = await adminHelpers.getOneDelMess(sender_id, reciever_id);

        del_one_mess.sort((a, b) => a.timestamp - b.timestamp);

        let sender = await adminHelpers.getBasicProfile(sender_id);
        let reciever = await adminHelpers.getBasicProfile(reciever_id);

        await adminHelpers.OneonONEchatViewedLogByAdmin(sender_id, sender.Name, reciever_id, reciever.Name, admin_id);

        res.render('admin/view_deleted_one_one_chat', {
          showAdminHeader1: true,
          aber,
          del_one_mess,
          sender,
          reciever,
          totalNotification
        });
        return;
      } else {
        res.render('admin/view_access_denied_user', {
          showAdminHeader1: true,
          aber,
          totalNotification
        });
        return;
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/add_job_to_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/add_job_to_portal', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add_job_to_portal', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const userData = { 
        ...req.body, 
        UserId: req.session.admin._id, 
        Name: req.session.admin.Name, 
        Branch: "",
        PostedBy: "admin"
      };

      const insertedJobId = await adminHelpers.addJob_by_admin(userData);
      let image = req.files ? req.files.JobImage : null;

      if (image) {
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
            res.redirect('/admin/admin_other_functionalities');
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
        // If no image, immediately redirect
        res.redirect('/admin/admin_other_functionalities');
        return
      }
    } else {
      res.redirect('/admin');
      return
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//    MAIL INTEGRATED CODE
/*router.post('/add_job_to_portal', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const userData = { 
        ...req.body, 
        UserId: req.session.admin._id, 
        Name: req.session.admin.Name, 
        Branch: "",
        PostedBy: "admin"
      };

      const insertedJobId = await adminHelpers.addJob_by_admin(userData);

      // Get all emails
      let mailsall = await userHelpers.getallMail();
      const myMail = req.session.admin.Email;

      let image = req.files ? req.files.JobImage : null;
      if (image) {
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
            res.redirect('/admin/admin_other_functionalities');

              // Prepare the content for the emails
              const jobContent = req.body.JobLink ? 
              `<p>A new job was added by admin:</p>
              <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
              <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
              <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
              <p><strong>Posted by:</strong> ${req.session.admin.Name}</p>
              <p><strong>Apply:</strong> <a href="${req.body.JobLink}">${req.body.JobLink}</a></p>
              <p>Visit the alumni relations cell website to reply or view more.</p>` :
              `<p>A new job was added:</p>
              <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
              <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
              <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
              <p><strong>Posted by:</strong> ${req.session.admin.Name}</p>
              <p>Visit the alumni relations cell website to reply or view more.</p>`;

            // Send email to all users except `myMail`
            for (const email of mailsall) {
              if (email !== myMail) {
                const mailOptions = {
                  from: 'anandhueducateanddevelop@gmail.com',
                  to: email,
                  subject: 'New Job Added By Admin',
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
        // If no image, immediately redirect
        res.redirect('/admin/admin_other_functionalities');

          // Prepare the content for the emails
          const jobContent = req.body.JobLink ? 
          `<p>A new job was added by admin:</p>
          <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
          <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
          <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
          <p><strong>Posted by:</strong> ${req.session.admin.Name}</p>
          <p><strong>Apply:</strong> <a href="${req.body.JobLink}">${req.body.JobLink}</a></p>
          <p>Visit the alumni relations cell website to reply or view more.</p>` :
          `<p>A new job was added:</p>
          <p><strong>Company Name:</strong> ${req.body.CompanyName}</p>
          <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
          <p><strong>Eligibility:</strong> ${req.body.Eligibility}</p>
          <p><strong>Posted by:</strong> ${req.session.admin.Name}</p>
          <p>Visit the alumni relations cell website to reply or view more.</p>`;

        // Send email to all users except `myMail`
        for (const email of mailsall) {
          if (email !== myMail) {
            const mailOptions = {
              from: 'anandhueducateanddevelop@gmail.com',
              to: email,
              subject: 'New Job Added By Admin',
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

        return
      }
    } else {
      res.redirect('/admin');
      return
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


//   WITHOUT SKIP AND LIMIT
/*router.get('/view_edit_delete_admin_posted_jobs', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let admin_id = req.session.admin._id;
      let totalNotification = req.session.totalNotification;
      let jobs = await adminHelpers.getEditAdminJobDetails(admin_id);
      res.render('admin/view_edit_delete_admin_posted_jobs', { showAdminHeader1: true, aber, jobs, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


//   WITH SKIP AND LIMIT
router.get('/view_edit_delete_admin_posted_jobs', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let admin_id = req.session.admin._id;
      let totalNotification = req.session.totalNotification;

      const skip = 0;
      const limit = 10;
      let jobs = await adminHelpers.getEditAdminJobDetails(admin_id,skip, limit);

      res.render('admin/view_edit_delete_admin_posted_jobs', 
        { 
          showAdminHeader1: true, 
          aber, jobs, 
          totalNotification, 
          limit
        });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/load_more_admin_posted_jobs', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      let admin_id = req.session.admin._id;

      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);

      let jobs = await adminHelpers.getEditAdminJobDetails(admin_id,skip, limit);

      res.json({ success: true, jobs });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/edit_admin_job', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let job = await adminHelpers.getIndividualAdminJobDetail(req.body.jobID);
      res.render('admin/edit_admin_job', { job });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_admin_job_requests', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let jobOwnerId = await userHelpers.getJobOwnerFromJob(req.body.jobID) // ONLY USERID PASSED
      if(req.session.admin._id == jobOwnerId){
        let score = await adminHelpers.putJobRecomendationScoreAdmin(req.body.jobID);
        let user = await adminHelpers.getuserDetailsForrequestAdmin(score);
        res.render('admin/view_admin_job_requests', { user, showAdminHeader1: true, aber, totalNotification});
        return;
      }else if(req.session.admin._id != jobOwnerId){
        res.render('user/unauthorized_attempt')
        return
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/edit_admin-job', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let response = await adminHelpers.updateJobAdmin(req.body, req.session.admin._id);
        res.redirect('/admin/view_edit_delete_admin_posted_jobs');
        if(response.editedJob){
          let image = req.files ? req.files.JobImage : null;
          if (image) {
            const outputPath = './public/job-images/' + req.body.jobID + '.jpg';
            const worker = new Worker(path.resolve(__dirname, '../config/imageProcessor.js'), {
              workerData: {
                imageBuffer: image.data,
                outputPath: outputPath
              }
            });

            worker.on('message', async (message) => {
              if (message.status === 'success') {
                await userHelpers.AddJobHasImage(req.body.jobID);
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
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_admin_job_form_portal', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      await adminHelpers.deleteAdminJob(req.body.JoB, req.session.admin._id).then((response) => {
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
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_job_form_portal_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      await adminHelpers.deleteJobAdmin(req.body.JoB).then((response) => {
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
      });
      await adminHelpers.AddJobDeleteLogByAdmin(req.body.JoB, req.body.ProfilEID, req.body.ProfileENAME, req.session.admin._id);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//   WITHOUT SKIP AND LIMIT
/*router.get('/delete_job_from_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let jobs = await adminHelpers.getJobDetailsAdmin();
      res.render('admin/delete_job_from_portal', { showAdminHeader1: true, aber, jobs, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


//   WITH SKIP AND LIMIT
router.get('/delete_job_from_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;

      const skip = 0;
      const limit = 10;

      let jobs = await adminHelpers.getJobDetailsAdmin(skip,limit);
      res.render('admin/delete_job_from_portal', 
        { 
          showAdminHeader1: true, 
          aber, jobs, limit,
          totalNotification
        });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/load_more_jobs', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);

      let jobs = await adminHelpers.getJobDetailsAdmin(skip, limit);

      res.json({ success: true, jobs });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


//   WITHOUT SKIP AND LIMIT
/*router.get('/delete_internship_from_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let interns = await adminHelpers.getInternDetailsAdmin();
      res.render('admin/delete_internship_from_portal', { showAdminHeader1: true, aber, interns, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


//   WITH SKIP AND LIMIT
router.get('/delete_internship_from_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;

      const skip = 0;
      const limit = 10;
      let interns = await adminHelpers.getInternDetailsAdmin(skip, limit);
      
      res.render('admin/delete_internship_from_portal', 
        {
         showAdminHeader1: true, 
         aber, interns, limit,
         totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/load_more_interns', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);

      let interns = await adminHelpers.getInternDetailsAdmin(skip, limit);

      res.json({ success: true, interns });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/internship_details', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let indintern = await adminHelpers.getIndividualInternshipDetailsAdmin(req.body.internID);
      res.render('admin/internship_details', { showAdminHeader1: true, aber, indintern, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_admin_intern_form_portal', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      await adminHelpers.deleteInternshipAdmin(req.body.InterN).then((response) => {
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
      });
      await adminHelpers.AddInternDeleteLogByAdmin(req.body.InterN, req.body.ProfilEID, req.body.ProfilENAME, req.session.admin._id);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/delete_mentorship_entry_from_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      const skip = 0;
      const limit = 20
      const userId = req.session.admin._id;
      let totalNotification = req.session.totalNotification;
      let mentors = await adminHelpers.getMentorDetailsAdmin(skip, limit);
      mentors.reverse();
      
      res.render('admin/delete_mentorship_entry_from_portal', { 
        showAdminHeader1: true, 
        aber, mentors, 
        userId, totalNotification,
        limit
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_mentors', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
        let { skip, limit } = req.body;
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
        let mentors = await adminHelpers.getMentorDetailsAdmin(skip, limit);
        
        res.json({ success: true, mentors });

        return;
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error('Error rendering mentorship portal:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/search_mentor_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let aber = req.session.admin.Name;
      let mentorkeyword = req.body;
      let totalNotification = req.session.totalNotification;
      let mentors = await adminHelpers.searchMentorAdmin(mentorkeyword);
      res.render('admin/specific_mentor_portal', { 
        showAdminHeader1: true, 
        aber, mentors, 
        totalNotification,
        userId
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_mentor_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const response = await adminHelpers.deleteMentorAdmin(req.body.MentoR);
      res.json(response);
      await adminHelpers.AddMentorQuestionDeleteLogByAdmin(req.body.MentoR, req.body.QUESTIONINPUT, req.body.ProfileENAME, req.body.ProfileID, req.session.admin._id);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_mentor_reply_admin', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let admin_id = req.session.admin._id;
      const response = await adminHelpers.deleteMentorReplyAdmin(req.body.MentorreplY, req.body.QuestioN);
      res.json(response);
      await adminHelpers.AddMentorReplyDeleteLogByAdmin(req.body.MentorreplY, req.body.REPLYINPUT, req.body.QuestioN, req.body.ProfileENAME, req.body.ProfileID, admin_id);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add-question', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let userName = req.session.admin.Name;
      let status = "question";
      let questionInput = req.body.questionInput;
      let userdata = {
        userName: userName,
        userId: userId,
        Status: status,
        questionInput: questionInput,
      };
      await userHelpers.addQuestionMentorship(userdata).then(async (insertedQuestionId) => {
        insertedQuestionId = insertedQuestionId.toString();
        await userHelpers.addQuestionEntry(userId, insertedQuestionId);
        res.json({addedMentorQuestion : true, insertedQuestionId});
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error adding question:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


//  EMAIL INTEGRATED
/*router.post('/add-question', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let userName = req.session.admin.Name;
      let status = "question";
      let questionInput = req.body.questionInput;
      let userdata = {
        userName: userName,
        userId: userId,
        Status: status,
        questionInput: questionInput,
      };
      await userHelpers.addQuestionMentorship(userdata).then(async (insertedQuestionId) => {
        insertedQuestionId = insertedQuestionId.toString();
        await userHelpers.addQuestionEntry(userId, insertedQuestionId);

          // Prepare the content for the emails
          const questionContent = `A new question was added by admin: \n\n${questionInput}\n\nVisit the alumni relations cell website to reply or view more.`;
          
          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.admin.Email;

          // Send email to all users except `myMail`
          for (const email of mailsall) {
            if (email !== myMail) {
              const mailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: email,
                subject: 'New Question Added By Admin',
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

        res.json({addedMentorQuestion : true, insertedQuestionId});
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error adding question:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});*/


router.post('/add-reply', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let userName = req.session.admin.Name;
      let questionId = req.body.questionId;
      let questionInput = req.body.questionInput
      let status = "reply";
      let userDataWithBody = {
        questionId : questionId,
        userName: userName,
        userId: userId,
        Status: status,
        questionInput: questionInput,
      };
      await userHelpers.addReply(userDataWithBody).then(async (insertedReplyId) => {
        insertedReplyId = insertedReplyId.toString();
        await userHelpers.incrementReplyCount(questionId);
        res.json({addedMentorReply: true, insertedReplyId})
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


//   EMAIL INTEGRATION 
/*router.post('/add-reply', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let userName = req.session.admin.Name;
      let questionId = req.body.questionId;
      let questionInput = req.body.questionInput
      let status = "reply";
      let userDataWithBody = {
        questionId : questionId,
        userName: userName,
        userId: userId,
        Status: status,
        questionInput: questionInput,
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
          text: `You got a reply from admin for the mentor question you posted.\n\nReply : \n${questionInput}\n\nQuestion : \n${user_mail_input.questionInput}\n\nVisit alumni relations cell for more information.`
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
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});*/


router.post('/edit-question', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let questiontext = req.body.questionInput;
      let questionId = req.body.questionId;
      const response = await adminHelpers.editQuestion(questiontext, questionId, req.session.admin._id);
      res.json(response)
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error editing question:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/add-reply-ofreply', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let userName = req.session.admin.Name;
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
        questionInput: questionInput,
      };
      await userHelpers.addReply(userDataWithBody).then(async (insertedReplyReplyId) => {
        await userHelpers.incrementReplyCount(questionId);
        insertedReplyReplyId = insertedReplyReplyId.toString();
        res.json({addedMentorReplyReply: true, insertedReplyReplyId})
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error adding reply of reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


//  MAIL SERVICE INTEGRATED
/*router.post('/add-reply-ofreply', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let userId = req.session.admin._id;
      let userName = req.session.admin.Name;
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
        questionInput: questionInput,
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
          text: `You got a reply from admin for the mentor reply you posted.\n\nReply : \n${questionInput}\n\nYour reply : \n${user_mail_input.questionInput}\n\nVisit alumni relations cell for more information.`
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
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error adding reply of reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});*/


router.post('/edit-reply', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let replyId = req.body.replyId;
      let replyInput = req.body.replyInput;
      let questionId = req.body.questionId;
      const response = await adminHelpers.editReply(replyInput, questionId, replyId, req.session.admin._id);
      res.json(response);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error editing reply:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/add_reaction_mentorship', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let mentorId = req.body.MeNtOrId;
      let emoji = req.body.EmOjIcOnTeNt;
      let user_id = req.session.admin._id;
      let user_Name = req.session.admin.Name;
      await userHelpers.addRemoveMentorReaction(mentorId, emoji, user_id, user_Name).then((response) => {
        res.json(response);
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/get_mentor_by_id_emoji', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let mentorId = req.body.MeNtOrId;
      let mentor = await userHelpers.getMentorByIdEmoji(mentorId);
      res.json({ mentor });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_mentor_by_id_text', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let mentorID = req.body.MeNtOrId;
      let mentor = await adminHelpers.getMentorByIdText(mentorID, req.session.admin._id);
      res.json({ mentor });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/add_reaction_reply_mentorship', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let mentorId = req.body.MeNtOrId;
      let emoji = req.body.EmOjIcOnTeNt;
      let replyId = req.body.RePlYiD;
      let user_id = req.session.admin._id;
      let user_Name = req.session.admin.Name;
      await userHelpers.addRemoveMentorReplyReaction(replyId, mentorId, emoji, user_id, user_Name).then((response) => {
        res.json(response);
        return;
      });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


router.post('/get_mentor_reply_by_id_emoji', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let mentorId = req.body.MeNtOrId;
      let replyId = req.body.RePlYiD;
      let mentorReply = await userHelpers.getMentorReplyByIdEmoji(replyId, mentorId);
      res.json({ mentorReply });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_mentor_reply_by_id_text', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let mentorID = req.body.MeNtOrId;
      let replyID = req.body.RePlYiD;
      let mentorReply = await adminHelpers.getMentorReplyByIdText(mentorID, replyID, req.session.admin._id);
      res.json({ mentorReply });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get('/add_user_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      res.render('admin/add_user_admin');
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/add_user_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      if(req.body.Password == req.body.Cpass){

        req.body.Name = req.body.Name.trim();
        req.body.Email = req.body.Email.trim().toLowerCase();
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
            let admin_id = req.session.admin._id;
            let inserted_id = await adminHelpers.doAddUser(req.body);
            inserted_id = inserted_id.toString();
            let Name = req.body.Name;
            let Status = req.body.Status;
            let time_joined = new Date();
            const userData = { inserted_id, Name, Status, time_joined, DOB: dobInputSerial};
            await userHelpers.insertNameIdStatus(userData);

             // COPY user.png AND RENAME IT TO insertedId.jpg
            const srcPath = path.join(__dirname, '../public/user-images/user.png');
            const destPath = path.join(__dirname, `../public/user-images/${inserted_id}.jpg`);

            fs.copyFile(srcPath, destPath, (err) => {
              if (err) {
                console.error('Error copying file:', err);
                return next(err); // Passes the error to the next middleware (error handler)
              }
              console.log('user.png was copied to ' + destPath);
            });

            res.redirect('/admin/admin_other_functionalities');
            await adminHelpers.ViewAddUserByAdmin(Name, Status, inserted_id, admin_id);
            return;
          } else {
            res.render('admin/add_user_admin', { alreadyPresent: true });
            return
          }
        } else {
          res.render('admin/add_user_admin', { DOBNotConfirm: true });
          return
        }
      } else {
        res.render('admin/add_user_admin', { PassConfirmpassNotSame: true });
        return
      }
    }
    else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/edit_profile_user_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/edit_profile_user_admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/edit_profile_get_user_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/edit_profile_user_admin', { showAdminHeader1: true, aber, usersAll, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/admin_user_edit_profile', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      const user = await adminHelpers.getEditProfileDetails(req.body.profileId);
      res.render('admin/admin_user_edit_profile', { showAdminHeader1: true, aber, user, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/admin_user_edit-profile', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let admin_id = req.session.admin._id;

      req.body.Name = req.body.Name.trim();
      req.body.Email = req.body.Email.trim().toLowerCase();;
      req.body.Contact = req.body.Contact.trim();

      await adminHelpers.updateProfileUserAdmin(req.body);

      if (req.files && req.files.Image) {
        let image = req.files.Image;
        const imageFileName = req.body.profileID + '.jpg';
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

      await adminHelpers.AddEditProfileByAdminLog(req.body.profileID, req.body.Name, admin_id);
      res.redirect('/admin/edit_profile_user_admin');
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/update_user_profile_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      const user = await adminHelpers.getUpdateProfileDetails(req.body.profileId);
      res.render('admin/admin_user_update_profile', { showAdminHeader1: true, aber, user, empstatus: user.employmentStatus, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/admin_user_update_profile', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let admin_id = req.session.admin._id;
      let view = req.body.profileID;

      req.body.AdmissionYear = req.body.AdmissionYear.trim();
      req.body.passoutYear = req.body.passoutYear.trim();
      req.body.currentLocation = req.body.currentLocation.trim();

      await adminHelpers.updateUserProfileAdmin(req.body);
      await adminHelpers.AddUpdateProfileByAdminLog(view, req.body.Name, admin_id);
      res.render('admin/edit_profile_user_admin')
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/update_password_user_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let totalNotification = req.session.totalNotification;
      let aber = req.session.admin.Name;
      res.render('admin/update_password_user_b-admin',{showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/update_password_user_b-admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      let aber = req.session.admin.Name;
      res.render('admin/update_password_user_b-admin', { usersAll, showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/update_password_user_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let view = req.body.profileId;
      let user = await adminHelpers.getBasicProfile(view);
      let Name = user.Name;
      res.render('admin/update_password_user_admin', { view, Name });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/update_password_user-admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let view = req.body.profileID;
      let admin_id = req.session.admin._id;
      await adminHelpers.updateUPassUserByAdmin(view, req.body);
      await userHelpers.updatePassCount(view);
      await adminHelpers.AddUpdateUserPasswordByAdminLog(view, req.body.Name, admin_id);
      res.redirect('/admin/admin_other_functionalities');
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/user_password_update_log_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/user_password_update_log_b-admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/user_password_update_log_b-admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/user_password_update_log_b-admin', { usersAll, showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/user_password_update_log_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let admin_id = req.session.admin._id;
      let totalNotification = req.session.totalNotification;
      let view = req.body.profileId;
      let user = await adminHelpers.getBasicProfile(view);
      let Name = user.Name;
      let logs = await adminHelpers.getUpdatePassLogDetailsAdmin(view);
      await adminHelpers.AddAdminViewPasswordLogOfUser(view, Name, admin_id);
      let formattedLogs = logs.map(log => {
        return log.toLocaleString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true // Change to false if you prefer 24-hour format
        });
      });
      res.render('admin/user_password_update_log_admin', { showAdminHeader1: true, aber, formattedLogs, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/delete_user_posts', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/search_delete_post', {
        showAdminHeader1: true,
        aber,
        totalNotification
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error finding user:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/delete_user_posts', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let Name = req.body.searchName;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/search_delete_post', {
        showAdminHeader1: true,
        aber,
        totalNotification,
        usersAll,
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error finding user:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/view_user_posts', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const skip = 0;
      const limit = 10;
      let profileId = req.body.profileId;
      let aber = req.session.admin.Name;
      let allPosts = await adminHelpers.getAllPostDetails(profileId,skip, limit);
      let totalNotification = req.session.totalNotification;
      req.session.viewPostUserIdByAdmin = profileId;

      for (let post of allPosts) {
        if (post.comments && post.comments.length > 0) {
          post.comments = post.comments.map(comment => {
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = comment.replies.reverse().map(reply => ({
                ...reply
            }));
          }
            return {
              ...comment,
            };
          });
        }
      }

      res.render('admin/view_user_posts', {
        allPosts,
        totalNotification,
        showAdminHeader1: true,
        aber
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_allposts', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);
      let profileId = req.session.viewPostUserIdByAdmin;
      let allPosts = await adminHelpers.getAllPostDetails(profileId,skip, limit);

      for (let post of allPosts) {
        if (post.comments && post.comments.length > 0) {
          post.comments = post.comments.map(comment => {
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = comment.replies.reverse().map(reply => ({
                ...reply
            }));
          }
            return {
              ...comment,
            };
          });
        }
      }
      
      res.json({ allPosts });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/delete_comment_post', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let post_Id = req.body.PoStId;
      let Comment_id = req.body.CoMmEnTiD;
      const response = await adminHelpers.deletePostComment(post_Id, Comment_id);
      await adminHelpers.AdminDeletedPostComment(post_Id, Comment_id,req.session.admin._id);
      res.json(response);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/delete_reply_comment_post', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let post_Id = req.body.PoStId;
      let Comment_id = req.body.CoMmEnTiD;
      let Reply_id = req.body.RePlYiD;
      const response = await adminHelpers.deletePostCommentReply(post_Id, Comment_id, Reply_id);
      await adminHelpers.AdminDeletedPostCommentReply(post_Id, Comment_id, Reply_id,req.session.admin._id);
      res.json(response);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/delete_post', async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let PostID = req.body.PostID;
      let post_owner_id = req.body.post_owner_id;
      let post_owner_name =  req.body.post_owner_name
      const commentators = await userHelpers.getAllCommentators(PostID);
      const response = await adminHelpers.deletePost(PostID);
      if(response.deletePost){
        await userHelpers.deleteCommentEntry(PostID, commentators);
        await adminHelpers.AdminDeletedPosts(post_owner_id, post_owner_name, PostID, req.session.admin._id);
        const postContent = path.join(__dirname, '../public/posts/', post_owner_id, PostID);
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
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    next(error); // Pass the error to the next middleware (could be an error handler)
  }
});


router.post('/delete_comment_post_supreme', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let post_Id = req.body.PoStId;
      let Comment_id = req.body.CoMmEnTiD;
      let post_comment_owner_id = req.body.post_comment_owner_id;
      const response = await adminHelpers.deletePostCommentSupreme(post_Id, Comment_id);
      res.json(response);
      if(response.deleted_Comment_supreme){
        await userHelpers.removeCommentTrackerEntry(post_comment_owner_id,post_Id,Comment_id)
      }
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/delete_reply_comment_post_supreme', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let post_Id = req.body.PoStId;
      let Comment_id = req.body.CoMmEnTiD;
      let Reply_id = req.body.RePlYiD;
      let post_comment_reply_owner_id = req.body.post_comment_reply_owner_id;
      const response = await adminHelpers.deletePostCommentReplySupreme(post_Id, Comment_id, Reply_id);
      res.json(response);
      if(response.deleted_reply_Comment_supreme){
        await userHelpers.removeCommentReplyTrackerEntry(post_comment_reply_owner_id, post_Id, Reply_id)
      }
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/message_all_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      const skip = 0;
      const limit = 50;
      let Admin_broadcasts = await adminHelpers.GetAllAdminBroadcastMessage(skip,limit);
      let pinned_message = await adminHelpers.GetPinnedAdminBroadMessage();
      let polldata = await adminHelpers.getBroadPollInformation();

      Admin_broadcasts.reverse();

      res.render('admin/message_all_admin', {
        showAdminHeader1: true,
        aber,
        Admin_broadcasts,
        pinned_message,
        totalNotification,
        limit,polldata,
        userId : req.session.admin._id
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_broadcastmessages', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);
      let Admin_broadcasts = await adminHelpers.GetAllAdminBroadcastMessage(skip,limit);
      res.json({ success: true, Admin_broadcasts }); 
      
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/message_all_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let Sender_name = req.session.admin.Name;
    let Sender_Id = req.session.admin._id
    let status = "textmessage";
    try { 
      let messageContent = req.body.messageContent;
      let actualMessageId = req.body.actualMessageId;
      let MessageId = req.body.MessageId;
      let actualMessageContent = req.body.actualMessageContent;
      let ReadableTime = req.body.ReadableTime;
      const timestamp = new Date();
      await adminHelpers.handleBroadcastMessage(MessageId,messageContent,actualMessageId,actualMessageContent, timestamp,status,Sender_name,Sender_Id, ReadableTime).then((response)=>{
        res.json({ addedAdminBroadMessage: true })
        return;
      })
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
  }else {
    res.redirect('/admin');
    return;
  }
});


//  EMAIL SERVICE INTEGRATED
/*router.post('/message_all_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let Sender_name = req.session.admin.Name;
    let Sender_Id = req.session.admin._id
    let status = "textmessage";
    try { 
      let messageContent = req.body.messageContent;
      let actualMessageId = req.body.actualMessageId;
      let MessageId = req.body.MessageId;
      let actualMessageContent = req.body.actualMessageContent;
      let ReadableTime = req.body.ReadableTime;
      const timestamp = new Date();

      if(req.session.admin.BroadMessageInitiation == null ){
        let BroadMessageInitiation = await adminHelpers.FetchBroadMessageInitiationTime()
        req.session.admin.BroadMessageInitiation = BroadMessageInitiation;
        if(req.session.admin.BroadMessageInitiation == null ){

          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.admin.Email;

          // Prepare the content for the emails
          const jobContent =
            `<p>Admin initiated a broadcast message.</p>
            <p>Visit student alumni relations portal for more.</p>`;

          // Send email to all users except `myMail`
          for (const email of mailsall) {
            if (email !== myMail) {
              const mailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: email,
                subject: 'New admin broadcast message',
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

          req.session.admin.BroadMessageInitiation = new Date()
        }
      } else if(req.session.admin.BroadMessageInitiation != null){
        if((isDifferentDay(req.session.admin.BroadMessageInitiation)) == true){
          let BroadMessageInitiation = await adminHelpers.FetchBroadMessageInitiationTime()
          req.session.admin.BroadMessageInitiation = BroadMessageInitiation;
        }
      }

      const response = await adminHelpers.handleBroadcastMessage(MessageId,messageContent,actualMessageId,actualMessageContent, timestamp,status,Sender_name,Sender_Id, ReadableTime)
        if(response.addedAdminBroadMessage){
          res.json({ addedAdminBroadMessage: true })

          if(req.session.admin.BroadMessageInitiation != null){
            const isNewDay = isDifferentDay(req.session.admin.BroadMessageInitiation);
            if (isNewDay) {
              // Get all emails
              let mailsall = await userHelpers.getallMail();
              const myMail = req.session.admin.Email;

              // Prepare the content for the emails
              const jobContent =
                `<p>Admin initiated a broadcast message.</p>
                <p>Visit student alumni relations portal for more.</p>`;

              // Send email to all users except `myMail`
              for (const email of mailsall) {
                if (email !== myMail) {
                  const mailOptions = {
                    from: 'anandhueducateanddevelop@gmail.com',
                    to: email,
                    subject: 'New admin broadcast message',
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

              req.session.admin.BroadMessageInitiation = new Date()
            }
          }
        }

        return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
  }else {
    res.redirect('/admin');
    return;
  }
});*/


//   EMAIL INTEGRATED
/*router.post('/message_all_post_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const postData = { ...req.body };
      let Sender_name = req.session.admin.Name;
      let Sender_Id = req.session.admin._id;
      const timestamp = new Date();
      const status = "multimedia";
      let MessageId = req.body.MessageId;
      let messageContent = postData.messageContent;
      messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
      postData.messageContent = messageContent;
      let imageFileNames = [];
      let videoFileNames = [];
      const baseFolderPath = `./public/broadcast/${MessageId}/`;
      const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      if(req.session.admin.BroadMessageInitiation == null ){
        let BroadMessageInitiation = await adminHelpers.FetchBroadMessageInitiationTime()
        req.session.admin.BroadMessageInitiation = BroadMessageInitiation;
        if(req.session.admin.BroadMessageInitiation == null ){

          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.admin.Email;

          // Prepare the content for the emails
          const jobContent =
            `<p>Admin initiated a broadcast message.</p>
            <p>Visit student alumni relations portal for more.</p>`;

          // Send email to all users except `myMail`
          for (const email of mailsall) {
            if (email !== myMail) {
              const mailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: email,
                subject: 'New admin broadcast message',
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

          req.session.admin.BroadMessageInitiation = new Date()
        }
      } else if(req.session.admin.BroadMessageInitiation != null){
        if((isDifferentDay(req.session.admin.BroadMessageInitiation)) == true){
          let BroadMessageInitiation = await adminHelpers.FetchBroadMessageInitiationTime()
          req.session.admin.BroadMessageInitiation = BroadMessageInitiation;
        }
      }

      await adminHelpers.addPostOneBroadcastAdmin(postData, timestamp, status, Sender_name, Sender_Id, formattedTimestamp);

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

      await adminHelpers.addPostOneImagesAdminBroadcast(Sender_Id, MessageId, imageFileNames);
      await adminHelpers.addPostOneVideosAdminBroadcast(Sender_Id, MessageId, videoFileNames);

      res.json({ addedAdminBroadGroupMessage: true });

      if(req.session.admin.BroadMessageInitiation != null){
        const isNewDay = isDifferentDay(req.session.admin.BroadMessageInitiation);
        if (isNewDay) {
          // Get all emails
          let mailsall = await userHelpers.getallMail();
          const myMail = req.session.admin.Email;

          // Prepare the content for the emails
          const jobContent =
            `<p>Admin initiated a broadcast message.</p>
            <p>Visit student alumni relations portal for more.</p>`;

          // Send email to all users except `myMail`
          for (const email of mailsall) {
            if (email !== myMail) {
              const mailOptions = {
                from: 'anandhueducateanddevelop@gmail.com',
                to: email,
                subject: 'New admin broadcast message',
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

          req.session.admin.BroadMessageInitiation = new Date()
        }
      }

      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.post('/message_all_post_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const postData = { ...req.body };
      let Sender_name = req.session.admin.Name;
      let Sender_Id = req.session.admin._id;
      const timestamp = new Date();
      const status = "multimedia";
      let MessageId = req.body.MessageId;
      let messageContent = postData.messageContent;
      messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
      postData.messageContent = messageContent;
      let imageFileNames = [];
      let videoFileNames = [];
      const baseFolderPath = `./public/broadcast/${MessageId}/`;
      const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      await adminHelpers.addPostOneBroadcastAdmin(postData, timestamp, status, Sender_name, Sender_Id, formattedTimestamp);

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

      await adminHelpers.addPostOneImagesAdminBroadcast(Sender_Id, MessageId, imageFileNames);
      await adminHelpers.addPostOneVideosAdminBroadcast(Sender_Id, MessageId, videoFileNames);

      res.json({ addedAdminBroadGroupMessage: true });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_message_by_id_broadcast',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try { 
      let MessageId = req.body.MeSsAgEiD;
      let message = await adminHelpers.getBroadMessageById(MessageId, req.session.admin._id)
      delete message.MessageId;
        res.json({ message})
        return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/get_message_by_id_broadcast_text',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try { 
      let MessageId = req.body.MeSsAgEiD;
      let message = await adminHelpers.getBroadMessageByIdText(MessageId, req.session.admin._id)
        res.json({ message})
        return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/add_pin_adminbroadcast',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try { 
      let message = await adminHelpers.addPinAdminBroad(req.body.MeSsAgEiD)
      res.json({ message})
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/remove_pin_adminbroadcast',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try { 
      let message = await adminHelpers.removePinAdminBroad(req.body.MeSsAgEiD)
      res.json({ message})
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/delete-message-from-broadcast', (req, res) => {
  if (req.session && req.session.admin) {
    adminHelpers.deleteBroadcastMessage(req.body.MessagE, req.session.admin._id)
      .then((response) => {
        res.json(response);
        return;
      })
      .catch((error) => {
        console.error("Error deleting broadcast message:", error);
        res.status(500).json({ error: "Failed to delete message" });
      });
  } else {
    res.redirect('/admin');
    return;
  }
});


router.post('/add_poll_tobroad', async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      if ((req.body.caption !== null && req.body.caption !== "") && req.body.option1) {
        await adminHelpers.initializePOLLInBroad(req.body, req.session.admin._id, req.session.admin.Name);
      }

      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// EMAIL INTEGRATED
/*router.post('/add_poll_tobroad', async (req, res) => {
  try {
    if (req.session && req.session.admin) {

      if ((req.body.caption !== null && req.body.caption !== "") && req.body.option1) {
        await adminHelpers.initializePOLLInBroad(req.body, req.session.admin._id, req.session.admin.Name);
      }

      let mailsall = await userHelpers.getallMail();
      const myMail = req.session.user.Email;

      // Prepare the content for the emails
      const jobContent =
      `<p>A poll posted in broadcast chat by admin${req.session.admin.Name}. React to it.</p>
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
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});*/


router.post('/delete_broad_poll', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      if(req.session.admin._id == req.body.UsErId)
      {
        let response = await adminHelpers.deleteBroadPoll()
        res.json(response)
        return;
      } else{
        res.render("user/unauthorized_attempt")
        return
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post('/get_all_broad_pollresult', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let response = await adminHelpers.getAllBroadPollResult();
      res.json({success:true,response});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get('/view_user_log_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/view_user_log_b-admin', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing user log:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_user_log_b-admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
      res.render('admin/view_user_log_b-admin', { usersAll, showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error searching user log:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_user_log_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let view = req.body.profileId;
      let totalNotification = req.session.totalNotification;
      let admin_id = req.session.admin._id;
      let user = await adminHelpers.getBasicProfile(view);
      let Name = user.Name;
      let logs = await adminHelpers.getUserLoggedLogDetailsAdmin(view);
      await adminHelpers.AddAdminViewLoggedLogOfUser(view, Name, admin_id);
      let formattedLogs = logs.map(log => {
        const date = new Date(log.value);
        const formattedDate = date.toLocaleString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true // Change to false if you prefer 24-hour format
        });
        return `${log.type}: ${formattedDate}`;
      });
      res.render('admin/view_user_log_admin', { showAdminHeader1: true, aber, formattedLogs, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing user log details:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/enable_power_transfer', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let admin_ID = req.session.admin._id;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      toggle_status = await adminHelpers.fetc_2_hPower_2_Transfer_1_Sta_8_te(admin_ID);
      res.render('admin/enable_power_transfer_admin', { showAdminHeader1: true, aber, admin_ID, toggle_status, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error fetching power transfer state:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/enable_power_transfer', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let adminID = req.session.admin._id;
      let admin_ID = req.body.admin_ID;
      if(adminID == admin_ID){
        const result = await adminHelpers.EnablePowerTransfer(admin_ID);
        res.json({ success: true, powertransfer_enabled: result.powertransfer_enabled });
        return;
      }
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
  } catch (error) {
    console.error("Error enabling power transfer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/check_authentication', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const key1 = req.body.KEY_1;
      const key2 = req.body.KEY_2;
      const ad_mail = req.body.KEY_MAIL;
      let result = await adminHelpers.authenticateEnable(key1, key2, ad_mail, req.session);
      res.json(result);
      return
    }
  } catch (error) {
      console.error("Error enabling power transfer:", error);
      res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/admin_message_enquiries', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/admin_message_enquiries', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error rendering admin message enquiries:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/enquirywith_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      const skip = 0;
      const limit = 20
      let enquiries = await adminHelpers.GetallEnquiries(skip, limit);
      //enquiries.reverse();

      res.render('admin/enquirywith_admin', 
      { 
        showAdminHeader1: true, 
        aber, enquiries, 
        totalNotification,limit
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing enquiries with admin:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_enquirywith_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);
      let enquiries = await adminHelpers.GetallEnquiries(skip, limit);

      res.json({ success: true, enquiries });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing enquiries with admin:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_each_enquiry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let view_enquiry = req.body.enquiryId;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let enquiries = await adminHelpers.GetindiEnquiries(view_enquiry);
      let multimedia = (enquiries.VideoNames && enquiries.VideoNames.length > 0) || (enquiries.ImageNames && enquiries.ImageNames.length > 0);
      await adminHelpers.AddAdminEnquiryView(view_enquiry);
      res.render('admin/view_each_enquiry', { showAdminHeader1: true, aber, enquiries, totalNotification, multimedia});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing each enquiry:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/user_reports_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      const skip = 0;
      const limit = 20
      let reports = await adminHelpers.GetallReports(skip, limit);
      //enquiries.reverse();

      res.render('admin/user_reports', 
      { 
        showAdminHeader1: true, 
        aber, reports, 
        totalNotification,limit
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing reports of user :", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/get_remaining_report_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let { skip, limit } = req.body;
      skip = parseInt(skip, 10);
      limit = parseInt(limit, 10);
      let reports = await adminHelpers.GetallReports(skip, limit);

      res.json({ success: true, reports });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing enquiries with admin:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/view_each_report', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let view_report = req.body.report_id;
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let report = await adminHelpers.GetindiReports(view_report);
      await adminHelpers.AddAdminReportView(view_report);
      res.render('admin/view_each_report', { showAdminHeader1: true, aber, report, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error viewing each report:", error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/one_on_admin_chat', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      try {
      let aber = req.session.admin.Name;
      let Sender_Id = req.session.admin._id;
      let Reciever_Id = req.body.User_Id;
      let totalNotification = req.session.totalNotification;

      let sender = {};
      sender.Name = aber;
      sender._id = Sender_Id;
      let reciever = await userHelpers.getBasicProfile(Reciever_Id);

      const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
      const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');

      let time_entered_inchat = new Date();
      time_entered_inchat = time_entered_inchat.toISOString();
      await userHelpers.updateEnteredTimeUnreadAdmin(Sender_Id,Reciever_Id,Room_Id,time_entered_inchat)

      let sendmessages = await userHelpers.oneONoneCHATAdmin(Sender_Id, Reciever_Id);
      let recievedmessages = await userHelpers.oneONoneCHATAdmin(Reciever_Id, Sender_Id);

      const CURRENT_messageCount = await userHelpers.getArrayCountAdmin(Sender_Id, Reciever_Id);
      const Existing_messageCount = await userHelpers.GetExistingAdminIndiMessCount(Sender_Id,Reciever_Id);
      
      if (CURRENT_messageCount > (Existing_messageCount+1)) {
        recievedmessages[Existing_messageCount].last_notification = true;
      }

      sendmessages = sendmessages.map(message => ({ ...message, Send: true}));
      recievedmessages = recievedmessages.map(message => ({ ...message, Recieve: true}));
      let messages = [...sendmessages, ...recievedmessages];

      messages.sort((a, b) => a.timestamp - b.timestamp);
    
      res.render('admin/one_on_admin_chat', {
        showAdminHeader1: true,
        aber,Room_Id,
        messages,
        reciever,
        sender,
        totalNotification
      });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/get_message_by_id_admin_one', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let receiverId = req.body.rEcIeVeRiD;
      let userId = req.session.admin._id;

      let message = await userHelpers.getMessageByAdminOneId(messageId, userId, receiverId);
      res.json({ message });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error fetching message by ID:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id_admin_one_text', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let receiverId = req.body.rEcIeVeRiD;
      let userId = req.session.admin._id;

      let message = await userHelpers.getMessageByAdminOneIdText(messageId, userId, receiverId);
      res.json({ message });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error fetching text message by ID:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/add_reaction_Admin_onechatchat', (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageID = req.body.MeSsAgEiD;
      let SenderId = req.session.admin._id;
      let receiverId = req.body.ReCiEvErId;
      let Emoji = req.body.EmOjIcOnTeNt;

      userHelpers.addOneAdminReaction(messageID, SenderId, receiverId, Emoji)
        .then((response) => {
          res.json(response);
          return;
        })
        .catch((error) => {
          console.error("Error adding reaction:", error);
          res.status(500).json({ error: "Failed to add reaction" });
        });
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/get_message_by_id_Admin_one_Emoji', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let messageId = req.body.MeSsAgEiD;
      let receiverId = req.body.rEcIeVeRiD;
      let userId = req.session.admin._id;

      let message = await userHelpers.getMessageByAdminOneIdEmoji(messageId, receiverId, userId);
      res.json({ message });
      return;
    } else {
      res.redirect('/login');
      return;
    }
  } catch (error) {
    console.error("Error fetching message by ID with emoji:", error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/send_one_admin_message', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {     
      try {     
          const Sender_name = req.session.admin.Name;
          const Sender_Id = req.session.admin._id 
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

          await userHelpers.handleOneChatMessageAdmin
          (
            MessageId, messageContent, 
            actualMessageId, 
            actualMessageContent, 
            timestamp, status, Reciever_Id, 
            Sender_Id, ReadableTime, 
            Sender_name, Reciever_name
          ).then((response)=>{
            res.json(response)
          })

          await userHelpers.AddInverseChatAdmin(Sender_Id,Reciever_Id)
          await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id,Sender_Id,Room_Id,time_entered_inchat)
          return;
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: "Internal Server Error" });
      }
  }else {
    res.redirect('/admin');
    return;
  }
});


//   EMAIL INTEGRATED
/*router.post('/send_one_admin_message', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {     
      try {     
          const Sender_name = req.session.admin.Name;
          const Sender_Id = req.session.admin._id 
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

          await userHelpers.handleOneChatMessageAdmin
          (
            MessageId, messageContent, 
            actualMessageId, 
            actualMessageContent, 
            timestamp, status, Reciever_Id, 
            Sender_Id, ReadableTime, 
            Sender_name, Reciever_name
          ).then(async(response)=>{
            res.json(response)

            if(response.addedoneAdminmessage){
              if(req.session.admin.Room_Id == null){
                let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
                if(get_Message_Time_Interval == null){
                  // LOGIC TO SEND INITIAL MESSAGE
  
                  // GET REQUIRED EMAIL
                  let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);

                  const mailOptions = {
                    from: "anandhueducateanddevelop@gmail.com",
                    to: send_Mail.Email,
                    subject: 'Message enquiry',
                    text: `You got a personal message from Admin for the first time. Visit student alumni relations cell for more`
                  };
            
                  transporter.sendMail(mailOptions, async(error, info) => {
                    if (error) {
                      console.error('Error sending email:', error);
                      return res.status(500).send('Error sending OTP');
                    }
                    console.log('Email sent:', info.response);
                  });
  
                  req.session.admin.Room_Id = new Date()
                }
                req.session.admin.Room_Id = get_Message_Time_Interval
              } else if(req.session.admin.Room_Id != null){
                if((isDifferentDay(req.session.admin.Room_Id)) == true){
                  let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
                  req.session.admin.Room_Id = get_Message_Time_Interval;
                }
              }
            }

          });

          await userHelpers.AddInverseChatAdmin(Sender_Id,Reciever_Id)
          await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id,Sender_Id,Room_Id,time_entered_inchat)
          
          if(req.session.admin.Room_Id != null){
            let current_message_count = await userHelpers.getArrayCountAdmin(Reciever_Id,Sender_Id)
            let existing_message_count = await userHelpers.GetExistingAdminIndiMessCount(Reciever_Id,Sender_Id)  // EDIT IN THIS FUNCTION
            if((current_message_count-existing_message_count)>0){
              const newNeededTimeChek = isDifferentDay(req.session.admin.Room_Id)
              if(newNeededTimeChek){
                //   LOGIC TO SEND MAIL HERE
  
                // GET REQUIRED EMAIL
                let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);
                  
                const mailOptions = {
                  from: "anandhueducateanddevelop@gmail.com",
                  to: send_Mail.Email,
                  subject: 'Message enquiry',
                  text: `You got a personal message from Admin. Visit student alumni relations cell for more`
                };
          
                transporter.sendMail(mailOptions, async(error, info) => {
                  if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send('Error sending OTP');
                  }
                  console.log('Email sent:', info.response);
                });
  
                req.session.admin.Room_Id = new Date()
              }
            }
          }
          
          return;
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: "Internal Server Error" });
      }
  }else {
    res.redirect('/admin');
    return;
  }
});*/


router.post('/add_one_post_admin_tochat', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      const postData = { ...req.body };
      const Sender_name = req.session.admin.Name;
      const Sender_Id = req.session.admin._id;
      const timestamp = new Date();
      const time_entered_inchat = timestamp.toISOString();
      const status = "multimedia";
      const Reciever_Id = postData.Reciever_Id;
      delete postData.Reciever_Id;
      const Room_Id = postData.Room_Id;
      delete postData.Room_Id;
      const MessageId = req.body.MessageId;
      const imageFileNames = [];
      const videoFileNames = [];
      const baseFolderPath = `./public/one_on_admin_one_chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;

      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      await userHelpers.addPostOneAdmin(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
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
      res.redirect('/admin');
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
    if (req.session && req.session.admin) {
      const postData = { ...req.body };
      const Sender_name = req.session.admin.Name;
      const Sender_Id = req.session.admin._id;
      const timestamp = new Date();
      const time_entered_inchat = timestamp.toISOString();
      const status = "multimedia";
      const Reciever_Id = postData.Reciever_Id;
      delete postData.Reciever_Id;
      const Room_Id = postData.Room_Id;
      delete postData.Room_Id;
      const MessageId = req.body.MessageId;
      const imageFileNames = [];
      const videoFileNames = [];
      const baseFolderPath = `./public/one_on_admin_one_chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;

      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      await userHelpers.addPostOneAdmin(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
      
      if(req.session.admin.Room_Id == null){
        let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
        if(get_Message_Time_Interval == null){
          // LOGIC TO SEND INITIAL MESSAGE

          // GET REQUIRED EMAIL
          let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);

          const mailOptions = {
            from: "anandhueducateanddevelop@gmail.com",
            to: send_Mail.Email,
            subject: 'Message enquiry',
            text: `You got a personal message from Admin for the first time. Visit student alumni relations cell for more`
          };
    
          transporter.sendMail(mailOptions, async(error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).send('Error sending OTP');
            }
            console.log('Email sent:', info.response);
          });

          req.session.admin.Room_Id = new Date()
        }
        req.session.admin.Room_Id = get_Message_Time_Interval
      } else if(req.session.admin.Room_Id != null){
        if((isDifferentDay(req.session.admin.Room_Id)) == true){
          let get_Message_Time_Interval = await userHelpers.getMessageTimeIntervalAdmin(Sender_Id, Reciever_Id)
          req.session.admin.Room_Id = get_Message_Time_Interval;
        }
      }
      
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

      if(req.session.admin.Room_Id != null){
        let current_message_count = await userHelpers.getArrayCountAdmin(Reciever_Id,Sender_Id)
        let existing_message_count = await userHelpers.GetExistingAdminIndiMessCount(Reciever_Id,Sender_Id)  // EDIT IN THIS FUNCTION
        if((current_message_count-existing_message_count)>0){
          const newNeededTimeChek = isDifferentDay(req.session.admin.Room_Id)
          if(newNeededTimeChek){
            //   LOGIC TO SEND MAIL HERE

            // GET REQUIRED EMAIL
            let send_Mail = await userHelpers.getEmailFromUserId(Reciever_Id);
              
            const mailOptions = {
              from: "anandhueducateanddevelop@gmail.com",
              to: send_Mail.Email,
              subject: 'Message enquiry',
              text: `You got a personal message from Admin. Visit student alumni relations cell for more`
            };
      
            transporter.sendMail(mailOptions, async(error, info) => {
              if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending OTP');
              }
              console.log('Email sent:', info.response);
            });

            req.session.admin.Room_Id = new Date()
          }
        }
      }

      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});*/


router.get('/chatwith_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
        let aber = req.session.admin.Name;
        let totalNotification = req.session.totalNotification;
        const userId = req.session.admin._id;
        let ExistingCount = await userHelpers.FetchChatRoomUpdateAdmin(userId); // ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN USED
        let Existing_Reciever_List = ExistingCount.Reciever_List;
        let Existing_Recieve_List_count = Existing_Reciever_List.length;
        let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(userId) // CHAT_BACK_AND_FORTH_BOOK_ADMIN USED
        let Current_Recieve_List_count = Current_Reciever_List.length;

        let New_Reciever = [];
        if (Existing_Recieve_List_count < Current_Recieve_List_count) {
            New_Reciever = Current_Reciever_List.filter(currentReceiver => !Existing_Reciever_List.includes(currentReceiver));
        } else {
            New_Reciever = [];
        }

        let fetch = await userHelpers.FetchupdateTimeUnreadAdmin(Existing_Reciever_List,userId); // TIME_UNREAD_COLLECTION_ADMIN used

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
        let receivedMessageUI = await userHelpers.getReceivedMessageUIDetailsAdmin(userId);

        sendedmessageUI = Object.values(sendedmessageUI).map(message => {
          return {
            ...message,
            ID: Object.keys(sendedmessageUI).find(key => sendedmessageUI[key] === message),
            Send: true,
          };
        });

        receivedMessageUI = receivedMessageUI.map(message => {
          message.ID = message.Sender_Id;
          delete message.Sender_Id;
          message.Recieve = true;
          return message;
        });

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
        });

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
        });

        res.render('admin/chatwith_admin', {userId, combinedMessages, showAdminHeader1: true,aber, totalNotification});
        return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error fetching chat room update:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});


router.get('/restrict_groupchat_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      
      res.render('admin/search_to_restrictgroup', {
        restrict_detail_understand: true,
        totalNotification,
        aber,
        showAdminHeader1: true,
        showSearch: true,
        showRestrictedButton: true
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error rendering searching users by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/restrict_groupchat_entry_finder', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      
      let usersAll = await userHelpers.GetUserThroughSearch(Name);   //  NAME, STATUS, EMPLOYEMENT STATUS, ID
      
      res.render('admin/search_to_restrictgroup', {
        usersAll,
        totalNotification,
        aber,
        showAdminHeader1: true,
        showSearch: true
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error searching users by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/restrict-groupchat_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let sender = req.body.ProfileId;
      
      let sender_detail = await userHelpers.getLowProfile(sender);
      
      res.render('admin/search_to_restrictgroup_action', {
        totalNotification,
        aber,
        showAdminHeader1: true,
        sender_detail,
        has_sender_byid: true,
        showsearch: true,
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error finding user by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/restrict_groupchat_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let blocked_id = req.body.blocked_id;

      if (blocked_id !== req.session.admin._id) {
        await adminHelpers.sendRestrictData(blocked_id);
        await adminHelpers.sendAdminRestrictDataLog(blocked_id,req.session.admin._id);
        res.redirect('/admin/restrict_groupchat_entry');
        return;
      } else {
        res.redirect('/admin/restrict_groupchat_entry');
        return;
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error restricting user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/see_all_restricted_users', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let ReusersAll = await adminHelpers.getAllGroupRestrictedUser(req.session.admin._id);
      res.render("admin/search_to_restrictgroup",
        {
          ReusersAll,
          totalNotification,
          aber,
          showAdminHeader1: true,
        })
      return
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error restricting user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/remove_restrict_groupchat_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      reUser = req.body.ProfileId;
      await adminHelpers.removeGroupRestriction(reUser);
      await adminHelpers.addRemoveRestrictionLogAdmin(reUser,req.session.admin._id)

      res.redirect("/admin/restrict_groupchat_entry",)
      return
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error unrestricting user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/restrict_user_from_portal', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      
      res.render('admin/search_to_restrictuser', {
        restrict_detail_understand: true,
        totalNotification,
        aber,
        showAdminHeader1: true,
        showSearch: true,
        showRestrictedButton: true
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error rendering searching users by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/restrict_user_entry_finder', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let Name = req.body.searchName;
      let totalNotification = req.session.totalNotification;
      
      let usersAll = await userHelpers.GetUserThroughSearch(Name);   //  NAME, STATUS, EMPLOYEMENT STATUS, ID
      
      res.render('admin/search_to_restrictuser', {
        usersAll,
        totalNotification,
        aber,
        showAdminHeader1: true,
        showSearch: true
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error searching users by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/restrict-user_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let sender = req.body.ProfileId;
      
      let sender_detail = await userHelpers.getLowProfile(sender);
      
      res.render('admin/search_to_restrictuser_action', {
        totalNotification,
        aber,
        showAdminHeader1: true,
        sender_detail,
        has_sender_byid: true,
        showsearch: true,
      });
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error finding user by name:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/restrict_user_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let blocked_id = req.body.blocked_id;

      if (blocked_id !== req.session.admin._id) {
        await adminHelpers.sendRestrictUserData(blocked_id);
        await adminHelpers.sendAdminRestrictUserDataLog(blocked_id,req.session.admin._id);
        res.redirect('/admin/restrict_user_from_portal');
        return;
      } else {
        res.redirect('/admin/restrict_user_from_portal');
        return;
      }
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error restricting user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/see_all_portalrestricted_users', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let ReusersAll = await adminHelpers.getAllPortalRestrictedUser(req.session.admin._id);
      res.render("admin/search_to_restrictuser",
        {
          ReusersAll,
          totalNotification,
          aber,
          showAdminHeader1: true,
        })
      return
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error restricting user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/remove_user_restrict_entry', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      reUser = req.body.ProfileId;
      await adminHelpers.removePortalRestriction(reUser);
      await adminHelpers.addRemovePortalRestrictionLogAdmin(reUser,req.session.admin._id)

      res.redirect("/admin/restrict_user_from_portal",)
      return
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error unrestricting user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/clear_user_records', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/clear_user_records', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search_alumni_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/clear_user_records', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      let usersAll = await adminHelpers.GetUserToClearRecord(req.body.searchName,req.body.DateOfBirth)
      res.render('admin/clear_user_records', { showAdminHeader1: true, aber, totalNotification,usersAll});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /search_alumni_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/clear_user-records', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      await adminHelpers.removeUserRecordFromBasics(req.body.EntryId).then(async(response) => {
        if (response.deleteEntryRecord){
          await adminHelpers.adminClearedUserRecordLog(req.body.EntryName, req.body.EntryStatus, req.session.admin._id);
          res.redirect('/admin/admin_other_functionalities');
          return;
        } else{
          res.json("ERROR DELETING RECORD");
          return
        }
      });
      
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error("Error in GET /clear_user_record_admin route:", error);
    res.status(500).send("An error occurred while processing your request.");
  }
});




//      NOTIFICATION   


router.get('/admin_view_notification', async (req, res) => {
  try {
      if (req.session.adminLoggedIn) {
          let aber = req.session.admin.Name;
          const userId = req.session.admin._id;


          //  ALL NOTIFICATION CALCULATION BELOW

          let ExistingCount = await userHelpers.FetchChatRoomUpdateAdmin(userId); // ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN USED
          let Existing_Reciever_List = ExistingCount.Reciever_List;
          let Existing_Recieve_List_count = Existing_Reciever_List.length;
          let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(userId) // CHAT_BACK_AND_FORTH_BOOK_ADMIN USED
          let Current_Recieve_List_count = Current_Reciever_List.length;

          let New_Reciever = [];
          if (Existing_Recieve_List_count < Current_Recieve_List_count) {
              New_Reciever = Current_Reciever_List.filter(currentReceiver => !Existing_Reciever_List.includes(currentReceiver));
          } else {
              New_Reciever = [];
          } // POTENTIAL TO USE THE EXACT NEW USER IN NOTIFICATION 
          // HERE ONLY MESSAGE "SOMEONE NEW HAS MESSAGED YOU" IS USED INSTEAD OF SPECIFIC USER

          let new_Messenger = New_Reciever.length;
          let new_messenger_found = new_Messenger > 0 ? true : false;

          let fetch = await userHelpers.FetchupdateTimeUnreadAdmin(Existing_Reciever_List,userId); // TIME_UNREAD_COLLECTION_ADMIN used

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
          // POTENTIAL TO FIND NEW MESSAGE FROM EVERY EXISTING USER
          // HERE FOR "YOU HAVE GOT MESSAGES FROM EXISTING CONVERSATION" IS USED

          function sumExistingNewMessageCounts(messageCounts) {
          return messageCounts.reduce((sum, item) => sum + item.messageCount, 0);
        }
          const AllNewExistingMessageCountAdmin = await sumExistingNewMessageCounts(newMessageCount);
          let newMessagesInExisting_Found = AllNewExistingMessageCountAdmin > 0 ? true : false;

          let existing_groupchat_count = await adminHelpers.fetch_Groupchat_last_leave_count_Admin(userId);
          let current_groupchat_count = await userHelpers.getAllNewGroupchatNotification();
          let groupchatcount_admin = (current_groupchat_count - existing_groupchat_count);
          let groupchat_notif_admin = groupchatcount_admin > 0 ? true : false;

          let existing_mentor_count = await adminHelpers.fetch_MentorPortal_last_leave_count_Admin(userId);
          let current_mentor_count = await adminHelpers.get_current_MentorPortal_count_Admin();
          let mentorcount_admin = (current_mentor_count - existing_mentor_count);
          let newMentor_notif_admin = mentorcount_admin > 0 ? true : false;

          let existing_admin_Enquiry_count = await adminHelpers.GetLastEnquiryCountAdmin(userId);
          let current_admin_Enquiry_count = await adminHelpers.GetCurrentEnquiryCountAdmin();
          let new_enquiry_count_admin = (current_admin_Enquiry_count - existing_admin_Enquiry_count);
          let newEnquiry_notif_admin = new_enquiry_count_admin > 0 ? true : false;

          let existing_Job_count = await adminHelpers.fetch_JobPortal_last_leave_count_Admin(userId);
          let current_Job_count = await adminHelpers.get_current_JobPortal_count_Admin();
          let new_Job_Notif_Count = (current_Job_count - existing_Job_count);
          let new_Job_Notif = new_Job_Notif_Count > 0 ? true : false;

          let existing_Intern_count = await adminHelpers.fetch_InternPortal_last_leave_count_Admin(userId);
          let current_Intern_count = await adminHelpers.get_current_InternPortal_count_Admin();
          let new_Intern_Notif_Count = (current_Intern_count - existing_Intern_count);
          let new_Intern_Notif = new_Intern_Notif_Count > 0 ? true : false;

          await adminHelpers.storeAdminNotification(
          userId,
          new_Intern_Notif_Count,new_Intern_Notif,
          new_Job_Notif_Count,new_Job_Notif,
          new_enquiry_count_admin,newEnquiry_notif_admin,
          mentorcount_admin,newMentor_notif_admin,
          AllNewExistingMessageCountAdmin,newMessagesInExisting_Found,
          new_Messenger,new_messenger_found,New_Reciever,
          groupchatcount_admin,groupchat_notif_admin
        );
          
          let totalNotification = 
          ( new_Intern_Notif_Count + new_Job_Notif_Count +
            new_enquiry_count_admin + mentorcount_admin +
            groupchatcount_admin + AllNewExistingMessageCountAdmin + new_Messenger 
          )
          req.session.totalNotification = totalNotification;

        //    ALL NOTIFICATION CALCULATION ABOVE

          let viewNotifications = await adminHelpers.getAdminViewNotifications(userId);

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

          const promises = [];
          const updatedNotifications = [];

          async function processnewmessages() {
            for (const entry of viewNotifications) {
              if (entry.New_Reciever && entry.New_Reciever.length > 0) {
                const updatedNewMessages = [];
                for (const userId of entry.New_Reciever) {
                  const userDetails = await userHelpers.getBasicUserProfileDetails(userId);  // STARMARK
                  const idWithName = { id: userId, name: userDetails.Name };
                  updatedNewMessages.push(idWithName);
                }
                entry.New_Reciever = updatedNewMessages;
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

          res.render('admin/admin_view_notification', 
            { 
              showAdminHeader1: true, aber,
              firstNotification,
              remainingNotification,
              totalNotification
            });
          return;
      } else {
        res.redirect('/admin');
        return;
      }
  } catch (error) {
      console.error("Error in GET /admin-view-notification route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/send_timestamp_leave_groupchat_admin', async (req, res) => {
  if (req.session && req.session.admin) {
    let Sender_Id = req.session.admin._id;

    try {
      const timestamp = req.body.timestamp;
      const messageCount = await userHelpers.getAllNewGroupchatNotification();
      await adminHelpers.updateTimeOnleaveGroupchatAdmin(Sender_Id,timestamp,messageCount)
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/send_timestamp_leave_adminchat', async (req, res) => {
  if (req.session && req.session.admin) {
    let Reciever_Id = req.body.Reciever_ID;
    let Sender_Id = req.session.admin._id;

    try {
      const messageCount = await userHelpers.getArrayCountAdmin(Sender_Id, Reciever_Id);
      const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
      const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
      const timestamp = req.body.timestamp;
      await userHelpers.updateTimeUnreadAdmin(Sender_Id,Room_Id, timestamp, messageCount).then((response) => {
        res.json(response);
      });
      let sendmessages = await userHelpers.oneONoneCHATAdmin(Sender_Id, Reciever_Id);
        let messages = [...sendmessages];
        if(messages.length > 0){
          await userHelpers.ChatRoomUpdateOnProfileReturnsAdmin(Sender_Id,timestamp,Reciever_Id);
        }
        return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }else {
    res.redirect('/admin');
    return;
  }
});
  
  

router.post('/send_timestamp_leave_adminmenu', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      let Sender_Id = req.session.admin._id;
      const timestamp = req.body.timestamp;
      let Send_List = await userHelpers.chatCOUNTAdmin(Sender_Id);
      let Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(Sender_Id);
      let Send_List_count = Send_List.length;
      let Recieve_List_count = Reciever_List.length;
      await userHelpers.ChatRoomUpdateAdmin(Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count);
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});  



router.post('/send_timestamp_leave_admin_askadmin', async (req, res) => {
  if (req.session && req.session.admin) {
      let Sender_Id = req.session.admin._id;
      try {
        const enquiryCount = await adminHelpers.getAllCurrentEnquiryCount();
        await adminHelpers.enquiryCountLastLeaveAdmin(Sender_Id,enquiryCount)
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/send_mentorcount_leave_mentorportal_admin', async (req, res) => {
  if (req.session && req.session.admin) {
      let Sender_Id = req.session.admin._id;
      try {
        const mentorCount = await adminHelpers.getCurrentMentorCount();
        await adminHelpers.updateCountOnleaveMentorshipAdmin(Sender_Id,mentorCount)
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/send_jobCount_leave_jobportal_admin', async (req, res) => {
  if (req.session && req.session.admin) {
      let Sender_Id = req.session.admin._id;
      try {
        const JobCount = req.body.messageCount;
        await adminHelpers.updateCountOnleaveJobportalAdmin(Sender_Id,JobCount)
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/send_internCount_leave_internportal_admin', async (req, res) => {
  if (req.session && req.session.admin) {
      let Sender_Id = req.session.admin._id;
      try {
        const InternCount = req.body.messageCount;
        await adminHelpers.updateCountOnleaveInternPortalAdmin(Sender_Id,InternCount)
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
  }else {
    res.redirect('/admin');
    return;
  }
});


router.post('/reload_root_on_leave_notification', async (req, res) => {
  try {
    if (req.session && req.session.admin) {
      res.redirect('/admin-view-page');
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/admin_guideline', verifyLogin, async (req, res, next) => {
  try {
    if (req.session && req.session.admin) {
      let aber = req.session.admin.Name;
      let totalNotification = req.session.totalNotification;
      res.render('admin/help_guideline', { showAdminHeader1: true, aber, totalNotification});
      return;
    } else {
      res.redirect('/admin');
      return;
    }
  } catch (err) {
    next(err);
  }
});
  



module.exports = router;
