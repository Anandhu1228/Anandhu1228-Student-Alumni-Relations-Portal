var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const userHelpers = require('../helpers/user-helpers');
const session = require('express-session');
const { log } = require('handlebars');
const { spawnSync } = require('child_process');
const { response } = require('../app');
const { Console } = require('console');
const { getBasicProfile } = require('../helpers/admin-helpers');
const verifyLogin = (req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}


router.get('/',async function (req, res, next) {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
    let uber=req.session.user;
    let userId = req.session.user._id;
    let logged_in = true
    console.log("ROOT HAVE BEEN CALLED")


      //   ALL NOTIFICATION COUNT BELOW

    const timestamp = new Date();

    let postcount = await userHelpers.getAllNewOtherpostUpdateNotification(userId,timestamp);
    let post_notif = false;
    if(postcount != 0){
      post_notif = true
    }


    let existinglikecount = await userHelpers.getAllNewOwnpostLikeNotification(userId);
    let currentlikecount = await userHelpers.getAllNewCurrentOwnpostLikeNotification(userId);
    let increasedIds = []
    existinglikecount.forEach(existingPost => {
      const currentPost = currentlikecount.find(post => post._id === existingPost._id);
      if (currentPost && currentPost.likeCount > existingPost.likeCount) {
          increasedIds.push(existingPost._id);
      }
    });
    let like_notify_number = increasedIds.length
    let like_notif = false;
    if(like_notify_number != 0){
      like_notif = true
    }


    let existing_groupchat_count = await userHelpers.getExistingGroupChatCount(userId)
    let current_groupchat_count = await userHelpers.getAllNewGroupchatNotification();
    let groupchatcount = (current_groupchat_count - existing_groupchat_count);
    let groupchat_notif = false;
    if(groupchatcount != 0){
      groupchat_notif = true
    }


    let interncount = 0;
    if (req.session.user.Status == "Alumni") {
        interncount = await userHelpers.getAllNewInternsNotification(userId, timestamp);
    }
    let intern_notif = false;
    if(interncount != 0){
      intern_notif = true
    }


    let mentorcount = await userHelpers.getAllNewMentorNotification(userId,timestamp);
    let mentor_notif = false;
    if(mentorcount != 0){
      mentor_notif = true
    }


    let jobcount = await userHelpers.getAllNewJobNotification(userId,timestamp);
    let job_notif = false;
    if(jobcount != 0){
      job_notif = true
    }


    let upassCountDiffData = await userHelpers.getUpassDiffCount(userId);
    let upassCountDiff = upassCountDiffData.difference;
    let upassCountStatus = upassCountDiffData.upassConfirm;
    let upass_diff = false;
    if((upassCountDiff != 0) && (upassCountStatus != true)){
      upass_diff = true;
    }


    let adminViewCheckStat = await userHelpers.getAdminViewDelMessStatCount(userId);
    let adminViewCheckStatLength = adminViewCheckStat.length
    let adminViewConsentPending = null;
    if(adminViewCheckStatLength>0){
      adminViewConsentPending = true;
    }


    let current_rec_mess = await userHelpers.getAllReceivedMessage(userId);
    let existing_rec_mess = await userHelpers.getAllReceivedExistingMessage(userId);
    let currentSum = current_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let existingSum = existing_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let total_new_mess = currentSum - existingSum;// TOTAL NUMBER OF NEW MESSAGES
    let new_mess_notif = false;
    if(total_new_mess != 0){
      new_mess_notif = true
    }
    let newmessages = []; // NEW MESSENGERS ID
    current_rec_mess.forEach(current => {
        let existing = existing_rec_mess.find(existing => existing.Reciever_Id === current.Reciever_Id);
        if (!existing || current.count > existing.count) {
            newmessages.push(current.Reciever_Id);
        }
    });
    let mess_count_notify_number = newmessages.length;// NUMBER OF NEW MESSENGERS
    let new_messenger_count_notif = false;
    if(mess_count_notify_number != 0){
      new_messenger_count_notif = true
    }


    let current_Admin_rec_mess = await userHelpers.getAllAdminReceivedMessage(userId);
    let existing_Admin_rec_mess = await userHelpers.getAllAdminReceivedExistingMessage(userId);
    let currentAdminSum = current_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let existingAdminSum = existing_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let total_new_Admin_mess = currentAdminSum - existingAdminSum;
    let new_admin_mess_notif = false;
    if(total_new_Admin_mess != 0){
      new_admin_mess_notif = true
    }


    let last_broad_time = await userHelpers.getLastBroadTime()
    let last_broad_entry_time = await userHelpers.getLastBroadEntryTime(userId)
    let admin_broadcast = 0;
    if (last_broad_time !== null) {
      if (last_broad_entry_time === null || last_broad_entry_time < last_broad_time) {
        admin_broadcast = 1;
      }
    }
  let new_admin_broad_notif = false;
  if(admin_broadcast != 0){
    new_admin_broad_notif = true
  }


    let existing_view_profile_viewers = await userHelpers.getExistingViewViewerCount(userId)
    let current_view_profile_viewers = await userHelpers.getCurrentViewViewerCount(userId)
    let new_view_user_count = current_view_profile_viewers - existing_view_profile_viewers;
    let new_view_notif = false;
    if(new_view_user_count != 0){
      new_view_notif = true
    }


    let myExistingMentorQuestions = await userHelpers.getSenderMentors(userId)
    let differenceMentorQuestionReply = await userHelpers.getdifferenceMentorQuestionReply(myExistingMentorQuestions)
    let newReplieObtainedQuestions = differenceMentorQuestionReply.result;
    let mentorQuestionNumbers = newReplieObtainedQuestions.length;
    let totalNewRepliesMentors = differenceMentorQuestionReply.differentSum;
    let new_mentor_reply_notif = false;
    if(totalNewRepliesMentors != 0){
      new_mentor_reply_notif = true
    }


    await userHelpers.storeNotification
    (
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
      new_view_notif,upass_diff,
      adminViewCheckStat,
      adminViewCheckStatLength,
      adminViewConsentPending,
      newReplieObtainedQuestions,
      mentorQuestionNumbers,
      new_mentor_reply_notif
    )


    let total_notify_number = ( mess_count_notify_number + jobcount+mentorcount
     + interncount + groupchatcount + like_notify_number + postcount + 
      total_new_Admin_mess + admin_broadcast + new_view_user_count + upassCountDiff
       + adminViewCheckStatLength + totalNewRepliesMentors)

    let total_message = ( total_new_mess + admin_broadcast )

    //await userHelpers.updateBadgeCount(total_notify_number,total_message,groupchatcount,userId)
    req.session.total_notify_number = total_notify_number;
    req.session.total_message = total_message;
    req.session.groupchatcount = groupchatcount;

      //   ALL NOTIFICATION COUNT ABOVE
      


    let loginCount = await userHelpers.countLogins(userId);
    if (loginCount % 3 === 0) {
      let updatePush = await userHelpers.getUpdateProfilePushSettings(userId);
      if (!updatePush.location || !updatePush.passoutYear || !updatePush.empStatus) {
          res.render('user/view-page', 
          { 
            user: true, 
            showHeader1: true, 
            showHeader2: true, 
            uber, showPopup: true,
            logged_in,
            total_notify_number,
            total_message,groupchatcount
          });
          return;
      }
    }
    if (loginCount % 5 === 0) {
      let updateExperience = await userHelpers.getUpdateProfilePushInProfileExperienceSettings(userId);
      if(!updateExperience.experience){
        res.render('user/view-page', 
        { 
          user: true, 
          showHeader1: true, 
          showHeader2: true, 
          uber, showExperiencePopup: true,
          logged_in,
          total_notify_number,
          total_message,groupchatcount
        });
      }
    }
    if (loginCount % 4 === 0) {
      let updateDomain = await userHelpers.getUpdateProfilePushInProfileDomainSettings(userId);
      if(!updateDomain.domain){
        res.render('user/view-page', 
        { 
          user: true, 
          showHeader1: true, 
          showHeader2: true, 
          uber, showDomainPopup: true,
          logged_in,
          total_notify_number,
          total_message,groupchatcount
        });
      }
    }

    res.render('user/view-page', 
    { 
      user: true, 
      showHeader1: true, 
      showHeader2: true, 
      uber,logged_in,
      total_notify_number,
      total_message,groupchatcount
    });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }
  else {
    res.render('user/view-page', { showHeader1: true});
  }
});



router.get('/login',(req,res)=>{
  if(req.session.userLoggedIn){
    res.redirect('/')
  }else{
    res.render('user/login',{"LoginERROR":req.session.userLoginErr})
    req.session.userLoginErr = false
  }
})

router.post('/login', async (req, res) => {
  try {
    const response = await userHelpers.doLogin(req.body);
    if (response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      let userId = req.session.user._id;
      let user_iD = userId.toString();
      await userHelpers.insertloggedINTime(user_iD);
      res.redirect('/');
    } else {
      req.session.userLoginErr = "Invalid Username or Password";
      res.redirect('/login');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/logout', async (req, res) => {
  if (req.session && req.session.user) {
    let userId = req.session.user._id;
    req.session.destroy(async err => {
      if (err) {
        console.log(err);
      } else {
        await userHelpers.insertloggedOUTTime(userId);
        res.redirect('/login');
      }
    });
  }else {
    res.redirect('/login');
  }
});


router.get('/signup',(req,res)=>{
  res.render('user/signup',{ showHeader1: false,showHeader2: false})
})


router.post('/signup',async(req,res)=>{ 
  await userHelpers.doSignup(req.body)
  res.redirect('/login')
  })


router.get('/profile',verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user
      let jobs = await userHelpers.getEditJobDetails(req.session.user._id);
      let editjobbutton = null;
      let jobsCount = jobs.length;
      if(jobsCount>0){
        editjobbutton = true;
      }else if(jobsCount<=0){
        editjobbutton = false;
      }
      let interns = await userHelpers.getEditInternshipDetails(req.session.user._id);
      let editinternbutton = null;
      let internsCount = interns.length;
      if(internsCount>0){
        editinternbutton = true;
      }else if(internsCount<=0){
        editinternbutton = false;
      }
      
        const profile = await userHelpers.getProfile(req.session.user._id);
        let checkNote = null;
        let NoNote = null;
        let note = profile.Note;
        if (!note || note.trim() === "") {
          NoNote = true;
        } else {
          checkNote = true;
        }
        const isAlumni = profile.Status && profile.Status.toLowerCase() === 'alumni';
        res.render('user/profile', 
        { 
          showHeader1: true,
          showHeader2:true,
          showHeader3:true,
          user: req.session.user,
          profile,uber,isAlumni,
          editjobbutton,
          editinternbutton,
          checkNote,NoNote,
          groupchatcount,
          total_message,
          total_notify_number
        });
      } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login')
  }
})


