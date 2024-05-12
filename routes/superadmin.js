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
const verifyLogin = (req,res,next)=>{
  if(req.session.superadminLoggedIn){
    next()
  }else{
    res.redirect('/superadmin')
  }
}

router.get('/', function(req, res, next) {
  res.render('superadmin/super_login_button')
});

router.get('/superadmin-view-page',async (req,res)=>{
    if(req.session.superadminLoggedIn){
      saber = req.session.superadmin
      let superadminId = req.session.superadmin._id;
      res.render('superadmin/superadmin-view-page',{showSuperAdminHeader1 : true,saber})
    }else{
      res.render('superadmin/superadminlogin')
      req.session.superadminLoginErr = false
    }
  })

  router.post('/superadminlogin', (req, res) => {
    superadminHelpers.doSuperAdminLogin(req.body).then((response) => {
      if (response.status) {
        req.session.superadminLoggedIn = true;
        req.session.superadmin = response.superadmin;
        res.redirect('/superadmin/superadmin-view-page');
      } else {
        req.session.superadminLoginErr = "Invalid Username or Password";
        res.render('superadmin/superadminlogin',{"SuperLoginERROR":req.session.superadminLoginErr});
      }
    });
  });
  
  router.get('/superadminlogout', async (req, res) => {
    if (req.session && req.session.superadmin) {
      let superadminId = req.session.superadmin._id;
      req.session.destroy(async err => {
        if (err) {
          console.log(err);
        } else {
          res.redirect('/superadmin');
        }
      });
    }else {
      res.redirect('/superadmin');
    }
  });


  router.get('/superadmin_view_profile/:id', verifyLogin, async (req, res) => {
    let profileCheck = null;
    let view = req.params.id;
    if (req.session && req.session.superadmin) {
      let saber = req.session.superadmin;
      if(saber != view){
        profileCheck
      }
      const profile = await superadminHelpers.BasicSupergetProfile(view);
      let working = null;
      let owns = null;
      const empStatus = profile.employmentStatus;
      if (empStatus == "working") {
        working = true;
      } else if (empStatus == "ownCompany") {
        owns = true;
      }
      let checkNote = null;
      let NoNote = null;
      let note = profile.Note;
      if (!note || note.trim() === "") {
        NoNote = true;
      } else {
        checkNote = true;
      }
      res.render('superadmin/super_admin_view_profile', {profileCheck, showSuperAdminHeader1: true, profile, saber, working, owns,NoNote,checkNote});
    } else {
      res.redirect('/superadmin')
    }
  })
  

  router.get('/view_admin_logged_time',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.getAdminLoggedData()
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
      res.render('superadmin/view_admin_logged_time',{showSuperAdminHeader1: true,saber,FdataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_deleted_candidate',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminDeletedCandidates()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_deleted_candidate',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_updated_user_status',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminUpdatedUserStatus()
      console.log("DATA : ",dataPassed)
      res.render('superadmin/view_admin_updated_user_status',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/admin_viewed_deleted_groupchat_log',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.AdminViewedDeletedGroupChat()
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
      res.render('superadmin/admin_viewed_deleted_groupchat_log',{showSuperAdminHeader1: true,saber,FdataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/admin_viewed_deleted_private_chat_log',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.AdminViewedDeletedPrivateChat()
      console.log("DATA :",dataPassed)
      res.render('superadmin/admin_viewed_deleted_private_chat_log',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_deleted_jobs',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminDeletedJobs()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_deleted_jobs',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_deleted_internship_requests',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminDeletedInternshipRequests()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_deleted_internship_requests',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_deleted_mentor_questions',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminDeletedMentorQuestions()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_deleted_mentor_questions',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_deleted_mentor_replies',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminDeletedMentorReplies()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_deleted_mentor_replies',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_addednew_users',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminAddNewUser()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_addednew_users',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_edited_profile',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminEditedProfile()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_edited_profile',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_updated_profile',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminUpdatedProfile()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_updated_profile',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/view_admin_edited_user_password',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.ViewAdminEditedUserPassword()
      console.log("DATA :",dataPassed)
      res.render('superadmin/view_admin_edited_user_password',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/admin_view_user_password_update_log',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.AdminViewUserPasswordUpdateLog()
      console.log("DATA :",dataPassed)
      res.render('superadmin/admin_view_user_password_update_log',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/admin_view_user_logged_log',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.AdminViewUserLoggedLog()
      console.log("DATA :",dataPassed)
      res.render('superadmin/admin_view_user_logged_log',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/admin_deleted_posts',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let dataPassed = await superadminHelpers.AdminDeletedPosts()
      console.log("DATA :",dataPassed)
      res.render('superadmin/admin_deleted_posts',{showSuperAdminHeader1: true,saber,dataPassed})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/superadmin_special_force',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      res.render('superadmin/superadmin_special_force',{showSuperAdminHeader1: true,saber})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/change_admin_password',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      res.render('superadmin/change_admin_password',{showSuperAdminHeader1: true,saber})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.get('/block_admin_activities',verifyLogin,async(req,res)=>{
    if (req.session && req.session.superadmin) {
      let saber=req.session.superadmin;
      let block_Stat = await superadminHelpers.BlgetAdminBlockStat()
      console.log("BLOCK STATUS : ",block_Stat)
      let STST = block_Stat.BlockEnabled
      let OPPSTST = !STST
      res.render('superadmin/block_admin_activities',{showSuperAdminHeader1: true,saber,OPPSTST})
    }else {
      res.redirect('/superadmin');
    }
  })

  router.post('/change_admin_password', verifyLogin, async (req, res) => {
    if (req.session && req.session.superadmin) {
        let saber = req.session.superadmin;
        permission_grant = await superadminHelpers.fetchPowerTransferStateSuperAdmin();
        console.log("ATTORNEY GENERAL : ", permission_grant.powerTransferEnabled)
        if (permission_grant.powerTransferEnabled === true) {
          let response = await superadminHelpers.updateAdminPass(req.body);
          if (response.status) {
            res.redirect('/superadmin/superadmin_special_force');
            console.log("admin password updated successfully");
          } else {
            res.render('superadmin/change_admin_password', { showSuperAdminHeader1: true,saber, invalid: true });
            console.log("admin password update failed");
          }
        } else {
            res.render('superadmin/permission_denied_admin', { showSuperAdminHeader1: true, saber });
        }
    } else {
        res.redirect('/superadmin');
    }
});

router.post('/block_admin_activities', async (req, res) => {
  if (req.session && req.session.superadmin) {
      try {
        console.log("REACHED SUPERADMIN")
          const result = await superadminHelpers.BlockAdminActivities();
          res.json({ success: true});
      } catch (error) {
          res.status(500).json({ success: false, error: error.message });
      }
  } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
  }
});

module.exports = router;