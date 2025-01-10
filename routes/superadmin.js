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
const { parse } = require('handlebars')
const superadminHelpers = require('../helpers/superadmin-helpers');
const session = require('express-session');
const { log } = require('handlebars');
const { response } = require('../app');
const adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');
const verifyLogin = (req,res,next)=>{
  if(req.session.superadminLoggedIn){
    next()
    return;
  }else{
    res.redirect('/superadmin')
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



router.get('/', function(req, res, next) {
  try {
      res.render('superadmin/super_login_button');
      return;
  } catch (error) {
      console.error("An error occurred while rendering the page:", error);
      next(error);
  }
});


router.get('/superadmin-view-page', async (req, res) => {
  try {
      if (req.session.superadminLoggedIn) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/superadmin-view-page', { showSuperAdminHeader1: true, saber });
          return;
      } else {
          res.render('superadmin/superadminlogin');
          req.session.superadminLoginErr = false;
          return;
      }
  } catch (error) {
      console.error("An error occurred while rendering the page:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/superadminlogin', async (req, res) => {
    try {
        req.body.Email = req.body.Email.trim()
        const response = await superadminHelpers.doSuperAdminLogin(req.body);
        if (response.status) {
            req.session.superadminLoggedIn = true;
            req.session.superadmin = response.superadmin;
            res.redirect('/superadmin/superadmin-view-page');
            return;
        } else if (response.locked) {
            req.session.superadminLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
            res.render('superadmin/superadminlogin', { "SuperLoginERROR": req.session.superadminLoginErr });
            return;
        } else {
            req.session.superadminLoginErr = response.attemptsLeft !== undefined
                ? `Invalid Username or Password. ${response.attemptsLeft} attempts left.`
                : "Invalid Username or Password";
            res.render('superadmin/superadminlogin', { "SuperLoginERROR": req.session.superadminLoginErr });
            return;
        }
    } catch (error) {
        console.error("An error occurred during super admin login:", error);
        req.session.superadminLoginErr = "An error occurred during login. Please try again.";
        res.render('superadmin/superadminlogin', { "SuperLoginERROR": req.session.superadminLoginErr });
    }
});


//  EMAIL SERVICE INTEGRATED
/*router.post('/superadminlogin', async (req, res) => {
    try {

    // Check if OTP resend is requested
    if (req.body.resendOtp) {
        let otpRequests_time = await superadminHelpers.getOtpRequest(req.body.senCurreSponDer);
  
        let otpRequests = otpRequests_time ? otpRequests_time.OtpreQuestcounT : 0;
        const lockTime = otpRequests_time ? otpRequests_time.opt_lock_time : null;
  
        if (otpRequests >= 3) {
            const currentTime = new Date();
            const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours
    
            if (lockTimeElapsed >= 1) {
                // Reset the OTP request count and lock time
                await superadminHelpers.updateOtpRequest(req.body.senCurreSponDer);
            } else {
                // Too many OTP requests
                res.render('superadmin/templogin', { tomanyOTPAfterHour: true });
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

        await superadminHelpers.setRequestOtp(req.body.senCurreSponDer)
        
        res.render('superadmin/otp',{send_mail: req.body.senCurreSponDer});
        });
        return; // Exit the route handler to avoid further processing
    }

    req.body.Email = req.body.Email.trim()

    let otp_Requests_time = await superadminHelpers.getOtpRequestTime(req.body.Email);
    let OTP_LOCK_TIME = otp_Requests_time ? otp_Requests_time.opt_lock_time: null
    let currentTime = new Date();
    let lockTimeElapsed = OTP_LOCK_TIME ? (currentTime - new Date(OTP_LOCK_TIME)) / (1000 * 60 * 60) : 0; // Difference in hours

    if (lockTimeElapsed >= 1) {
    // Reset the OTP request count and lock time
    await superadminHelpers.updateOtpRequest(req.body.Email);
    }

    if (lockTimeElapsed >= 1 || OTP_LOCK_TIME == null) {

        const response = await superadminHelpers.doSuperAdminLogin(req.body);
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

            await superadminHelpers.setRequestOtp(req.body.Email);

            req.session.otp = otp;
            req.session.Pm$p_SAU$Ar = response.superadmin; // Temporarily store user data
            res.render('superadmin/otp',{send_mail: req.body.Email});
            return
            });

        } else if (response.locked) {
            req.session.superadminLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
            res.render('superadmin/superadminlogin', { "SuperLoginERROR": req.session.superadminLoginErr });
            return;
        } else {
            req.session.superadminLoginErr = response.attemptsLeft !== undefined
                ? `Invalid Username or Password. ${response.attemptsLeft} attempts left.`
                : "Invalid Username or Password";
            res.render('superadmin/superadminlogin', { "SuperLoginERROR": req.session.superadminLoginErr });
            return;
        }

    } else{
        let date = new Date(OTP_LOCK_TIME);
        date.setTime(date.getTime() + 3600000); // 3600000 ms = 1 hour
        let now = new Date();
        let timeDifference = date - now; // difference in milliseconds
        let minutesLeft = Math.floor(timeDifference / 60000); // convert to minutes
        res.render('superadmin/templogin',{tomanyOTP: true, minutesLeft})
        return
      }
    } catch (error) {
        console.error("An error occurred during super admin login:", error);
        req.session.superadminLoginErr = "An error occurred during login. Please try again.";
        res.render('superadmin/superadminlogin', { "SuperLoginERROR": req.session.superadminLoginErr });
    }
});


router.post('/verify-otp', async(req, res, next) => {
    try {
      const { otp } = req.body;
      
      if (req.session.otp === otp) {
        req.session.superadminLoggedIn = true;
        req.session.superadmin = req.session.Pm$p_SAU$Ar; // Transfer the user details
        
        delete req.session.otp;
        delete req.session.Pm$p_SAU$Ar; // Clean up temp user data
        await superadminHelpers.updateOtpRequest(req.session.superadmin.Email);
        
        res.redirect('/superadmin/superadmin-view-page');
      } else {
        res.status(400).send('Invalid OTP');
      }
    } catch (error) {
      console.error('Error during OTP verification:', error);
      next(error); // Pass the error to the next middleware (error handler)
    }
});*/


router.get('/superadminlogout', async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          req.session.destroy(async err => {
              if (err) {
                  console.error("Error destroying session:", err);
              } else {
                  res.redirect('/superadmin');
                  return;
              }
          });
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred during super admin logout:", error);
      res.status(500).send("An error occurred during logout. Please try again.");
  }
});


router.post('/superadmin_view_profile', verifyLogin, async (req, res) => {
    try {
        let view = req.body.profileId;
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            const profile = await adminHelpers.getProfileForViewProfile(view);
            res.render('superadmin/super_admin_view_profile', {showSuperAdminHeader1: true, profile, saber});
            return;
          } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while fetching or rendering profile:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get('/view_admin_logged_time', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.getAdminLogged_1228_Data();
          let FdataPassed = dataPassed.map(log => {
              const date = new Date(log.loggedIN || log.loggedOUT); // Use the correct key based on your data
              const formattedDate = date.toLocaleString('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true // Change to false if you prefer 24-hour format
              });
              return `${log.loggedIN ? 'Logged In' : 'Logged Out'}: ${formattedDate}`;
          });
          res.render('superadmin/view_admin_logged_time', { showSuperAdminHeader1: true, saber, FdataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering logged time data:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_deleted_candidate', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminDeletedCandidates();
          res.render('superadmin/view_admin_deleted_candidate', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted candidate data:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_updated_user_status', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminUpdatedUserStatus();
          res.render('superadmin/view_admin_updated_user_status', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering updated user status data:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_cleared_user_records', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            let dataPassed = await superadminHelpers.ViewAdminClearedUserRecord();
            res.render('superadmin/view_admin_cleared_user_records', { showSuperAdminHeader1: true, saber, dataPassed });
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while fetching or rendering cleared user data:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get('/admin_viewed_deleted_groupchat_log', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.AdminViewedDeletedGroupChat();
          
          // Assuming dataPassed contains the provided array of objects
          let FdataPassed = dataPassed.map(log => {
              const date = new Date(log.viewedAt);
              const formattedDate = date.toLocaleString('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true // Change to false if you prefer 24-hour format
              });
              return `Viewed At: ${formattedDate}`;
          });

          res.render('superadmin/admin_viewed_deleted_groupchat_log', { showSuperAdminHeader1: true, saber, FdataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted group chat log:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/admin_viewed_deleted_private_chat_log', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.AdminViewed1Deleted2Private2Chat8();
          res.render('superadmin/admin_viewed_deleted_private_chat_log', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted private chat log:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_deleted_jobs', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminDeletedJobs();
          res.render('superadmin/view_admin_deleted_jobs', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted jobs:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_deleted_internship_requests', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminDeletedInternshipRequests();
          res.render('superadmin/view_admin_deleted_internship_requests', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted internship requests:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_deleted_mentor_questions', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminDeletedMentorQuestions();
          res.render('superadmin/view_admin_deleted_mentor_questions', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted mentor questions:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_deleted_mentor_replies', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminDeletedMentorReplies();
          res.render('superadmin/view_admin_deleted_mentor_replies', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted mentor replies:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_addednew_users', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminAddNewUser();
          res.render('superadmin/view_admin_addednew_users', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering added new users:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_edited_profile', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminEditedProfile1228();
          res.render('superadmin/view_admin_edited_profile', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering edited profile data:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_updated_profile', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminUpdatedProfile();
          res.render('superadmin/view_admin_updated_profile', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering updated profile data:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_edited_user_password', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.ViewAdminEditedUserPassword();
          res.render('superadmin/view_admin_edited_user_password', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering edited user password data:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/admin_view_user_password_update_log', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.AdminoneViewtwoUsertwoPasswordeightUpdateLog();
          res.render('superadmin/admin_view_user_password_update_log', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering user password update log:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/admin_view_user_logged_log', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.AdminViewUserLoggedLog();
          res.render('superadmin/admin_view_user_logged_log', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering user logged log:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/admin_deleted_posts', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let dataPassed = await superadminHelpers.AdminDeletedPosts();
          res.render('superadmin/admin_deleted_posts', { showSuperAdminHeader1: true, saber, dataPassed });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while fetching or rendering deleted posts:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/superadmin_special_force', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/superadmin_special_force', { showSuperAdminHeader1: true, saber });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while rendering superadmin special force page:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/change_admin_password', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/change_admin_password', { showSuperAdminHeader1: true, saber });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while rendering change admin password page:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/block_admin_activities', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let block_Stat = await superadminHelpers.BlgetAdminBlockStat();
          let STST = block_Stat.BlockEnabled;
          let OPPSTST = !STST;
          res.render('superadmin/block_admin_activities', { showSuperAdminHeader1: true, saber, OPPSTST });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while rendering block admin activities page:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/change_admin_password', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let permission_grant = await superadminHelpers.fetchPower_one_2_two_8_TransferStateSuperAdmin();
          
          if (permission_grant.powerTransferEnabled === true) {
              let response = await superadminHelpers.updateAdminPass(req.body);
              
              if (response.status) {
                  res.redirect('/superadmin/superadmin_special_force');
                  return;
              } else {
                  res.render('superadmin/change_admin_password', { showSuperAdminHeader1: true, saber, invalid: true });
                  return;
              }
          } else {
              res.render('superadmin/permission_denied_admin', { showSuperAdminHeader1: true, saber });
              return;
          }
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("An error occurred while processing admin password change:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/block_admin_activities', async (req, res) => {
  if (req.session && req.session.superadmin) {
      try {
          await superadminHelpers.BlockAdminActivities();
          res.json({ success: true });
          return;
      } catch (error) {
          res.status(500).json({ success: false, error: error.message });
      }
  } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
  }
});


router.get('/superadmin_search_user', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/searchUser', {
              showSuperAdminHeader1: true,
              saber
          });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in superadmin_search_user route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/searchUser', async (req, res, next) => {
  try {
      if (req.session && req.session.superadmin) {
          let Name = req.body.searchName;
          let saber = req.session.superadmin;
          let usersAll = await userHelpers.GetUserThroughSearch(Name);
          res.render('superadmin/searchUser', { showSuperAdminHeader1: true, saber, usersAll });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in searchUser route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/more_advance_search', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/more_advance_search', {
              showSuperAdminHeader1: true,
              saber
          });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in more_advance_search route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search_by_passoutyear', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/searchPassout', {
              showSuperAdminHeader1: true,
              saber
          });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_passoutyear route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search_by_passoutyear', async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let passout = req.body.searchPassout;
          let usersAll = await userHelpers.GetUserPassoutThroughSearch(passout);
          res.render('superadmin/searchPassout', { showSuperAdminHeader1: true, saber, usersAll });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_passoutyear POST route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search_by_location', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/searchLocation', { showSuperAdminHeader1: true, saber });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_location route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search_by_location', async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let location = req.body.searchLocation;
          let usersAll = await userHelpers.GetUserLocationThroughSearch(location);
          res.render('superadmin/searchLocation', { showSuperAdminHeader1: true, saber, usersAll });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_location POST route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search_by_domain', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/searchDomain', { showSuperAdminHeader1: true, saber });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_domain GET route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search_by_domain', async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          let domain = req.body.searchDomain;
          let usersAll = await userHelpers.GetUserDomainThroughSearch(domain);
          res.render('superadmin/searchDomain', { showSuperAdminHeader1: true, saber, usersAll });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_domain POST route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/search_by_filter', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.superadmin) {
          let saber = req.session.superadmin.Name;
          res.render('superadmin/search_by_filter', {
              showSuperAdminHeader1: true,
              saber
          });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_filter GET route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.post('/search_by_filter', async (req, res, next) => {
  try {
      if (req.session && req.session.superadmin) {
        let saber = req.session.superadmin.Name;
          let filter = req.body;
          let usersAll = await userHelpers.GetFilteredUsersThroughSearch(filter);
          res.render('superadmin/search_by_filter', { showSuperAdminHeader1: true, saber, usersAll });
          return;
      } else {
          res.redirect('/superadmin');
          return;
      }
  } catch (error) {
      console.error("Error in search_by_filter POST route:", error);
      res.status(500).send("An error occurred while processing your request.");
  }
});


router.get('/view_admin_restricted_groupchat', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            let dataPassed = await superadminHelpers.ViewAdminRestrictedGroupchat();
            res.render('superadmin/view_admin_restricted_groupchat', { showSuperAdminHeader1: true, saber, dataPassed });
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while fetching or rendering restricted  groupchat users :", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get('/view_admin_restricted_user', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            let dataPassed = await superadminHelpers.ViewAdminRestrictedUser();
            res.render('superadmin/view_admin_restricted_user', { showSuperAdminHeader1: true, saber, dataPassed });
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while fetching or rendering restricted users:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get('/superadmin_guideline', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            res.render('superadmin/help_guideline', { showSuperAdminHeader1: true, saber });
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred viewing guidelines", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


  router.get('/view_admin_deleted_post_comments', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            let dataPassed = await superadminHelpers.ViewAdminDeletedPostComments();
            res.render('superadmin/view_admin_deleted_post_comments', { showSuperAdminHeader1: true, saber, dataPassed});
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while rendering  admin deleted post comments:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
  });


  router.get('/view_admin_deleted_post_comment_replies', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let saber = req.session.superadmin.Name;
            let dataPassed = await superadminHelpers.ViewAdminDeletedPostCommentReplies();
            res.render('superadmin/view_admin_deleted_post_comment_replies', { showSuperAdminHeader1: true, saber, dataPassed});
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while rendering  admin deleted post comment replies:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
  });


  router.post('/superadmin_view_deleted_post_comment', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let postid = req.body.postID;
            let commentid = req.body.commentID;
            let dataPassed = await superadminHelpers.ViewDetailAdminDeletedPostComment(postid, commentid);
            res.json({ dataPassed});
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while retrieving  admin deleted post comment details:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
  });


  router.post('/superadmin_view_deleted_post_comment_reply', verifyLogin, async (req, res) => {
    try {
        if (req.session && req.session.superadmin) {
            let postid = req.body.postID;
            let commentid = req.body.commentID;
            let replyid = req.body.replyID;
            let dataPassed = await superadminHelpers.ViewDetailAdminDeletedPostCommentReply(postid, commentid, replyid);
            res.json({ dataPassed});
            return;
        } else {
            res.redirect('/superadmin');
            return;
        }
    } catch (error) {
        console.error("An error occurred while retrieving admin deleted post comment repliy details:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
  });




module.exports = router;