router.get('/profile_viewers', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        const userId = req.session.user._id;
        let uber = req.session.user;
        let viewers = await userHelpers.getProfileViewers(userId);
        let viewDATA = [];

        // Check if viewers array is not empty
        if (viewers && viewers.length > 0) {
          for (const viewer of viewers) {
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
        let viewDataCOUNT = viewDATA.length
        res.render('user/profile_viewers', 
        { 
          viewDATA ,showHeader1: true, 
          showHeader2: true, uber,
          viewDataCOUNT,
          groupchatcount,
          total_message,
          total_notify_number
        });
      } else {
        res.render('user/view_page_disabled', { userId: req.session.user._id });
      }
    } else {
      res.redirect('/login');
    }
  } catch (err) {
    console.error("Error in profile_viewers route:", err);
    res.status(500).send("Internal Server Error");
  }
});



router.get('/add-note', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/add-note', { user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/add-note/:id',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.updateNote(req.params.id,req.body).then(()=>{
        res.redirect('/profile')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
      res.redirect('/login');
  }
})


router.get('/edit-profile', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/edit-profile', { user, gender: user.Gender });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/edit-profile',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userId = req.session.user._id;
      userHelpers.updateProfile(userId,req.body).then(()=>{
        res.redirect('/profile')
        if (req.files && req.files.Image) {
          let image = req.files.Image;
          image.mv('./public/user-images/' + userId + '.jpg');
        }
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
}else {
    res.redirect('/login');
  }
})


router.get('/updatepass', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/updatepass', { User: user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/updatepass', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userID = req.session.user._id;
      let User = await userHelpers.getProfileDetails(userID);
      try {
        let response = await userHelpers.updateUPass(User, req.body);
        if (response.status) {
          await userHelpers.updatePassCount(userID)
          await userHelpers.userPassUpdateDetailLog(userID);
          res.redirect('/edit-profile');
        } else {
          res.render('user/updatepass', { User, invalid: true }); // Pass invalid flag
        }
      } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).send("Internal Server Error");
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/recoverpass',async(req,res)=>{
  let User = await userHelpers.getProfileDetails()
  res.render('user/recoverpass',{User})
})


router.post('/recoverpass', async (req, res) => {
  userHelpers.doRecoveruserpass(req.body).then(async (response) => {
    if (response.status) {
      res.redirect('/login');
    } else {
      let User = await userHelpers.getProfileDetails();
      res.render('user/recoverpass', { User, invalid: true });
      console.log('Password mismatch');
    }
  });
});



router.get('/viewNotifications', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      console.log("VIEW NOTIFICATION TESTING WAS CALLED ")
      let uber = req.session.user;
      const userId = req.session.user._id;
      const admin_id = await userHelpers.getAdminID()




       //   ALL NOTIFICATION COUNT BELOW

    const timestamp = new Date();
    let postcount = await userHelpers.getAllNewOtherpostUpdateNotification(userId,timestamp);
    let post_notif = false;
    if(postcount != 0){
      post_notif = true
    }


    let existinglikecount = await userHelpers.getAllNewOwnpostLikeNotification(userId);
    let currentlikecount = await userHelpers.getAllNewCurrentOwnpostLikeNotification(userId);
    let increasedIds = []
    existinglikecount.forEach(existingPost => {
      const currentPost = currentlikecount.find(post => post._id === existingPost._id);
      if (currentPost && currentPost.likeCount > existingPost.likeCount) {
          increasedIds.push(existingPost._id);
      }
    });
    let like_notify_number = increasedIds.length
    let like_notif = false;
    if(like_notify_number != 0){
      like_notif = true
    }


    let existing_groupchat_count = await userHelpers.getExistingGroupChatCount(userId)
    let current_groupchat_count = await userHelpers.getAllNewGroupchatNotification();
    let groupchatcount = (current_groupchat_count - existing_groupchat_count);
    let groupchat_notif = false;
    if(groupchatcount != 0){
      groupchat_notif = true
    }


    let interncount = 0;
    if (req.session.user.Status == "Alumni") {
        interncount = await userHelpers.getAllNewInternsNotification(userId, timestamp);
    }
    let intern_notif = false;
    if(interncount != 0){
      intern_notif = true
    }


    let mentorcount = await userHelpers.getAllNewMentorNotification(userId,timestamp);
    let mentor_notif = false;
    if(mentorcount != 0){
      mentor_notif = true
    }


    let jobcount = await userHelpers.getAllNewJobNotification(userId,timestamp);
    let job_notif = false;
    if(jobcount != 0){
      job_notif = true
    }


    let upassCountDiffData = await userHelpers.getUpassDiffCount(userId);
    let upassCountDiff = upassCountDiffData.difference;
    let upassCountStatus = upassCountDiffData.upassConfirm;
    let upass_diff = false;
    if((upassCountDiff != 0) && (upassCountStatus != true)){
      upass_diff = true;
    }


    let adminViewCheckStat = await userHelpers.getAdminViewDelMessStatCount(userId);
    let adminViewCheckStatLength = adminViewCheckStat.length
    let adminViewConsentPending = null;
    if(adminViewCheckStatLength>0){
      adminViewConsentPending = true;
    }


    let current_rec_mess = await userHelpers.getAllReceivedMessage(userId);
    let existing_rec_mess = await userHelpers.getAllReceivedExistingMessage(userId);
    let currentSum = current_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let existingSum = existing_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let total_new_mess = currentSum - existingSum;// TOTAL NUMBER OF NEW MESSAGES
    let new_mess_notif = false;
    if(total_new_mess != 0){
      new_mess_notif = true
    }
    let newmessages = []; // NEW MESSENGERS ID
    current_rec_mess.forEach(current => {
        let existing = existing_rec_mess.find(existing => existing.Reciever_Id === current.Reciever_Id);
        if (!existing || current.count > existing.count) {
            newmessages.push(current.Reciever_Id);
        }
    });
    let mess_count_notify_number = newmessages.length;// NUMBER OF NEW MESSENGERS
    let new_messenger_count_notif = false;
    if(mess_count_notify_number != 0){
      new_messenger_count_notif = true
    }


    let current_Admin_rec_mess = await userHelpers.getAllAdminReceivedMessage(userId);
    let existing_Admin_rec_mess = await userHelpers.getAllAdminReceivedExistingMessage(userId);
    let currentAdminSum = current_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let existingAdminSum = existing_Admin_rec_mess.reduce((acc, curr) => acc + curr.count, 0);
    let total_new_Admin_mess = currentAdminSum - existingAdminSum;
    let new_admin_mess_notif = false;
    if(total_new_Admin_mess != 0){
      new_admin_mess_notif = true
    }


    let last_broad_time = await userHelpers.getLastBroadTime()
    let last_broad_entry_time = await userHelpers.getLastBroadEntryTime(userId)
    let admin_broadcast = 0;
    if (last_broad_time !== null) {
      if (last_broad_entry_time === null || last_broad_entry_time < last_broad_time) {
        admin_broadcast = 1;
      }
    }
  let new_admin_broad_notif = false;
  if(admin_broadcast != 0){
    new_admin_broad_notif = true
  }


    let existing_view_profile_viewers = await userHelpers.getExistingViewViewerCount(userId)
    let current_view_profile_viewers = await userHelpers.getCurrentViewViewerCount(userId)
    let new_view_user_count = current_view_profile_viewers - existing_view_profile_viewers;
    let new_view_notif = false;
    if(new_view_user_count != 0){
      new_view_notif = true
    }


    let myExistingMentorQuestions = await userHelpers.getSenderMentors(userId)
    let differenceMentorQuestionReply = await userHelpers.getdifferenceMentorQuestionReply(myExistingMentorQuestions)
    let newReplieObtainedQuestions = differenceMentorQuestionReply.result;
    let mentorQuestionNumbers = newReplieObtainedQuestions.length;
    let totalNewRepliesMentors = differenceMentorQuestionReply.differentSum;
    let new_mentor_reply_notif = false;
    if(totalNewRepliesMentors != 0){
      new_mentor_reply_notif = true
    }

    let total_notify_number = ( mess_count_notify_number + jobcount+mentorcount
      + interncount + groupchatcount + like_notify_number + postcount + 
       total_new_Admin_mess + admin_broadcast + new_view_user_count + upassCountDiff
        + adminViewCheckStatLength + totalNewRepliesMentors)

    let total_message = ( total_new_mess + admin_broadcast )
 

    req.session.total_notify_number = total_notify_number;
    req.session.total_message = total_message;
    req.session.groupchatcount = groupchatcount;
    await userHelpers.storeNotification
    (
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
      new_view_notif,upass_diff,
      adminViewCheckStat,
      adminViewCheckStatLength,
      adminViewConsentPending,
      newReplieObtainedQuestions,
      mentorQuestionNumbers,
      new_mentor_reply_notif
    )
    console.log("ROOT INSIDE NOTIFICATION CALLED. ")


      //   ALL NOTIFICATION COUNT ABOVE




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

      const promises = [];
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

      console.log("NOTIFICATION HAVE BEEN CALLED")
      res.render('user/view_notifications', 
      { 
        user: true, 
        showHeader1: true, 
        showHeader2: true, 
        uber ,firstNotification,
        remainingNotification,
        admin_id,total_notify_number,
        total_message,groupchatcount
      });
    } else {
      res.render('user/view_page_disabled', { userId: req.session.user._id });
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/add-skills', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/add-skills', { user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/add-skills/:id',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.updateskillProfile(req.params.id,req.body).then(()=>{
        res.redirect('/profile')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/edit-skills', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/edit-skills', { user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/edit-skills/:id',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.editskillProfile(req.params.id,req.body).then(()=>{
        res.redirect('/profile')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/add-experience', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/add-experience', { user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/add-experience/:id',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.updateexperienceProfile(req.params.id,req.body).then(()=>{
        res.redirect('/profile')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/edit-experience/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const experienceId = req.params.id;
      const userId = req.session.user._id;
      let experience = await userHelpers.getExperienceDetails(userId, experienceId);
      res.render('user/edit-experience', { experience });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/edit-experience/:id',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.updateExperience(req.session.user._id,req.params.id,req.body).then(()=>{
        res.redirect('/profile')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/delete-experience-form-profile',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deleteExperience(req.session.user._id,req.body.ExperiencE).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/update-profile', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/update-profile', { user, empstatus: user.employmentStatus });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/update-profile/:id',(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.updateuserProfile(req.params.id,req.body).then(()=>{
        res.redirect('/profile')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/internshipportal', verifyLogin, async(req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let userId = req.session.user._id
      let interns = await userHelpers.getInternDetails();

      let iblockList = await userHelpers.getindiBlockLogData(userId)
      let iwasblocklist = await userHelpers.getBlockedByUsers(userId)
      interns = interns.filter(intern => !iblockList.includes(intern.UserId));
      interns = interns.filter(intern => !iwasblocklist.includes(intern.UserId));

      let internsJson = await userHelpers.getDoc2VecInternModel();
      let uber = req.session.user
      const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedInters.py');
      //const pathToScript = '../main project/machine models/getSortedInters.py';
      const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(internsJson)], { encoding: 'utf-8' });
      const sortedInternships = pythonProcess.stdout;
      const machine_recommended = sortedInternships
        .split('\n')
        .map(entry => {
          const match = entry.match(/'userId': '([^']+)'/);
          return match ? match[1] : null;
        })
        .filter(userId => userId !== null);
        interns.sort((a, b) => {
          return machine_recommended.indexOf(a._id.toString()) - machine_recommended.indexOf(b._id.toString());
        });
      res.render('user/internshipportal', 
      { 
        interns, user: true, 
        showHeader1: true, 
        showHeader2: true, uber,
        groupchatcount,
        total_message,
        total_notify_number
       });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
})



router.get('/internship-details/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let indintern = await userHelpers.getIndividualInternshipDetails(req.params.id);
      let uber=req.session.user
      res.render('user/internship-details',
      {
        indintern,user:true,
        showHeader1: true,
        showHeader2: true,uber,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/delete-internship-form-portal',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deleteInternship(req.body.InterN).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/edit-internship/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const internshipId = req.params.id;
      let intern = await userHelpers.getIndividualInternshipDetail(internshipId);
      res.render('user/edit-internship', { intern });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/edit-internship/:id',async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userdetail = await userHelpers.findUserIdFromInternshipId(req.params.id)
      userHelpers.updateInternship(req.params.id,req.body).then(()=>{
        res.redirect('/review-apply-internship/')
        let image = req.files ? req.files.ProfilePicture : null;
          if (image) {
            const imageFileName = req.params.id + '.jpg';
            image.mv('./public/internship-folder/profile-pictures/' + imageFileName);
        }
          let resume = req.files ? req.files.resume : null;
          if (resume) {
              const resumeFileName = req.params.id + path.extname(resume.name);
              resume.mv('./public/internship-folder/resumes/' + resumeFileName);
          }
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/addintern', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/addintern', { user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/addintern/:id', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      const userDatas = { ...req.body, UserId: req.params.id };
      console.log(userDatas);
      try {
        const insertedInternId = await userHelpers.addIntern(userDatas);

        let image = req.files ? req.files.ProfilePicture : null;
        if (image) {
          const imageFileName = insertedInternId + '.jpg';
          image.mv('./public/internship-folder/profile-pictures/' + imageFileName);
          await userHelpers.updateInternProfilePicture(insertedInternId, imageFileName);
        }

        let resume = req.files ? req.files.resume : null;
        if (resume) {
          const resumeFileName = insertedInternId + path.extname(resume.name);
          resume.mv('./public/internship-folder/resumes/' + resumeFileName);
          await userHelpers.updateInternResume(insertedInternId, resumeFileName);
        }

        res.redirect('/profile');
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      res.render('user/view_page_disabled', { userId: req.session.user._id });
    }
  } else {
    res.redirect('/login');
  }
});



router.get('/review-apply-internship', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      const userId = req.session.user._id;
      let internsdata = await userHelpers.getEditInternshipDetails(userId);
      let uber = req.session.user;
      res.render('user/review-apply-internship', 
      { 
        internsdata, user: true, 
        showHeader1: true, 
        showHeader2: true, uber,
        groupchatcount,
        total_message,
        total_notify_number
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/jobportal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user
      let userId = req.session.user._id;
      let jobs = await userHelpers.getJobDetails();

      let iblockList = await userHelpers.getindiBlockLogData(userId)
      let iwasblocklist = await userHelpers.getBlockedByUsers(userId)
      jobs = jobs.filter(job => !iblockList.includes(job.UserId));
      jobs = jobs.filter(job => !iwasblocklist.includes(job.UserId));

      let jobsjson = await userHelpers.getDoc2VecJobModel();
      const pathToScript = path.join(__dirname, '..', 'machine models', 'getSortedJobs.py');
      const pythonProcess = spawnSync('python', [pathToScript, userId, JSON.stringify(jobsjson)], { encoding: 'utf-8' });
      const sortedJobs = pythonProcess.stdout;
      const machine_recommended = sortedJobs
      .split('\n')
        .map(entry => {
          const match = entry.match(/'userId': '([^']+)'/);
          return match ? match[1] : null;
        })
        .filter(userId => userId !== null);

        jobs.forEach(job => {
            if (job.requests && job.requests.includes(userId.toString())) {
                job.requested = true;
                job.not_requested = false;
            } else {
                job.requested = false;
                job.not_requested = true;
            }
        });


        jobs.sort((a, b) => {
          return machine_recommended.indexOf(a._id.toString()) - machine_recommended.indexOf(b._id.toString());
        });
      res.render('user/jobportal', 
      { 
        jobs,user:true,
        showHeader1: true,
        showHeader2: true,
        uber,userId,machinesort:true,
        groupchatcount,
        total_message,
        total_notify_number
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});

router.get('/job_portal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user
      let userId = req.session.user._id;
      let jobs = await userHelpers.getJobDetails();

      let iblockList = await userHelpers.getindiBlockLogData(userId)
      let iwasblocklist = await userHelpers.getBlockedByUsers(userId)
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
        jobs,user:true,
        showHeader1: true,
        showHeader2: true,
        uber,userId,timesort:true,
        groupchatcount,
        total_message,
        total_notify_number
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/view-profile/:id', verifyLogin, async (req, res) => {
  let profileCheck = null;
  let view = req.params.id;
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber = req.session.user;
      if(uber != view){
        profileCheck
      }
      let user = req.session.user._id;
      const profile = await userHelpers.getProfile(view);

      let iblockList = await userHelpers.getindiBlockLogData(user)
      let iwasblocklist = await userHelpers.getBlockedByUsers(user)

      let iBlocked = iblockList.includes(view);
      let iWasBlocked = iwasblocklist.includes(view);
      let NoBlock = !(iBlocked || iWasBlocked);

      let isAlumni = null;
      let isStudent = null;
      let hasAdmissionYear = null;
      let hasPassyear = null;
      let hasExperience = null;
      let hasDomain = null;
      hasLocation = null;
      if(profile.Status == "Alumni"){
        isAlumni = true;
      }
      if(profile.Status == "Student"){
        isStudent = true;
      }
      if(profile.AdmissionYear != ""){
        hasAdmissionYear = true;
      }
      if(profile.passoutYear && profile.passoutYear != ""){
        hasPassyear = true;
      }
      if(profile.experience && profile.experience != []){
        hasExperience = true;
      }
      if(profile.workDomains && profile.workDomains != []){
        hasDomain = true;
      }
      if(profile.currentLocation && profile.currentLocation != ""){
        hasLocation = true;
      }

      let activeSTAT = profile.activeStatus;
      let ACTIVE = null;
      let INACTIVE = null;
      if (activeSTAT === "active") {
          ACTIVE = true;
          INACTIVE = false;
      } else if (activeSTAT === "inactive") {
          INACTIVE = true;
          ACTIVE= false;
      }

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
      if(ACTIVE){
        if(iBlocked){
          res.render('user/view_low_profile',
          {
            iBlocked,showHeader1: true,
            showHeader2: true,
            profile,uber,
            isAlumni,isStudent,
            hasAdmissionYear,
            hasPassyear,
            groupchatcount,
            total_message,
            total_notify_number
          })
        }else if(iWasBlocked){
          res.render('user/view_low_profile',
          {
            iWasBlocked,
            showHeader1: true,
            showHeader2: true,
            profile,uber,
            isAlumni,isStudent,
            hasAdmissionYear,
            hasPassyear,
            groupchatcount,
            total_message,
            total_notify_number
          })
        }else if(NoBlock){
          if(view != user){
            await userHelpers.addViewProfile(view,user);
          }
          res.render('user/view-profile', 
          {
            profileCheck, showHeader1: true,
            showHeader2: true, 
            user: req.session.user, 
            profile, uber, working,
            owns,NoNote,
            checkNote ,isAlumni,
            isStudent,hasAdmissionYear,
            hasPassyear,hasExperience,
            hasDomain,hasLocation,
            groupchatcount,
            total_message,
            total_notify_number
          });
        }
      }else if(INACTIVE){
        res.render('user/view_profile_disabled')
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login')
  }
})


router.get('/addjob', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let user = await userHelpers.getProfileDetails(userId);
      res.render('user/addjob', { user });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/view-edit-delete-jobs', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      const userId = req.session.user._id;
      let jobs = await userHelpers.getEditJobDetails(userId);
      for (const job of jobs) {
        const imagePath = path.join(__dirname, '../public/job-images/', `${job._id}.jpg`);
        job.jobImage = fs.existsSync(imagePath);
      }
      console.log(jobs)
      let uber = req.session.user;
      res.render('user/view-edit-delete-job', 
      { 
        jobs, user: true, 
        showHeader1: true, 
        showHeader2: true, uber,
        groupchatcount,
        total_message,
        total_notify_number
       });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/addjob/:id', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userData = { ...req.body, UserId: req.params.id };
      await userHelpers.addJob(userData).then((insertedJobId) => {
        let image = req.files ? req.files.JobImage : null;
        if (image) {
          image.mv('./public/job-images/' + insertedJobId + '.jpg');
        }
        res.redirect('/profile');
      }).catch((error) => {
        console.error(error);
        res.status(500).send('Internal Server Error');
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.get('/edit-job/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const jobId = req.params.id;
      let job = await userHelpers.getIndividualJobDetail(jobId);
      res.render('user/edit-job', { job });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/view_job_requests/:id',async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber = req.session.user;
      const jobId = req.params.id;
      let score = await userHelpers.putJobRecomendationScore(jobId);
      let user = await userHelpers.getuserDetailsForrequest(score)
      console.log("USER IS : ",user)
      res.render('user/view_job_requests', 
      { 
        user,showHeader1:true,
        showHeader2:true,uber,
        groupchatcount,
        total_message,
        total_notify_number
       });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/edit-job/:id',async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userdetail = await userHelpers.findUserIdFromJobId(req.params.id)
      let userId = userdetail.userId
      userHelpers.updateJob(req.params.id,req.body).then(()=>{
        res.redirect('/view-edit-delete-jobs')
        let image = req.files ? req.files.JobImage : null;
        if (image) {
          image.mv('./public/job-images/' + req.params.id + '.jpg');
        }
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/send_job_request', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
        let requested_user_id = req.body.userId;
        let job_id = req.body.job_id;
        try {
            await userHelpers.putJobRecomendationRequest(requested_user_id, job_id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
  }
});



router.post('/delete-job-form-portal',async (req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      await userHelpers.deleteJob(req.body.JoB).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})



router.get('/groupchat', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
    try {
        const referrer = req.get('Referrer');
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
      
        const userId = req.session.user._id;  // Use req.session.user._id directly
        let uber = req.session.user;
        let requiredID = req.session.user._id;
        let messages = await userHelpers.getAllMessage();
        let user = await userHelpers.getProfileDetails(userId);
        let textMessage = false;
        let multimedia = false;

        // Function to format timestamp into human-readable format
        const formatTimestamp = (timestamp) => {
          const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
          return new Date(timestamp).toLocaleTimeString('en-US', options);
        };

        messages = messages.map(message => {
          message.videoPresent = message.VideoNames && message.VideoNames.length > 0;
          message.imagePresent = message.ImageNames && message.ImageNames.length > 0;
          message.timestamp = formatTimestamp(message.timestamp); // Format timestamp


          if (message.deleteStatus === 'deletedMessage' && message.deleted_time) {
            message.deleted_time = formatTimestamp(message.deleted_time);
          }

          if (message.userId === userId) {
              message.delete = true;
          }

          if (message.SENDBY === "USER") {
              message.USERCONFIRMED = true;
          } else if (message.SENDBY === "ADMIN") {
            message.ADMINCONFIRMED = true;
          }

          message.noDelete = !message.deleteStatus || message.deleteStatus !== "deletedMessage";
          message.yesDelete = message.deleteStatus || message.deleteStatus === "deletedMessage";

          if (
              message.actualMessageId !== "" &&
              message.actualMessageUsername !== "" &&
              message.actualMessageContent !== ""
          ) {
              message.noreply = true;
          }
          if (message.status === "textmessage") {
            message.textMessage = true;
          } else if (message.status === "multimedia") {
            message.multimedia = true;
          }
          return message;
        });

        if (user) {
            res.render('user/groupchat', { 
                showHeader1: true, 
                showHeader2: true, 
                user, 
                userId, 
                uber,referrer,
                messages, 
                requiredID,
                textMessage,
                multimedia,
                groupchatcount,
                total_message,
                total_notify_number
            });
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
  } 
  else{
    res.render('user/view_page_disabled', {userId:req.session.user._id});
  }
  }else {
    res.redirect('/login');
  }
});



router.post('/send-message/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let name = req.session.user.Name;
      let actualMessageId = null;
      let MessageId = null;
      let status = "textmessage"
      let actualMessageUsername = null;
      let actualMessageContent = null;
      let userId = req.params.id;
      let SENDBY = null;
      try {
          let messageContent = req.body.messageContent.replace(/[\r\n]+/g, "");
          actualMessageId = req.body.actualMessageId;
          MessageId = req.body.MessageId;
          actualMessageContent = req.body.actualMessageContent;
          actualMessageUsername = req.body.actualMessageUsername;
          SENDBY = req.body.SENDBY;
          const timestamp = new Date();
          await userHelpers.handleGroupChatMessage(MessageId,userId,name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY);
          res.redirect("/groupchat");
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/delete-message-from-groupchat',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deleteMessage(req.body.MessagE).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/add-post-togroup/:id', (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("MULTI MEDIA MESSAGE CONTENT IS : ",req.body)
      const postData = { ...req.body };
      const timestamp = new Date();
      const status = "multimedia"
      let User_Id = req.session.user._id;
      let MessageId = req.body.MessageId;
      let imageFileNames = [];
      let videoFileNames = [];
      const baseFolderPath = `./public/group-media/${User_Id}/${MessageId}/`;
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }
      userHelpers.addPostGroup(postData, timestamp, status).then((insertedPostId) => {
        let files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
        files.forEach((file, index) => {
          let fileExtension = file.name.split('.').pop();
          let fileName = `${MessageId}_${index + 1}.${fileExtension}`;
          file.mv(baseFolderPath + fileName);
          if (file.mimetype.includes('image')) {
            imageFileNames.push(fileName);
          } else if (file.mimetype.includes('video')) {
            videoFileNames.push(fileName);
          }
        });
        userHelpers.addPostGroupImages(MessageId, imageFileNames);
        userHelpers.addPostGroupVideos(MessageId, videoFileNames);
        res.redirect('/groupchat/');
      }).catch((error) => {
        console.error(error);
        res.status(500).send('Internal Server Error');
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.get('/add-post', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const userId = req.session.user._id;
      let User = await userHelpers.getProfileDetails(userId);
      res.render('user/add-post', { User });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/add-post/:id', (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const postData = { ...req.body, UserId: req.params.id };
      let User_Id = req.session.user._id;
      const timestamp = new Date();
      let imageFileNames = [];
      let videoFileNames = [];
      userHelpers.addPost(postData, timestamp).then((insertedPostId) => {
        const baseFolderPath = `./public/posts/${User_Id}/${insertedPostId}/`;
        if (!fs.existsSync(baseFolderPath)) {
          fs.mkdirSync(baseFolderPath, { recursive: true });
        }
        let files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
        files.forEach((file, index) => {
          let fileExtension = file.name.split('.').pop();
          let fileName = `${insertedPostId}_${index + 1}.${fileExtension}`;
          file.mv(baseFolderPath + fileName);
          if (file.mimetype.includes('image')) {
            imageFileNames.push(fileName);
          } else if (file.mimetype.includes('video')) {
            videoFileNames.push(fileName);
          }
        });
        userHelpers.addPostImages(insertedPostId, imageFileNames);
        userHelpers.addPostVideos(insertedPostId, videoFileNames);
        res.redirect('/profile');
      }).catch((error) => {
        console.error(error);
        res.status(500).send('Internal Server Error');
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});



router.get('/view-own-post', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      const userId = req.session.user._id;
      let USER_ID = userId
      let ownPosts = await userHelpers.getOwnPostDetails(userId);
      let uber = req.session.user;
      ownPosts = ownPosts.map(post => {
        let imagePresent = post.ImageNames && post.ImageNames.length > 0;
        let videoPresent = post.VideoNames && post.VideoNames.length > 0;
        let postLocation = post.location !== "";
        let liked = false;
        let like_count = 0;
        if (post.likes && post.likes.length > 0) {
          like_count = post.likes.length;
          liked = post.likes.includes(userId);
        }
        return {
          ...post,
          imagePresent,
          videoPresent,
          postLocation,
          liked,
          like_count
        };
      });
      res.render('user/view-own-post', 
      { 
        ownPosts, showHeader1: true, 
        showHeader2: true, 
        showHeader3: true, 
        uber,USER_ID ,
        groupchatcount,
        total_message,
        total_notify_number
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.get('/view-other-post', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      const userId = req.session.user._id;
      const user = await userHelpers.getProfile(userId);
      const userName = user.Name;
      let otherPosts = await userHelpers.getOtherPostDetails(userId);

      let iblockList = await userHelpers.getindiBlockLogData(userId)
      let iwasblocklist = await userHelpers.getBlockedByUsers(userId)
      otherPosts = otherPosts.filter(otherPost => !iblockList.includes(otherPost.UserId));
      otherPosts = otherPosts.filter(otherPost => !iwasblocklist.includes(otherPost.UserId));

      let uber = req.session.user;
      otherPosts = otherPosts.map(post => {
        const postId = post._id.toString();
        let imagePresent = post.ImageNames && post.ImageNames.length > 0;
        let videoPresent = post.VideoNames && post.VideoNames.length > 0;
        let postLocation = post.location !== "";
        let liked = false;
        let like_count = 0;
        if (post.likes && post.likes.length > 0) {
          like_count = post.likes.length;
          liked = post.likes.includes(userId);
        }

        return {
          ...post,
          _id: postId,
          imagePresent,
          videoPresent,
          postLocation,
          liked,
          like_count
        };
      });
      //console.log("OTHER POSTS COMMENT :",otherPosts.comments)
      res.render('user/view-other-post', 
      { 
        otherPosts, userId, 
        userName, showHeader1: true, 
        showHeader2: true, 
        showHeader3: true, uber,
        groupchatcount,
        total_message,
        total_notify_number
       });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/add-like',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let USER_ID = req.body.UserID;
      let POST_ID = req.body.PostID;
      userHelpers.addLike(USER_ID,POST_ID).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/add_comment/:id',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let post_Id = req.params.id;
      let time_comment = new Date();
      let status = "COMMENT";
      userHelpers.addComment(post_Id,req.body,time_comment,status).then((response)=>{
        res.redirect('/view-other-post')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/edit-post/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let PostDetail = await userHelpers.getPostDetails(req.params.id);
      res.render('user/edit-post',{PostDetail})
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
})


router.post('/edit-post/:id',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.editPost(req.params.id,req.body).then((response)=>{
        res.redirect('/view-own-post')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/delete-post/:id', (req, res, next) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deletePost(req.params.id).then((response) => {
          res.json(response);
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.get('/mentorshipportal', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){

      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;

      const userId = req.session.user._id;
      let uber = req.session.user;
      let user = await userHelpers.getProfileDetails(userId);
      let mentors = await userHelpers.getMentorDetails();
      mentors.forEach(mentor => {
        mentor.profileCheck = mentor.userId === userId;
        if (mentor.replies && Array.isArray(mentor.replies)) {
          mentor.replies.forEach(reply => {
            reply.checkProfileReply = reply.userId === userId;
            if (reply.Status === "reply") {
              reply.statReply = true;
            } else if (reply.Status === "replyofreply") {
              reply.statReplyofReply = true;
            }
            if (Array.isArray(reply.replies)) {
              reply.replies.forEach(replyOfReply => {
                if (replyOfReply.Status === "reply") {
                  replyOfReply.statReply = true;
                } else if (replyOfReply.Status === "replyofreply") {
                  replyOfReply.statReplyofReply = true;
                }
              });
            }
          });
        }
      });
      res.render('user/mentorshipportal', {
        user,
        showHeader1: true,
        showHeader2: true,
        uber,
        mentors,
        groupchatcount,
        total_message,
        total_notify_number
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/add-question', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userId = req.session.user._id;
      let userdetail = await userHelpers.getProfileDetails(userId);
      let userName = userdetail.Name;
      let status = "question";
      let userEmail = userdetail.Email;
      let current = userdetail.Status;
      let Contact = userdetail.Contact;
      let sanitizedQuestionInput = req.body.questionInput.replace(/[\r\n]+/g, "");
      let userdata = {
        userName: userName,
        userId: userId,
        userEmail: userEmail,
        Status: status,
        Currentstatus: current,
        Contact: Contact,
      };
      req.body = {
        ...req.body,
        ...userdata,
        questionInput: sanitizedQuestionInput,
      };
      await userHelpers.addQuestionMentorship(req.body, userdata).then(async (insertedQuestionId) => {
        insertedQuestionId = insertedQuestionId.toString();
        await userHelpers.addQuestionEntry(userId,insertedQuestionId)
        res.redirect('/mentorshipportal');
      });
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/search_mentor',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let mentorkeyword = req.body;
      let uber = req.session.user;
      let userId = req.session.user._id
      let mentors = await userHelpers.searchMentor(mentorkeyword);
      mentors.forEach(mentor => {
        mentor.profileCheck = mentor.userId === userId;
        if (mentor.replies && Array.isArray(mentor.replies)) {
          mentor.replies.forEach(reply => {
            reply.checkProfileReply = reply.userId === userId;
            if (reply.Status === "reply") {
              reply.statReply = true;
            } else if (reply.Status === "replyofreply") {
              reply.statReplyofReply = true;
            }
            if (Array.isArray(reply.replies)) {
              reply.replies.forEach(replyOfReply => {
                if (replyOfReply.Status === "reply") {
                  replyOfReply.statReply = true;
                } else if (replyOfReply.Status === "replyofreply") {
                  replyOfReply.statReplyofReply = true;
                }
              });
            }
          });
        }
      });
      res.render('user/mentorshipportal',{mentors,showHeader1: true,showHeader2: true,uber,})
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  } else {
    res.redirect('/login');
  }
})


router.post('/delete-mentor',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deleteMentor(req.body.MentoR).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/add-reply', async(req, res, next) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userId = req.session.user._id;
      let userdetail = await userHelpers.getProfileDetails(userId); 
      let userName = userdetail.Name;
      let questionId = req.body.questionId
      let status = "reply";
      let userEmail = userdetail.Email;
      let current = userdetail.Status;
      let Contact = userdetail.Contact;
      let sanitizedQuestionInput = req.body.questionInput.replace(/[\r\n]+/g, "");
      let userData = {
        userName: userName,
        userId: userId,
        userEmail: userEmail,
        Status: status,
        Currentstatus: current,
        Contact: Contact,
      }
      req.body = {
        ...req.body,
        ...userData,
        questionInput: sanitizedQuestionInput,
      };
      await userHelpers.addReply(req.body,questionId).then(async(response)=>{
        await userHelpers.incrementReplyCount(questionId);
        res.redirect('/mentorshipportal')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/delete-mentor-reply',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deleteMentorReply(req.body.MentorreplY,req.body.QuestioN).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/edit-question',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let questiontext = req.body.questionInput
      let questionId = req.body.questionId
      userHelpers.editQuestion(questiontext,questionId).then((response)=>{
        res.redirect('/mentorshipportal')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.post('/add-reply-ofreply', async(req, res, next) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userId = req.session.user._id;
      let userdetail = await userHelpers.getProfileDetails(userId); 
      let userName = userdetail.Name;
      let questionId = req.body.questionId;
      let status = "replyofreply";
      let userEmail = userdetail.Email;
      let questionInput = req.body.replyInput;
      let current = userdetail.Status;
      let Contact = userdetail.Contact;
      let sanitizedReplyInput = req.body.replyInput.replace(/[\r\n]+/g, "");
      let sanitizedQuestionInput = questionInput.replace(/[\r\n]+/g, "");
      let userData = {
        userName: userName,
        userId: userId,
        questionInput:sanitizedQuestionInput,
        userEmail: userEmail,
        Status: status,
        Currentstatus: current,
        Contact: Contact,
      }
      req.body = {
        ...req.body,
        ...userData,
        replyInput: sanitizedReplyInput,
      };
      await userHelpers.addReply(req.body,questionId).then(async(response)=>{
        await userHelpers.incrementReplyCount(questionId);
        res.redirect('/mentorshipportal')
      }) 
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  } 
});


router.post('/edit-reply',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let replyId = req.body.replyId;
      let replyInput = req.body.replyInput;
      let questionId = req.body.questionId;
      userHelpers.editReply(replyInput,questionId,replyId).then((response)=>{
        res.redirect('/mentorshipportal')
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.get('/one-on-one-chat/:id', verifyLogin, async (req, res) => {
  console.log("ONE ONE ONE CHAT CALLED")
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      try {
      const referrer = req.get('Referrer');
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;

      let uber = req.session.user;
      let Sender_Id = req.session.user._id;
      let Reciever_Id = req.params.id;

      let reciever = await userHelpers.getProfileDetails(Reciever_Id);
      let sender = await userHelpers.getProfileDetails(Sender_Id);
      let activeSTAT = reciever.activeStatus;
      let ACTIVE = null;
      let INACTIVE = null;
      if (activeSTAT === "active") {
          ACTIVE = true;
          INACTIVE = false;
      } else if (activeSTAT === "inactive") {
          INACTIVE = true;
          ACTIVE= false;
      }
      if(ACTIVE){

        let iblockList = await userHelpers.getindiBlockLogData(Sender_Id)
        let iwasblocklist = await userHelpers.getBlockedByUsers(Sender_Id)
        let iBlocked = iblockList.includes(Reciever_Id);
        let iWasBlocked = iwasblocklist.includes(Reciever_Id);
        let NoBlock = !(iBlocked || iWasBlocked);

        if(NoBlock){
          const Sender = req.session.user._id.toString();
          const Receiver = req.params.id.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');

          let time_entered_inchat = new Date();
          time_entered_inchat = time_entered_inchat.toISOString();
          await userHelpers.updateEnteredTimeUnread(Sender_Id,Reciever_Id,Room_Id,time_entered_inchat)

          let lastFetchMessageId = await userHelpers.FetchLastMessageId(Sender,Room_Id)

          let sendmessages = await userHelpers.oneONoneCHAT(Sender_Id, Reciever_Id);
          let recievedmessages = await userHelpers.oneONoneCHAT(Reciever_Id, Sender_Id);

          sendmessages = sendmessages.map(message => ({ ...message, Send: true,Sender_Id:Sender_Id,Reciever_Id:Reciever_Id}));
          recievedmessages = recievedmessages.map(message => ({ ...message, Recieve: true,Reciever_Id:Reciever_Id,Sender_Id:Sender_Id}));
          let messages = [...sendmessages, ...recievedmessages];
          let ChatLastSeen = await userHelpers.FetchupdateTimeLastSeen(Room_Id,Reciever_Id);//FETCH CHATROOM LASTSEEN

          const dateObject = new Date(ChatLastSeen);
          const options = { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
          ChatLastSeen = new Intl.DateTimeFormat('en-US', options).format(dateObject);

          // Function to format timestamp into human-readable format
          const formatTimestamp = (timestamp) => {
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
            return new Date(timestamp).toLocaleTimeString('en-US', options);
          };

          messages.sort((a, b) => a.timestamp - b.timestamp);
          messages = messages.map(message => {
            message.videoPresent = message.VideoNames && message.VideoNames.length > 0;
            message.imagePresent = message.ImageNames && message.ImageNames.length > 0;
            message.timestamp = formatTimestamp(message.timestamp);


            if (message.deleteStatus === 'deletedMessage' && message.deleted_time) {
              message.deleted_time = formatTimestamp(message.deleted_time);
            }

              message.noDelete = !message.deleteStatus || message.deleteStatus !== "deletedMessage";
              message.yesDelete = message.deleteStatus || message.deleteStatus === "deletedMessage";

              if (
                  message.actualMessageId !== "" &&
                  message.actualMessageUsername !== "" &&
                  message.actualMessageContent !== ""
              ) {
                  message.noreply = true;
              }
              if (message.status === "textmessage") {
                message.textMessage = true;
              } else if (message.status === "multimedia") {
                message.multimedia = true;
              }

              if (message.MessageId === lastFetchMessageId) {
                message.last_message = true;
              }

              return message;
          });
          res.render('user/one-on-one-chat', {
            reciever,
            sender,
            uber,referrer,
            Room_Id,
            showHeader1: true,
            showHeader2: true,
            messages,
            ChatLastSeen,
            lastFetchMessageId,
            groupchatcount,
            total_message,
            total_notify_number
          });
        }
        else if(iBlocked){
          res.render('user/show_block_message',
            {
              iBlocked,
            }
          )
        }
        else if(iWasBlocked){
          res.render('user/show_block_message',
            {
              iWasBlocked,
            }
          )
        }
      }else if(INACTIVE){
        res.render('user/view_profile_disabled')
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  } 
  else{
    res.render('user/view_page_disabled', {userId:req.session.user._id});
  }
}else {
  res.redirect('/login');
}

});
     

router.post('/send-one-message/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let Sender_name = req.session.user.Name;
      let Sender_Id = req.session.user._id
      let Reciever_name = null;
      let Reciever_Id = null;
      let actualMessageId = null;
      let MessageId = null;
      let status = "textmessage"
      let actualMessageContent = null;
      try {     
          let messageContent = req.body.messageContent.replace(/[\r\n]+/g, "");
          actualMessageId = req.body.actualMessageId;
          MessageId = req.body.MessageId;
          actualMessageContent = req.body.actualMessageContent;
          Reciever_name = req.body.recieverUsername;
          Reciever_Id = req.body.recieverUserId;
          const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          const timestamp = new Date();
          let time_entered_inchat = timestamp.toISOString();
          await userHelpers.handleOneChatMessage
          (
            MessageId,messageContent,
            actualMessageId,
            actualMessageContent, 
            timestamp,status,
            Reciever_name,Reciever_Id,
            Sender_name,Sender_Id
          );
          await userHelpers.AddInverseChat(Sender_Id,Reciever_Id)
          await userHelpers.updateEnteredTimeUnread(Reciever_Id,Sender_Id,Room_Id,time_entered_inchat)
          // here i used this function because when i new message was recieved, then new connection badge will disappear 
          // after refresh or reentering page even thoug we dont view it.
          // it is because new_reciever list become empty after leaving from chatwith as they are no more new recievers
          // here what i do is that when i click send message, then i am just inserting a timestamp in individual chat (TIME_UNREAD_COLLECTION)
          // with sender id as to which user i send.
          // in this way i am explicitly saying that the reciever has leaved the chat the same time the sender sended a message.
          // so that i can fetch and compare the last time he leaved with current time to show the badge of unread messages
          res.redirect("/one-on-one-chat/"+req.params.id);
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/add-one-post-tochat/:id', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const postData = { ...req.body};
      let Sender_name = req.session.user.Name;
      let Reciever_Id = req.body.Reciever_Id;
      let Sender_Id = req.session.user._id;
      const timestamp = new Date();
      let time_entered_inchat = timestamp.toISOString();
      const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
      const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
      const status = "multimedia";
      let MessageId = req.body.MessageId
      let imageFileNames = [];
      let videoFileNames = [];
      const baseFolderPath = `./public/one-on-one-chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;
      
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      try {
        await userHelpers.addPostOne(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
        await userHelpers.AddInverseChat(Sender_Id,Reciever_Id)
        await userHelpers.updateEnteredTimeUnread(Reciever_Id,Room_Id,time_entered_inchat)

        let files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
        files.forEach((file, index) => {
          let fileExtension = file.name.split('.').pop();
          let fileName = `${MessageId}_${index + 1}.${fileExtension}`;
          file.mv(baseFolderPath + fileName);
          if (file.mimetype.includes('image')) {
            imageFileNames.push(fileName);
          } else if (file.mimetype.includes('video')) {
            videoFileNames.push(fileName);
          }
        });

        await userHelpers.addPostOneImages(Sender_Id, Reciever_Id, MessageId, imageFileNames);
        await userHelpers.addPostOneVideos(Sender_Id, Reciever_Id, MessageId, videoFileNames);

        res.redirect('/one-on-one-chat/' + req.params.id);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/delete-message-from-chat',(req,res,next)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      userHelpers.deleteOneMessage(req.body.MessagE,req.session.user._id,req.body.RecievE).then((response)=>{
        res.json(response)
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/chatwith', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user;
        const userId = req.session.user._id;
        let lastEntered = new Date();
        lastEntered = lastEntered.toISOString();
        await userHelpers.LastEnteredChatWith(lastEntered,userId);
        let Current_Send_List = await userHelpers.chatCOUNT(userId);//ONE_ON_ONE_CHAT_COLLECTION used
        //tells whom all we had sended atleast one message when entering chatwith at that time
        let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetails(userId) //CHAT_BACK_AND_FORTH_BOOK used
        //tells whom all we had recieved atleast one message when entering chatwith at that time
        let Current_Send_List_count = Current_Send_List.length;
        //number of all users we had send atleast one message when entering chatwith at that time
        let Current_Recieve_List_count = Current_Reciever_List.length;
        //number of all users we had recieved atleast one message when entering chatwith at that time
        let ExistingCount = await userHelpers.FetchChatRoomUpdate(userId);//ONE_CHAT_FIRST_CHAT_DETAILS used
        //all details when leaving from chatwith page
        let Existing_Send_List = ExistingCount.Send_List;
        //list of all users whom we sended at least one message when leaved chatwith page
        let Existing_Reciever_List = ExistingCount.Reciever_List;
        //list of all users whom we recieved at least one message when leaved chatwith page
        let Existing_time = ExistingCount.timestamp;
        // time last leaved from chatwith
        let Existing_Send_List_count = Existing_Send_List.length;
        // count of all users whom we sended at least one message when leaved chatwith page
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

        let Room_Id_Collection = [];
        Existing_Reciever_List.forEach((receiver) => {
          const Sender = userId.toString();
          const Receiver = receiver.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          Room_Id_Collection.push(Room_Id);
        });
        // here existing recieve list is used to find all the roomids using reciever ids and my id
        // that is fetching timestamp when last 

        let fetch = await userHelpers.FetchupdateTimeUnread(Room_Id_Collection,userId); // TIME_UNREAD_COLLECTION used
        // here roomid collection is used to find all the details from that recieved individual chat
        // returns an array which contains all individual chatinformation of me
        // that is fetching timestamp when last leaved from all individual chat, 
        // number of recieved message count from all individual chat, 
        // then room id of all individual chat
        // that is each entry of that array have leaved timestamp, recieved message count, roomid

        let messageCountArray = [];
        for (const Reciever_Id of Existing_Reciever_List) {
          //const count = await userHelpers.getArrayCount(userId, Reciever_Id);// ONE_ON_ONE_CHAT_COLLECTION used
          //const messageCount = count[0]?.userArrayLength || 0;
          const messageCount = await userHelpers.getArrayCount(userId, Reciever_Id);
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
          const Sender = userId.toString();
          const Receiver = Reciever_Id.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
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
          const Sender = userId.toString();
          const Receiver = receiver.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          new_room_id_collection.push(Room_Id);
        }); //same as room id collection, but uses existing sended list instead of existing recieved list

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

            if (message.status === "multimedia") {
              message.media = true;
            } else if(message.status === "textmessage"){
              message.text = true;
            }
        });
        //last seen of all chats inside chatwith is shown
        // user needs to leave from chatwith to get the last seen

        res.render('user/chatwith', 
        {
          userId, 
          combinedMessages, 
          uber, showHeader1: true, 
          showHeader2: true ,
          groupchatcount,
          total_message,
          total_notify_number
        });
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error("Error fetching chat room update:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});


router.get('/one_on_admin_broadcast',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      let myID = req.session.user._id
      let timeStamp = new Date();
      timeStamp = timeStamp,this.toString();
      await userHelpers.EnterAdminMessageOne(myID,timeStamp)
      let Admin_broadcasts = await userHelpers.GetAllAdminBroadcastMessage();
      const formatTimestamp = (timestamp) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        return new Date(timestamp).toLocaleTimeString('en-US', options);
      };
      Admin_broadcasts.sort((a, b) => a.timestamp - b.timestamp);
      Admin_broadcasts = Admin_broadcasts.map(message => {
        message.videoPresent = message.VideoNames && message.VideoNames.length > 0;
        message.imagePresent = message.ImageNames && message.ImageNames.length > 0;
        message.timestamp = formatTimestamp(message.timestamp);


        if (message.deleteStatus === 'deletedMessage' && message.deleted_time) {
          message.deleted_time = formatTimestamp(message.deleted_time);
        }

          message.noDelete = !message.deleteStatus || message.deleteStatus !== "deletedMessage";
          message.yesDelete = message.deleteStatus || message.deleteStatus === "deletedMessage";

          if (
              message.actualMessageId !== "" &&
              message.actualMessageUsername !== "" &&
              message.actualMessageContent !== ""
          ) {
              message.noreply = true;
          }
          if (message.status === "textmessage") {
            message.textMessage = true;
          } else if (message.status === "multimedia") {
            message.multimedia = true;
          }
          return message;
      });

      res.render('user/one_on_admin_broadcast',
      {
        showHeader1: true,
        showHeader2: true,
        uber,myID,
        Admin_broadcasts,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})



router.post('/send-timestamp-leave-chat/:id', async (req, res) => {
  if (req.session && req.session.user) {
    console.log("LEAVED CHAT ONE")
    if(req.session.user.activeStatus == "active"){
      let Reciever_Id = req.params.id;
      let Sender_Id = req.session.user._id;

      try {
        //const count = await userHelpers.getArrayCount(Sender_Id, Reciever_Id);
        //let messageCount = count[0]?.userArrayLength || 0;
        const messageCount = await userHelpers.getArrayCount(Sender_Id, Reciever_Id);
        const Sender = req.session.user._id.toString();
        const Receiver = req.params.id.toString();
        const sortedIds = [Sender, Receiver].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = req.body.timestamp;

        //await userHelpers.updateTimeUnread(Sender_Id,Room_Id, timestamp, messageCount)
        await userHelpers.updateTimeUnread(Sender_Id,Room_Id, timestamp, messageCount).then((response) => {
          res.json(response);
        });
        let sendmessages = await userHelpers.oneONoneCHAT(Sender_Id, Reciever_Id);
          let messages = [...sendmessages];
          if(messages.length > 0){
            await userHelpers.ChatRoomUpdateOnProfileReturns(Sender_Id,timestamp,Reciever_Id);
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
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send-timestamp-leave-menu', async(req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED CHAT WITH")
      let Sender_Id = req.session.user._id;
      const timestamp = req.body.timestamp;
      try{
        let Send_List = await userHelpers.chatCOUNT(Sender_Id);
        let Reciever_List = await userHelpers.getReceivedMessageSendDetails(Sender_Id)
        let Send_List_count = Send_List.length;
        let Recieve_List_count = Reciever_List.length;
        await userHelpers.ChatRoomUpdate(Sender_Id,timestamp,Send_List,Reciever_List,Send_List_count,Recieve_List_count).then((response) => {
          res.redirect('/')
          });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      } 
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
      res.redirect('/login');
    }
  });

  router.post('/fetch-last-message-details/:id', async(req, res) => {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){

        let Sender_Id = req.session.user._id;
        let last_message_id = req.body.lastMessageId;
        let Reciever_Id = req.params.id;
        const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
        const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
        await userHelpers.UpdateLastMessage(Sender_Id,Room_Id,last_message_id)
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
        res.redirect('/login');
      }
    });

  router.post('/send_timestamp_leave_admin_broadcast', async(req, res) => {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        try{
          let Sender_Id = req.session.user._id;
          let timeStamp = new Date();
          timeStamp = timeStamp.toISOString();
          await userHelpers.LeaveAdminMessageOne(Sender_Id,timeStamp)
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal server error' });
        } 
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
        res.redirect('/login');
      }
    });

  router.get('/searchfriends',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/searchFriends',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.post('/search-friend',async(req,res,next)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        Name = req.body.searchName;
        let uber=req.session.user;
        let usersAll = await userHelpers.GetUserThroughSearch(Name);
        res.render('user/searchFriends',{showHeader1: true,showHeader2: true,uber,usersAll})
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/more-advance-search',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/more-advance-search',
        {
          showHeader1: 
          true,showHeader2: true,
          uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/search-by-passoutyear',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/searchPassout',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.post('/search-by-passoutyear',async(req,res,next)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        passout = req.body.searchPassout;
        let uber=req.session.user;
        let usersAll = await userHelpers.GetUserPassoutThroughSearch(passout);
        res.render('user/searchPassout',{showHeader1: true,showHeader2: true,uber,usersAll})
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/search-by-location',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/searchLocation',
        {showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.post('/search-by-location',async(req,res,next)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        location = req.body.searchLocation;
        let uber=req.session.user;
        let usersAll = await userHelpers.GetUserLocationThroughSearch(location);
        res.render('user/searchLocation',{showHeader1: true,showHeader2: true,uber,usersAll})
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/search-by-domain',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/searchDomain',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.post('/search-by-domain',async(req,res,next)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        domain = req.body.searchDomain;
        let uber=req.session.user;
        let usersAll = await userHelpers.GetUserDomainThroughSearch(domain);
        res.render('user/searchDomain',{showHeader1: true,showHeader2: true,uber,usersAll})
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/search-by-filter',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/search-by-filter',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })
  
  router.post('/search-by-filter',async(req,res,next)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        filter = req.body;
        let uber=req.session.user;
        let usersAll = await userHelpers.GetFilteredUsersThroughSearch(filter);
        res.render('user/search-by-filter',{showHeader1: true,showHeader2: true,uber,usersAll})
      
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/settings',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/settings',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.get('/delete_account',verifyLogin,async(req,res)=>{
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber=req.session.user;
        res.render('user/delete_account',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number
        })
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
      res.redirect('/login');
    }
  })

  router.post('/delete_account', async (req, res, next) => {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        const reason = req.body.delete_reason;
        const user_id = req.session.user._id;
        await userHelpers.InsertDeletionIdReasonAccountUser(user_id,reason)
        await userHelpers.markDeletion(user_id)
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                res.status(500).send("Error destroying session.");
            } else {
                // Redirect to login page after session is destroyed
                res.redirect('/login');
            }
        });
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    } else {
      res.redirect('/login');
    }
});


router.post('/reactivate_account', async (req, res, next) => {
  if (req.session && req.session.user) {
      user_ID = req.body.userId;
      try {
          const isActive = await userHelpers.ReactivateUserAccount(user_ID);
          if (isActive.status_change_activated == true) {
              req.session.destroy((err) => {
                  if (err) {
                      console.error("Error destroying session:", err);
                      res.status(500).send("Error destroying session");
                  } else {
                      res.redirect('/login');
                  }
              });
          } else {
            res.render('user/view_page_disabled', { userId: req.session.user._id });
          }
      } catch (error) {
          console.error("Error reactivating account:", error);
          res.status(500).send("Error reactivating account");
      }
  } else {
      res.redirect('/login');
  }
});


router.get('/contact_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      let admin_id = await userHelpers.getAdminID();
      admin_id = admin_id.toString();
      res.render('user/contact_admin',
      {
        showHeader1: true,
        showHeader2: true,
        uber,admin_id,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.get('/block_user',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      res.render('user/block_user',
      {
        showHeader1: true,
        showHeader2: true,
        uber,
        block_detail_understand:true,
        ShowBlockUsers:true,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.get('/see_all_blocked_users',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      let user_id = req.session.user._id;
      let usersAll = await userHelpers.getindiBlockLogData(user_id)
      let seeBlockUsers = await userHelpers.getUserDetailsFromBlockArray(usersAll)
      res.render('user/block_user',
      {
        showHeader1: true,
        showHeader2: true,
        uber,
        block_detail_understand:true,
        ShowBlockUsers:true,
        seeBlockUsers,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/unblock_user/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let view = req.params.id;
      let user_id = req.session.user._id;
      await userHelpers.RemoveBlock(view,user_id)
      res.redirect('/block_user')
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.get('/unblock_user_profile/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let view = req.params.id;
      let user_id = req.session.user._id;
      await userHelpers.RemoveBlock(view,user_id)
      res.redirect('/view-profile/'+view)
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/search_block_byname',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      Name = req.body.searchName
      let usersAll = await userHelpers.GetUserThroughSearch(Name);
      res.render('user/block_user',
      {
        showHeader1: true,
        showHeader2: true,
        uber,usersAll,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/search_block_byid',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      Id = req.body.searchID;
      sender_id = Id;
      let sender_detail = await userHelpers.GetUserThroughSearchID(Id);
      res.render('user/block_user_action',
      {
        showHeader1: true,showHeader2: true,uber,
        sender_detail,
        sender_id,
        has_sender_byid:true,
        showsearch:true,
        groupchatcount,
        total_message,
        total_notify_number
      })
    }
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
  res.redirect('/login');
  }
})

router.get('/block_user_byname/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let sender = req.params.id;
      let uber=req.session.user;
      let sender_detail = await userHelpers.getProfile(sender);
      let sender_id = sender_detail._id;
      res.render('user/block_user_action',
      {showHeader1: true,showHeader2: true,uber,
        sender_detail,
        sender_id,
        has_sender_byid:true,
        showsearch:true,
        showIdSearch : true,
        groupchatcount,
        total_message,
        total_notify_number
      })
      }
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
    res.redirect('/login');
  }
})


router.get('/block_user_byid/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let sender = req.params.id;
      let uber=req.session.user;
      let sender_detail = await userHelpers.getProfile(sender);
      let sender_id = sender_detail._id;
      res.render('user/block_user_action_profile',
      {
        showHeader1: true,showHeader2: true,uber,
        sender_detail,
        sender_id,
        has_sender_byid:true,
        showsearch:true,
        groupchatcount,
        total_message,
        total_notify_number
      })
    }
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
    }else {
    res.redirect('/login');
  }
})


router.post('/block_user',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let user_id = req.session.user._id;
      let blocked_id = req.body.blocked_id;
      block_reason = req.body.block_reason
      if(blocked_id != user_id){
        await userHelpers.sendBlockData(user_id,blocked_id,block_reason)
        res.redirect('/settings')
      } else if(blocked_id == user_id){
        res.redirect('/settings')
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/block_user_profile',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let user_id = req.session.user._id;
      let blocked_id = req.body.blocked_id;
      block_reason = req.body.block_reason
      if(blocked_id != user_id){
        await userHelpers.sendBlockData(user_id,blocked_id,block_reason)
        res.redirect('/')
      } else if(blocked_id == user_id){
        res.redirect('/')
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.get('/report_user',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      res.render('user/report_user',
      {
        showHeader1: true,
        showHeader2: true,uber,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/search_report_byname',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let uber=req.session.user;
      Name = req.body.searchName
      let usersAll = await userHelpers.GetUserThroughSearch(Name);
      res.render('user/report_user',{showHeader1: true,showHeader2: true,uber,usersAll})
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/search_report_byid',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let uber=req.session.user;
      Id = req.body.searchID;
      sender_id = Id;
      let sender_detail = await userHelpers.GetUserThroughSearchID(Id);
      res.render('user/report_user_action',
      {
        showHeader1: true,showHeader2: true,uber,
        sender_detail,
        sender_id,
        has_sender_byid:true,
        showsearch:true})
      }
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
    res.redirect('/login');
  }
})

router.get('/report_user_byname/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let sender = req.params.id;
      let uber=req.session.user;
      let sender_detail = await userHelpers.getProfile(sender);
      let sender_id = sender_detail._id;
      res.render('user/report_user_action',
      {
        showHeader1: true,
        showHeader2: true,uber,
        sender_detail,
        sender_id,
        has_sender_byid:true,
        showsearch:true,
        showIdSearch : true,
        groupchatcount,
        total_message,
        total_notify_number
      })
      }
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }
    }else {
    res.redirect('/login');
  }
})


router.get('/report_user_byid/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let sender = req.params.id;
      let uber=req.session.user;
      let sender_detail = await userHelpers.getProfile(sender);
      let sender_id = sender_detail._id;
      res.render('user/report_user_action_profile',
      {
        showHeader1: true,showHeader2: true,uber,
        sender_detail,
        sender_id,
        has_sender_byid:true,
        showsearch:true,
        groupchatcount,
        total_message,
        total_notify_number
      })
    } else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
  res.redirect('/login');
  }
})


router.post('/report_user',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let user_id = req.session.user._id;
      let reporter_id = req.body.reporter_id;
      report_reason = req.body.report_reason
      await userHelpers.sendReportData(user_id,reporter_id,report_reason)
      res.redirect('/settings')
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/report_user_profile',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let user_id = req.session.user._id;
      let reporter_id = req.body.reporter_id;
      report_reason = req.body.report_reason
      await userHelpers.sendReportData(user_id,reporter_id,report_reason)
      res.redirect('/')
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/ask_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      res.render('user/ask_admin',
      {
        showHeader1: true,
        showHeader2: true,
        uber,groupchatcount,
        total_message,
        total_notify_number
      })
    } else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
  res.redirect('/login');
  }
})


router.post('/ask_admin', verifyLogin, async (req, res) => {
  try {
      if (req.session && req.session.user) {
          if (req.session.user.activeStatus == "active") {
              let user_id = req.session.user._id;
              let Name_IN = req.session.user.Name;
              askData = req.body;
              let imageFileNames = [];
              let videoFileNames = [];
              const timestamp = new Date();

              let insertedAskId = await userHelpers.addAskedAdmin(askData,Name_IN,user_id,timestamp);

              const baseFolderPath = `./public/ask-admin/${user_id}/${insertedAskId}/`;
              if (!fs.existsSync(baseFolderPath)) {
                  fs.mkdirSync(baseFolderPath, { recursive: true });
              }
              let files = req.files ? (Array.isArray(req.files.askImage) ? req.files.askImage : [req.files.askImage]) : [];
              files.forEach((file, index) => {
                  let fileExtension = file.name.split('.').pop();
                  let fileName = `${insertedAskId}_${index + 1}.${fileExtension}`;
                  file.mv(baseFolderPath + fileName);
                  if (file.mimetype.includes('image')) {
                      imageFileNames.push(fileName);
                  } else if (file.mimetype.includes('video')) {
                      videoFileNames.push(fileName);
                  }
              });

              await userHelpers.addaskImages(insertedAskId, imageFileNames);
              await userHelpers.addaskVideos(insertedAskId, videoFileNames);
              res.redirect('/contact_admin');
          } else {
              res.render('user/view_page_disabled', { userId: req.session.user._id });
          }
      } else {
          res.redirect('/login');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});


router.get('/one_on_admin_chat/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      try {
      let uber = req.session.user;
      let Sender_Id = req.session.user._id;
      let Reciever_Id = req.params.id;
      let Reciever_Name = await userHelpers.getBaseAdmin();
      let sender = await userHelpers.getProfileDetails(Sender_Id);

          const Sender = req.session.user._id.toString();
          const Receiver = req.params.id.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');

          let time_entered_inchat = new Date();
          time_entered_inchat = time_entered_inchat.toISOString();
          await userHelpers.updateEnteredTimeUnreadAdmin(Sender_Id,Reciever_Id,Room_Id,time_entered_inchat)

          //let lastFetchMessageId = await userHelpers.FetchLastMessageIdAdmin(Sender,Room_Id)

          let sendmessages = await userHelpers.oneONoneCHATAdmin(Sender_Id, Reciever_Id);
          let recievedmessages = await userHelpers.oneONoneCHATAdmin(Reciever_Id, Sender_Id);

          sendmessages = sendmessages.map(message => ({ ...message, Send: true,Sender_Id:Sender_Id,Reciever_Id:Reciever_Id}));
          recievedmessages = recievedmessages.map(message => ({ ...message, Recieve: true,Reciever_Id:Reciever_Id,Sender_Id:Sender_Id}));
          let messages = [...sendmessages, ...recievedmessages];

          // Function to format timestamp into human-readable format
          const formatTimestamp = (timestamp) => {
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
            return new Date(timestamp).toLocaleTimeString('en-US', options);
          };

          messages.sort((a, b) => a.timestamp - b.timestamp);
          messages = messages.map(message => {
            message.videoPresent = message.VideoNames && message.VideoNames.length > 0;
            message.imagePresent = message.ImageNames && message.ImageNames.length > 0;
            message.timestamp = formatTimestamp(message.timestamp);

              if (
                  message.actualMessageId !== "" &&
                  message.actualMessageUsername !== "" &&
                  message.actualMessageContent !== ""
              ) {
                  message.noreply = true;
              }
              if (message.status === "textmessage") {
                message.textMessage = true;
              } else if (message.status === "multimedia") {
                message.multimedia = true;
              }

              // if (message.MessageId === lastFetchMessageId) {
              //   message.last_message = true;
              // }

              return message;
          });
          res.render('user/one_on_admin_chat', 
          {
            uber,
            Room_Id,
            showHeader1: true,
            showHeader2: true,
            messages,
            sender,
            Reciever_Id,
            Reciever_Name,
            groupchatcount,
            total_message,
            total_notify_number
          });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  } 
  else{
    res.render('user/view_page_disabled', {userId:req.session.user._id});
  }
}else {
  res.redirect('/login');
}
});


router.post('/send_one_admin_message/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let Sender_name = req.session.user.Name;
      let Sender_Id = req.session.user._id
      let Reciever_name = null;
      let Reciever_Id = null;
      let actualMessageId = null;
      let MessageId = null;
      let status = "textmessage"
      let actualMessageContent = null;
      try {     
          let messageContent = req.body.messageContent.replace(/[\r\n]+/g, "");
          actualMessageId = req.body.actualMessageId;
          MessageId = req.body.MessageId;
          actualMessageContent = req.body.actualMessageContent;
          Reciever_name = req.body.recieverUsername;
          Reciever_Id = req.body.recieverUserId;
          const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          const timestamp = new Date();
          let time_entered_inchat = timestamp.toISOString();

          await userHelpers.handleOneChatMessageAdmin
          (
            MessageId,messageContent,
            actualMessageId,
            actualMessageContent, 
            timestamp,status,
            Reciever_name,Reciever_Id,
            Sender_name,Sender_Id
          );
          await userHelpers.AddInverseChatAdmin(Sender_Id,Reciever_Id)
          await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id,Sender_Id,Room_Id,time_entered_inchat)
          res.redirect("/one_on_admin_chat/"+req.params.id);
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: "Internal Server Error" });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/add_one_post_admin_tochat/:id', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      const postData = { ...req.body};
      let Sender_name = req.session.user.Name;
      let Reciever_Id = req.params.id;
      let Sender_Id = req.session.user._id;
      const timestamp = new Date();
      let time_entered_inchat = timestamp.toISOString();
      const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
      const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
      const status = "multimedia";
      let MessageId = req.body.MessageId
      let imageFileNames = [];
      let videoFileNames = [];
      const baseFolderPath = `./public/one_on_admin_one_chat/${Sender_Id}/${Reciever_Id}/${MessageId}/`;
      
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      try {
        
        await userHelpers.addPostOneAdmin(postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id);
        await userHelpers.AddInverseChatAdmin(Sender_Id,Reciever_Id)
        await userHelpers.updateEnteredTimeUnreadAdmin(Reciever_Id,Room_Id,time_entered_inchat)


        let files = req.files ? (Array.isArray(req.files.postImageAdmin) ? req.files.postImageAdmin : [req.files.postImageAdmin]) : [];
        files.forEach((file, index) => {
          let fileExtension = file.name.split('.').pop();
          let fileName = `${MessageId}_${index + 1}.${fileExtension}`;
          file.mv(baseFolderPath + fileName);
          if (file.mimetype.includes('image')) {
            imageFileNames.push(fileName);
          } else if (file.mimetype.includes('video')) {
            videoFileNames.push(fileName);
          }
        });

        await userHelpers.addPostOneImagesAdmin(Sender_Id, Reciever_Id, MessageId, imageFileNames);
        await userHelpers.addPostOneVideosAdmin(Sender_Id, Reciever_Id, MessageId, videoFileNames);

        res.redirect('/one_on_admin_chat/' + req.params.id);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.get('/chatwith_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.user) {
      if(req.session.user.activeStatus == "active"){
        let total_notify_number = req.session.total_notify_number;
        let total_message = req.session.total_message;
        let groupchatcount = req.session.groupchatcount;
        let uber = req.session.user;
        const userId = req.session.user._id;
        let ExistingCount = await userHelpers.FetchChatRoomUpdateAdmin(userId);
        let Existing_Reciever_List = ExistingCount.Reciever_List;
        let Existing_Recieve_List_count = Existing_Reciever_List.length;
        let Current_Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(userId) 
        let Current_Recieve_List_count = Current_Reciever_List.length;

        let New_Reciever = [];
        if (Existing_Recieve_List_count < Current_Recieve_List_count) {
            New_Reciever = Current_Reciever_List.filter(currentReceiver => !Existing_Reciever_List.includes(currentReceiver));
        } else {
            New_Reciever = [];
        }

        let Room_Id_Collection = [];
        Existing_Reciever_List.forEach((receiver) => {
          const Sender = userId.toString();
          const Receiver = receiver.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
          Room_Id_Collection.push(Room_Id);
        });

        let fetch = await userHelpers.FetchupdateTimeUnreadAdmin(Room_Id_Collection,userId); // TIME_UNREAD_COLLECTION used       

        let messageCountArray = [];
        for (const Reciever_Id of Existing_Reciever_List) {
          const messageCount = await userHelpers.getArrayCountAdmin(userId, Reciever_Id);// CHAT_BACK_AND_FORTH_BOOK used
          const timeStamp = new Date();
          messageCountArray.push({ userId, Reciever_Id,timeStamp, messageCount });
        }
        
        let Current_Message_Count_Conversation = [];
        Current_Message_Count_Conversation = messageCountArray.map(({ userId, Reciever_Id, timeStamp, messageCount }) => {
          const Sender = userId.toString();
          const Receiver = Reciever_Id.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
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
            one_Broadchat_applicable:false
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


        combinedMessages.forEach(async (message) => {
            if (message.status === "multimedia") {
              message.media = true;
            } else if(message.status === "textmessage"){
              message.text = true;
            }
        });


        res.render('user/chatwith_admin', 
        {
          userId, combinedMessages, 
          showHeader1: true,
          showHeader2: true,
          uber,groupchatcount,
          total_message,
          total_notify_number
        });
      } 
      else{
        res.render('user/view_page_disabled', {userId:req.session.user._id});
      }    
      }else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error("Error fetching chat room update:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});



router.post('/send_timestamp_leave_adminchat/:id', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let Reciever_Id = req.params.id;
      let Sender_Id = req.session.user._id;

      try {
        const messageCount = await userHelpers.getArrayCountAdmin(Sender_Id, Reciever_Id);
        const Sender = req.session.user._id.toString();
        const Receiver = req.params.id.toString();
        const sortedIds = [Sender, Receiver].sort().join('');
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
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
    }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_adminmenu', async(req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let Sender_Id = req.session.user._id;
      const timestamp = req.body.timestamp;
      try{
        let Send_List = await userHelpers.chatCOUNTAdmin(Sender_Id);
        let Reciever_List = await userHelpers.getReceivedMessageSendDetailsAdmin(Sender_Id)
        let Send_List_count = Send_List.length;
        let Recieve_List_count = Reciever_List.length;
        await userHelpers.ChatRoomUpdateAdmin(Sender_Id,timestamp,Send_List,Reciever_List,Send_List_count,Recieve_List_count);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      } 
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.get('/grant_admin_access_buttons',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let userID = req.session.user._id;
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let uber=req.session.user;
      toggle_status = await userHelpers.fetchViewAdminTransferState(userID)
      res.render('user/grant_admin_access_buttons',
      {
        showHeader1: true,
        showHeader2: true,
        uber,groupchatcount,
        total_message,userID,
        total_notify_number,
        toggle_status
      })
    } else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
  res.redirect('/login');
  }
})


router.post('/enable_admin_deleted_one_on_one_chat_visitor', async (req, res) => {
  if (req.session && req.session.user) {
      let userID = req.body.userID;
      try {
          const result = await userHelpers.EnableVisitTransfer(userID);
          res.json({ success: true, powertransfer_enabled: result.powertransfer_enabled }); 
      } catch (error) {
          res.status(500).json({ success: false, error: error.message });
      }
  } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
  }
});




//    NOTIFICATION    


router.post('/send_timestamp_leave_groupchat', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED GROUPCHAT")
      let Sender_Id = req.session.user._id;

      try {
        const timestamp = req.body.timestamp;
        const messageCount = req.body.messageCount;
        await userHelpers.updateTimeOnleaveGroupchat(Sender_Id,timestamp,messageCount).then((response) => {
          res.redirect('/')
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_jobportal', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED JOB PORTAL")
      let Sender_Id = req.session.user._id;

      try {
        const timestamp = req.body.timestamp;
        await userHelpers.updateTimeOnleaveJobPortal(Sender_Id,timestamp).then((response) => {
          res.redirect('/')
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_internportal', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED INTERNSHIP PORTAL")
      let Sender_Id = req.session.user._id;

      try {
        const timestamp = req.body.timestamp;
        await userHelpers.updateTimeOnleaveInternshipPortal(Sender_Id,timestamp).then((response) => {
          res.redirect('/')
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_ownposts', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED OWN POSTS")
      let Sender_Id = req.session.user._id;
      try {
        const timestamp = req.body.timestamp;
        const postsData = req.body.postsData;
        await userHelpers.updateTimeOnleaveOwnPosts(Sender_Id,timestamp,postsData).then((response) => {
          res.json(response);
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_otherposts', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED OTHER POSTS")
      let Sender_Id = req.session.user._id;
      try {
        const timestamp = req.body.timestamp;
        await userHelpers.updateTimeOnleaveOtherPosts(Sender_Id,timestamp).then((response) => {
          res.json(response);
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_mentorportal', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED MENTORSHIP PORTAL")
      let Sender_Id = req.session.user._id;

      try {
        const timestamp = req.body.timestamp;
        let UserMentorQuestions = await userHelpers.getSenderMentors(Sender_Id)
        await userHelpers.equalizeExistingCurrentReplyCount(UserMentorQuestions)
        await userHelpers.updateTimeOnleaveMentorshipPortal(Sender_Id,timestamp).then((response) => {
          res.redirect('/')
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/send_timestamp_leave_view_profileviewers', async (req, res) => {
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      console.log("LEAVED VIEW PROFILE")
      let Sender_Id = req.session.user._id;
      try {
        const timestamp = req.body.timestamp;
        let existing_view_count = req.body.viewDataCOUNT
        await userHelpers.updateTimeOnleaveViewProfileviewers(Sender_Id,timestamp,existing_view_count).then((response) => {
          res.json(response);
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
});


router.post('/reload_root_on_leave_notification', async (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.activeStatus == "active") {
      console.log("LEAVE NOTIFICATION WAS CALLED")
      res.redirect('/');
    } else {
      res.render('user/view_page_disabled', { userId: req.session.user._id });
    }
  } else {
    res.redirect('/login');
  }
});


router.post('/confirm_update_pass_yes', verifyLogin, async (req, res) => {
  if (req.session && req.session.user) {
      if (req.session.user.activeStatus == "active") {
          let user_id = req.session.user._id;
          try {
              await userHelpers.confirmUpdatePass(user_id);
              res.json({ success: true }); // Send success response
          } catch (error) {
              console.error(error);
              res.status(500).json({ error: 'Internal server error' }); // Send error response
          }
      } else {
          res.render('user/view_page_disabled', { userId: req.session.user._id });
      }
  } else {
      res.redirect('/login');
  }
});



router.get('/admin_view_detail_onechat',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let user_id = req.session.user._id; 
      let uber = req.session.user;
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      let adminViewDataOneChat = await userHelpers.getAdminViewDataOneChat(user_id)

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
      res.render('user/admin_view_detail_onechat',
      {
        showHeader1: true,
        showHeader2: true,uber,
        groupchatcount,
        total_message,
        total_notify_number,
        viewDATA
      })   
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

router.post('/confirm_privatechat_access_pass_yes',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let user_id = req.session.user._id;    
      try {
        await userHelpers.confirmAdminPassPrivateChat(user_id);
        res.json({ success: true }); // Send success response
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' }); // Send error response
    }  
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/confirm_privatechat_access_pass_no',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let adminID = await userHelpers.getAdminID();
      adminID = adminID.toString();
      let user_id = req.session.user._id;  
      let uber = req.session.user;
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      res.render('user/user_denied_adminview_onechat',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number,
          adminID
        }
      ) 
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})


router.get('/confirm_update_pass_no',verifyLogin,async(req,res)=>{
  if (req.session && req.session.user) {
    if(req.session.user.activeStatus == "active"){
      let adminID = await userHelpers.getAdminID();
      adminID = adminID.toString();
      let user_id = req.session.user._id;  
      let uber = req.session.user;
      let total_notify_number = req.session.total_notify_number;
      let total_message = req.session.total_message;
      let groupchatcount = req.session.groupchatcount;
      res.render('user/user_denied_changepass',
        {
          showHeader1: true,
          showHeader2: true,uber,
          groupchatcount,
          total_message,
          total_notify_number,
          adminID
        }
      ) 
    } 
    else{
      res.render('user/view_page_disabled', {userId:req.session.user._id});
    }
  }else {
    res.redirect('/login');
  }
})

module.exports = router;
