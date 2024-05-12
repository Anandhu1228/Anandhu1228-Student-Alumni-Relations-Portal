var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');
const { parse } = require('handlebars')
const adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');
const session = require('express-session');
const { log } = require('handlebars');
const { response } = require('../app');
const verifyLogin = (req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/admin')
  }
}

router.get('/', function(req, res, next) {
  res.render('admin/login_button')
});

router.get('/admin-view-page',async (req,res)=>{
  if(req.session.adminLoggedIn){
    aber = req.session.admin
    let adminId = req.session.admin._id;
    await adminHelpers.insertloggedINTime(adminId)
    res.render('admin/admin-view-page',{showAdminHeader1 : true,aber})
  }else{
    res.render('admin/adminlogin')
    req.session.adminLoginErr = false
  }
})

router.post('/adminlogin', (req, res) => {
  adminHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminLoggedIn = true;
      req.session.admin = response.admin;
      res.redirect('/admin/admin-view-page');
    } else if(response.accesssfail){
      res.render('admin/adminlogin',{admin_block:true});
    }
      else{
      req.session.adminLoginErr = "Invalid Username or Password";
      res.render('admin/adminlogin',{"LoginERROR":req.session.adminLoginErr});
      //res.render('admin/adminlogin')
      //res.redirect('/admin/adminlogin');
    }
  });
});

router.get('/adminlogout', async (req, res) => {
  if (req.session && req.session.admin) {
    let adminId = req.session.admin._id;
    req.session.destroy(async err => {
      if (err) {
        console.log(err);
      } else {
        await adminHelpers.insertloggedOUTTime(adminId);
        res.redirect('/admin');
      }
    });
  }else {
    res.redirect('/admin');
  }
});

router.get('/admin-view-profile/:id', verifyLogin, async (req, res) => {
  let profileCheck = null;
  let view = req.params.id;
  if (req.session && req.session.admin) {
    let aber = req.session.admin;
    if (aber != view){
      profileCheck
    }
    const profile = await adminHelpers.getProfile(view);

    let working = null;
    let owns = null;
    const empStatus = profile.employmentStatus;
    if (empStatus == "working") {
      working = true;
      if (profile.working && profile.working.WorkingownedPreviousStorage && profile.working.WorkingownedPreviousStorage.length > 0) {
        var WorkingownedPreviousStorageConfirmed = true;
      }
    } else if (empStatus == "ownCompany") {
      owns = true;
      if (profile.ownCompany && profile.ownCompany.subbranches && profile.ownCompany.subbranches.length > 0) {
        var haveSubs = true;
      }
      if (profile.ownCompany && profile.ownCompany.OwnadditionalFoundedCompanyStorage && profile.ownCompany.OwnadditionalFoundedCompanyStorage.length > 0) {
        var OwnadditionalFoundedCompanyStorageConfirmed = true;
      }
    }

    let checkNote = null;
    let NoNote = null;
    let note = profile.Note;
    if (!note || note.trim() === "") {
      NoNote = true;
    } else {
      checkNote = true;
    }

    res.render('admin/admin-view-profile', {
      profileCheck,
      showAdminHeader1: true,
      aber,
      profile,
      working,
      owns,
      NoNote,
      checkNote,
      haveSubs,
      WorkingownedPreviousStorageConfirmed,
      OwnadditionalFoundedCompanyStorageConfirmed
    });
  } else {
    res.redirect('/admin')
  }
});


router.get('/search_alumni_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_Alumni_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-alumni_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    Name = req.body.searchName;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminAlumniNameThroughSearch(Name);
    res.render('admin/search_Alumni_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/alumni-advance-search_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/alumni-advance-search_admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-alumni-by-passoutyear_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_AlumniPassout_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-alumni-by-passoutyear_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    passout = req.body.searchPassout;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminAlumniPassoutThroughSearch(passout);
    res.render('admin/search_AlumniPassout_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-alumni-by-location_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_AlumniLocation_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-alumni-by-location_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    location = req.body.searchLocation;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminAlumniLocationThroughSearch(location);
    res.render('admin/search_AlumniLocation_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-alumni-by-domain_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_AlumniDomain_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-alumni-by-domain_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    domain = req.body.searchDomain;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminAlumniDomainThroughSearch(domain);
    res.render('admin/search_AlumniDomain_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search_student_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_Student_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-student_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    Name = req.body.searchName;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminStudentNameThroughSearch(Name);
    res.render('admin/search_Student_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/student-advance-search_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/student-advance-search_admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-student-by-admissionyear_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_StudentAdmission_Year_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-student-by-admissionyear_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    admission_year = req.body.searchAdmission;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminStudentAdmissionYearThroughSearch(admission_year);
    res.render('admin/search_StudentAdmission_Year_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-student-by-location_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_StudentLocation_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-student-by-location_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    location = req.body.searchLocation;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminStudentLocationThroughSearch(location);
    res.render('admin/search_StudentLocation_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-student-by-domain_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_StudentDomain_Admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-student-by-domain_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    domain = req.body.searchDomain;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminStudentDomainThroughSearch(domain);
    res.render('admin/search_StudentDomain_Admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-alumni-by-filter_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search-alumni-by-filter_admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-alumni-by-filter_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    filter = req.body;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminAlumniFilteredThroughSearch(filter);
    res.render('admin/search-alumni-by-filter_admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search-student-by-filter_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search-student-by-filter_admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search-student-by-filter_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    filter = req.body;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetStudentAdminFilteredThroughSearch(filter);
    res.render('admin/search-student-by-filter_admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/search_removal_candidate',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_removal_candidate',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search_removal_candidate',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    Name = req.body.searchName;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAdminCandidateThroughSearch(Name);
    res.render('admin/search_removal_candidate',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.post('/delete_candidate_by_admin',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    await adminHelpers.deleteCandidateByAdmin(req.body.ProfileID).then((response)=>{
      res.json(response)
    })
    await adminHelpers.insertRemovedCandidateByAdminLogs(req.body.ProfileID,req.body.ProfileNAME,req.body.ProfileSTATUS,admin_id)
  }else {
    res.redirect('/admin');
  }
})

router.get('/search_company_owned_alumni', verifyLogin, async(req, res) => {
  if (req.session && req.session.admin) {
    let aber = req.session.admin;
    let usersAll = await adminHelpers.GetAlumniOwnedCompany();
    usersAll.forEach(user => {
      let empStatus = user.employmentStatus;
      if (empStatus == "working") {
        user.isworking = true;
        if (user.working && user.working.WorkingownedPreviousStorage && user.working.WorkingownedPreviousStorage.length > 0) {
          user.WorkingownedPreviousStorageConfirmed = true;
        }
      } else if (empStatus == "ownCompany") {
        user.owns = true;
        if (user.ownCompany && user.ownCompany.OwnadditionalFoundedCompanyStorage && user.ownCompany.OwnadditionalFoundedCompanyStorage.length > 0) {
          user.OwnadditionalFoundedCompanyStorageConfirmed = true;
        }
      }
    });
    res.render('admin/search_company_owned_alumni', {
      showAdminHeader1: true,
      aber,
      usersAll
    });
  } else {
    res.redirect('/admin');
  }
});



router.get('/search_working_alumni_in_company',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/search_working_alumni_in_company',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search_working_alumni_in_company',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    companyName = req.body.companyName;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAlumniSearchWorkingCompany(companyName);
    res.render('admin/search_working_alumni_in_company',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/get_all_working_alumni',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAlumniWorkingCompany();
    res.render('admin/get_all_working_alumni',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/admin_other_functionalities',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/admin_other_functionalities',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/edit_status_user',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/edit_status_user',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/edit_status_user',async(req,res,next)=>{
  if (req.session && req.session.admin) {
    Name = req.body.searchName;
    let aber=req.session.admin;
    let usersAll = await adminHelpers.GetAllUserThroughSearch(Name);
    res.render('admin/edit_status_user',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/edit_status_user_admin/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let userID = req.params.id;
    const profile = await adminHelpers.getProfile(userID);
    res.render('admin/edit_status_user_admin',{showAdminHeader1: true,aber,status:profile.Status,profile})
  }else {
    res.redirect('/admin');
  }
})

router.post('/edit_status_user_admin/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let userID = req.params.id;
    admin_id = req.session.admin._id;
    Status = req.body.Status;
    Name = req.body.Name;
    await adminHelpers.changeUserStatus(userID,Status);
    await adminHelpers.changeUserStatusByAdmin(userID,Name,Status,admin_id)
    res.redirect('/admin/edit_status_user')
  }else {
    res.redirect('/admin');
  }
})

router.get('/edit_status_userall_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    await adminHelpers.changeAllUserStatus()
    res.redirect('/admin/edit_status_user')
  }else {
    res.redirect('/admin');
  }
})


router.get('/view_deleted_group_chat_messages',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    try {
        let aber = req.session.admin;
        let admin_id = req.session.admin._id;
        let messages = await adminHelpers.getAllDeletedGroupMessageAdmin();
        await adminHelpers.AdminViewDeletedGroupChat(admin_id);
        const formatTimestamp = (timestamp) => {
          const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
          return new Date(timestamp).toLocaleTimeString('en-US', options);
        };
          
          messages = messages.map(message => {
          message.videoPresent = message.VideoNames && message.VideoNames.length > 0;
          message.imagePresent = message.ImageNames && message.ImageNames.length > 0;
          message.timestamp = formatTimestamp(message.timestamp); // Format timestamp
          message.deletedtime = formatTimestamp(message.deletedtime);

            if (message.SENDBY === "USER") {
                message.USERCONFIRMED = true;
            } else if (message.SENDBY === "ADMIN") {
              message.ADMINCONFIRMED = true;
          }

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
            res.render('admin/view_deleted_group_chat_messages', { 
              showAdminHeader1: true, 
                aber, 
                messages, 
            });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
  }else {
    res.redirect('/admin');
  }
})


router.get('/send_delete_group_chat_messages_admin', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    try {
        const userId = req.session.admin._id;  // Use req.session.admin._id directly
        let aber = req.session.admin;
        let requiredID = req.session.admin._id;
        let messages = await adminHelpers.getAllMessageAdmin();
        let user = await adminHelpers.getAdminBasicProfileDetails(userId);

        const formatTimestamp = (timestamp) => {
          const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
          return new Date(timestamp).toLocaleTimeString('en-US', options);
        };

        messages = messages.map(message => {
          message.videoPresent = message.VideoNames && message.VideoNames.length > 0;
          message.imagePresent = message.ImageNames && message.ImageNames.length > 0;
          message.timestamp = formatTimestamp(message.timestamp); // Format timestamp

            if (message.userId === userId) {
                message.delete = true;
            }

            if (message.deleteStatus === 'deletedMessage' && message.deleted_time) {
              message.deleted_time = formatTimestamp(message.deleted_time);
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
            res.render('admin/send_delete_group_chat_messages_admin', { 
              showAdminHeader1: true, 
                user, 
                userId, 
                aber, 
                messages, 
                requiredID,
            });
        } else {
            res.status(404).send("admin not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
  }else {
    res.redirect('/admin');
  }
});




router.post('/send-message_admin/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    let name = req.session.admin.Name;
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
        await adminHelpers.handleGroupChatMessageAdmin(MessageId,userId,name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY);
        res.redirect("/admin/send_delete_group_chat_messages_admin");
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }else {
    res.redirect('/admin');
  }
});


router.post('/delete-message-from-groupchat_admin',(req,res,next)=>{
  if (req.session && req.session.admin) {
    adminHelpers.deleteMessageAdmin(req.body.MessagE).then((response)=>{
      res.json(response)
    })
  }else {
    res.redirect('/admin');
  }
})


router.post('/add-post-togroup_admin/:id', (req, res) => {
  if (req.session && req.session.admin) {
    const postData = { ...req.body };
    const timestamp = new Date();
    const status = "multimedia"
    let User_Id = req.session.admin._id;
    let MessageId = req.body.MessageId;
    let imageFileNames = [];
    let videoFileNames = [];
    const baseFolderPath = `./public/group-media/${User_Id}/${MessageId}/`;
    if (!fs.existsSync(baseFolderPath)) {
      fs.mkdirSync(baseFolderPath, { recursive: true });
    }
    adminHelpers.addPostGroupAdmin(postData, timestamp, status).then((insertedPostId) => {
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
      adminHelpers.addPostGroupImagesAdmin(MessageId, imageFileNames);
      adminHelpers.addPostGroupVideosAdmin(MessageId, videoFileNames);
      res.redirect('/admin/send_delete_group_chat_messages_admin');
    }).catch((error) => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
  }else {
    res.redirect('/admin');
  }
});


router.get('/view_deleted_one_one_chat',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/view_search_deleted_one_first_candidate',
    {showAdminHeader1: true,
      aber,
      showsearch:true})
  }else {
    res.redirect('/admin');
  }
})

router.post('/view_search_deleted_one_first_candidate',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/view_search_deleted_one_first_candidate',
    {showAdminHeader1: true,
      aber,
      usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/view_search_deleted_one_first_candidate/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let sender = req.params.id;
    let aber=req.session.admin;
    let sender_detail = await adminHelpers.getBasicProfile(sender);
    let sender_id = sender_detail._id;
    res.render('admin/view_search_deleted_one_second_candidate',
    {showAdminHeader1: true,
      aber,sender_detail,
      sender_id,
      has_sender:true,
      showsearch:true})
  }else {
    res.redirect('/admin');
  }
})

router.post('/view_search_deleted_one_second_candidate',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let sender_id = req.body.sender_id;
    let sender_detail = await adminHelpers.getBasicProfile(sender_id);
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/view_search_deleted_one_second_candidate',
    {showAdminHeader1: true,
      aber,usersAll,
      sender_id,
      sender_detail,
      has_sender:true})
  }else {
    res.redirect('/admin');
  }
})

router.post('/view_deleted_one_one_chat', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      let aber = req.session.admin;
      let admin_id = req.session.admin._id;
      let sender_id = req.body.sender_id;
      let reciever_id = req.body.reciever_id;
      let sender_conscent = await adminHelpers.fetchUserConcentOnDeletedOneChatView(sender_id)
      let reciever_conscent = await adminHelpers.fetchUserConcentOnDeletedOneChatView(reciever_id)
      if(sender_conscent.viewEnabledForAdmin === true || reciever_conscent.viewEnabledForAdmin === true)
        {
          await userHelpers.addAdminViewDelMesStat(sender_id,reciever_id)
          await userHelpers.addAdminViewDelMesStat(reciever_id,sender_id)
          let del_one_mess = await adminHelpers.getOneDelMess(sender_id,reciever_id)
          const formatTimestamp = (timestamp) => {
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
            return new Date(timestamp).toLocaleTimeString('en-US', options);
          };
          del_one_mess.sort((a, b) => a.timestamp - b.timestamp);
          del_one_mess = del_one_mess.map(message => {
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
              return message;
          });
          let sender = await adminHelpers.getBasicProfile(sender_id);
          let reciever = await adminHelpers.getBasicProfile(reciever_id);
          await adminHelpers.OneonONEchatViewedLogByAdmin(sender_id,sender.Name,reciever_id,reciever.Name,admin_id)
          res.render('admin/view_deleted_one_one_chat', 
          { 
            showAdminHeader1: true, 
            aber,del_one_mess,sender,
            reciever,sender_id,
            reciever_id
          });
        }
        else{
          res.render('admin/view_access_denied_user',
            {
              showAdminHeader1: true, aber
            }
          )
        }
    } else {
      res.redirect('/admin');
  }
});


/*router.get('/get_user_suggestions', verifyLogin, async (req, res) => {
  try {
      const searchName = req.query.search;
      if (!searchName || searchName.length < 3) {
          res.json({ suggestions: [] }); // Return empty array if search term is too short
          return;
      }
      const suggestions = await adminHelpers.GetUserSuggestions(searchName);
      res.json({ suggestions });
      console.log("SUGGESTIONS : ",suggestions)
  } catch (error) {
      console.error('Error fetching user suggestions:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});*/


router.get('/add_job_to_portal',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let admin_id = req.session.admin._id;
    let admin = await adminHelpers.getAdminBasicProfileDetails(admin_id);
    res.render('admin/add_job_to_portal',{showAdminHeader1: true,aber,admin})
  }else {
    res.redirect('/admin');
  }
})

router.post('/add_job_to_portal/:id', async (req, res) => {
  if (req.session && req.session.admin) {
    const userData = { ...req.body, UserId: req.params.id };
    await adminHelpers.addJob_by_admin(userData).then((insertedJobId) => {
      let image = req.files ? req.files.JobImage : null;
      if (image) {
        image.mv('./public/job-images/' + insertedJobId + '.jpg');
      }
      res.redirect('/admin/admin_other_functionalities');
    }).catch((error) => {
      console.error(error);
      res.status(500).send('Internal Server Error');
    });
  }else {
    res.redirect('/admin');
  }
});

router.get('/view_edit_delete_admin_posted_jobs',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let admin_id = req.session.admin._id;
    let jobs = await adminHelpers.getEditAdminJobDetails(admin_id);
    for (const job of jobs) {
      const imagePath = path.join(__dirname, '../public/job-images/', `${job._id}.jpg`);
      job.jobImage = fs.existsSync(imagePath);
    }
    res.render('admin/view_edit_delete_admin_posted_jobs',{showAdminHeader1: true,aber,jobs})
  }else {
    res.redirect('/admin');
  }
})

router.get('/edit_admin_job/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    const jobId = req.params.id;
    let job = await adminHelpers.getIndividualAdminJobDetail(jobId);
    res.render('admin/edit_admin_job', { job });
  } else {
    res.redirect('/admin');
  }
});


router.get('/view_admin_job_requests/:id',async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber = req.session.admin;
    const jobId = req.params.id;
    let score = await adminHelpers.putJobRecomendationScoreAdmin(jobId);
    let user = await adminHelpers.getuserDetailsForrequestAdmin(score)
    console.log("USER IS : ",user)
    res.render('admin/view_admin_job_requests', { user,showAdminHeader1: true,aber });
  }else {
    res.redirect('/admin');
  }
})


router.post('/edit_admin_job/:id',async(req,res)=>{
  if (req.session && req.session.admin) {
    let userdetail = await adminHelpers.findUserIdFromJobIdAdmin(req.params.id)
    let userId = userdetail.userId
    adminHelpers.updateJobAdmin(req.params.id,req.body).then(()=>{
      res.redirect('/admin/view_edit_delete_admin_posted_jobs')
      let image = req.files ? req.files.JobImage : null;
      if (image) {
        image.mv('./public/job-images/' + req.params.id + '.jpg');
      }
    })
  }else {
    res.redirect('/admin');
  }
})

router.post('/delete_admin_job_form_portal',async (req,res,next)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    await adminHelpers.deleteAdminJob(req.body.JoB).then((response)=>{
      res.json(response)
    })
    await adminHelpers.AddJobDeleteLogByAdmin(req.body.JoB,req.body.ProfilEID,req.body.ProfileENAME,admin_id)
  }else {
    res.redirect('/admin');
  }
})

router.get('/delete_job_from_portal',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let jobs = await adminHelpers.getJobDetailsAdmin();
    res.render('admin/delete_job_from_portal',{showAdminHeader1: true,aber,jobs})
  }else {
    res.redirect('/admin');
  }
})

router.get('/delete_internship_from_portal',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let interns = await adminHelpers.getInternDetailsAdmin();
    res.render('admin/delete_internship_from_portal',{showAdminHeader1: true,aber,interns})
  }else {
    res.redirect('/admin');
  }
})

router.get('/internship_details/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let indintern = await adminHelpers.getIndividualInternshipDetailsAdmin(req.params.id);
    res.render('admin/internship_details',{showAdminHeader1: true,aber,indintern})
  }else {
    res.redirect('/admin');
  }
})


router.post('/delete_admin_intern_form_portal',async (req,res,next)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    await adminHelpers.deleteInternshipAdmin(req.body.InterN).then((response)=>{
      res.json(response)
    })
    await adminHelpers.AddInternDeleteLogByAdmin(req.body.InterN,req.body.ProfilEID,req.body.ProfilENAME,admin_id)
  }else {
    res.redirect('/admin');
  }
})

router.get('/delete_mentorship_entry_from_portal',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let mentors = await adminHelpers.getMentorDetailsAdmin();
    mentors.forEach(mentor => {
      if (mentor.replies && Array.isArray(mentor.replies)) {
        mentor.replies.forEach(reply => {
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
    res.render('admin/delete_mentorship_entry_from_portal',{showAdminHeader1: true,aber,mentors})
  }else {
    res.redirect('/admin');
  }
})

router.post('/search_mentor_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let mentorkeyword = req.body;
    let mentors = await adminHelpers.searchMentorAdmin(mentorkeyword);
    mentors.forEach(mentor => {
      if (mentor.replies && Array.isArray(mentor.replies)) {
        mentor.replies.forEach(reply => {
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
    res.render('admin/delete_mentorship_entry_from_portal',{showAdminHeader1: true,aber,mentors})
  }else {
    res.redirect('/admin');
  }
})



router.post('/delete_mentor_admin',async (req,res,next)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    await adminHelpers.deleteMentorAdmin(req.body.MentoR).then((response)=>{
      res.json(response)
    })
    await adminHelpers.AddMentorQuestionDeleteLogByAdmin(req.body.MentoR,req.body.ProfileENAME,req.body.ProfileID,admin_id)
  }else {
    res.redirect('/admin');
  }
})


router.post('/delete_mentor_reply_admin',async (req,res,next)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    await adminHelpers.deleteMentorReplyAdmin(req.body.MentorreplY,req.body.QuestioN).then((response)=>{
      res.json(response)
    })
    await adminHelpers.AddMentorReplyDeleteLogByAdmin(req.body.MentorreplY,req.body.QuestioN,req.body.ProfileENAME,req.body.ProfileID,admin_id)
  }else {
    res.redirect('/admin');
  }
})


router.get('/add_user_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    res.render('admin/add_user_admin',)
  }else {
    res.redirect('/admin');
  }
})

router.post('/add_user_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    try {
      let status = req.body.Status;
      let name = req.body.Name;
      let inserted_id = await adminHelpers.doAddUser(req.body);
      inserted_id = inserted_id.toString();
      res.redirect('/admin/admin_other_functionalities');
      await adminHelpers.ViewAddUserByAdmin(name,status,inserted_id,admin_id);
    } catch (error) {
      console.error("Error:", error);
  }
  }else {
    res.redirect('/admin');
  }
})


router.get('/edit_profile_user_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/edit_profile_user_admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/edit_profile_get_user_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/edit_profile_user_admin',{showAdminHeader1: true,aber,usersAll})
  }else {
    res.redirect('/admin');
  }
})

router.get('/admin_user_edit_profile/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber = req.session.admin;
    const user = await adminHelpers.getProfile(req.params.id);
    res.render('admin/admin_user_edit_profile',{showAdminHeader1: true,aber,user})
  }else {
    res.redirect('/admin');
  }
})

router.post('/admin_user_edit_profile/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    await adminHelpers.updateProfileUserAdmin(req.params.id,req.body)
    await adminHelpers.AddEditProfileByAdminLog(req.params.id,req.body.Name,admin_id)
    res.redirect('/admin/edit_profile_user_admin')
  }else {
    res.redirect('/admin');
  }
})


router.get('/update_user_profile_admin/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber = req.session.admin;
    const user = await adminHelpers.getProfile(req.params.id);
    res.render('admin/admin_user_update_profile',{showAdminHeader1: true,aber,user,empstatus: user.employmentStatus })
  }else {
    res.redirect('/admin');
  }
})


router.post('/admin_user_update_profile/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    let view = req.params.id;
    await adminHelpers.updateuserProfileAdmin(req.params.id,req.body)
    await adminHelpers.AddUpdateProfileByAdminLog(view,req.body.Name,admin_id)
    res.redirect('/admin/admin_user_edit_profile/'+view)
  }else {
    res.redirect('/admin');
  }
})

router.get('/update_password_user_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    res.render('admin/update_password_user_b-admin')
  }else {
    res.redirect('/admin');
  }
})

router.post('/update_password_user_b-admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/update_password_user_b-admin',{usersAll,showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})


router.get('/update_password_user_admin/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let view = req.params.id;
    let user = await adminHelpers.getBasicProfile(view)
    let Name = user.Name;
    res.render('admin/update_password_user_admin',{view,Name})
  }else {
    res.redirect('/admin');
  }
})

router.post('/update_password_user_admin/:id',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let view = req.params.id;
    let admin_id = req.session.admin._id;
    await adminHelpers.updateUPassUserByAdmin(view,req.body)
    await userHelpers.updatePassCount(view)
    await adminHelpers.AddUpdateUserPasswordByAdminLog(view,req.body.Name,admin_id)
    res.redirect('/admin/admin_other_functionalities')
  }else {
    res.redirect('/admin');
  }
})


router.get('/user_password_update_log_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/user_password_update_log_b-admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.post('/user_password_update_log_b-admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/user_password_update_log_b-admin',{usersAll,showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/user_password_update_log_admin/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      let aber = req.session.admin; 
      let admin_id = req.session.admin._id;
      let view = req.params.id;
      let user = await adminHelpers.getBasicProfile(view)
      let Name = user.Name;
      let logs = await adminHelpers.getUpdatePassLogDetailsAdmin(view);
      await adminHelpers.AddAdminViewPasswordLogOfUser(view,Name,admin_id)
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

      
      res.render('admin/user_password_update_log_admin', { showAdminHeader1: true, aber, formattedLogs });
  } else {
      res.redirect('/admin');
  }
});



router.get('/delete_post_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/delete_post_b-admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})


router.post('/delete_post_b-admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/delete_post_b-admin',{usersAll,showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/delete_post_admin/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      let aber = req.session.admin;
      let view = req.params.id;
      let posts = await adminHelpers.getPostDetails(view);
      posts = posts.map(post => {
        let imagePresent = post.ImageNames && post.ImageNames.length > 0;
        let videoPresent = post.VideoNames && post.VideoNames.length > 0;
        let postLocation = post.location !== "";
        return {
          ...post,
          imagePresent,
          videoPresent,
          postLocation,
        };
      });
      res.render('admin/delete_post_admin', { showAdminHeader1: true, aber,posts});
  } else {
      res.redirect('/admin');
  }
});


router.post('/delete_post_admin/:id', async (req, res, next) => {
  if (req.session && req.session.admin) {
    let admin_id = req.session.admin._id;
    view = req.params.id;
    let post_here = await adminHelpers.getIndividualPostDetails(view);
   await  adminHelpers.deletePostAdmin(view).then((response) => {
        res.json(response);
    });
    let Profile_Id = post_here.UserId;
    let Profile_Name = post_here.Name;
    await adminHelpers.AdminDeletedPosts(Profile_Id,Profile_Name,view,admin_id)
  }else {
    res.redirect('/admin');
  }
});



router.get('/message_all_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Admin_broadcasts = await adminHelpers.GetAllAdminBroadcastMessage();

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
    console.log("ADMIN BROADCAST :",Admin_broadcasts)
    res.render('admin/message_all_admin',{showAdminHeader1: true,aber,Admin_broadcasts})
  }else {
    res.redirect('/admin');
  }
})

router.post('/message_all_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Sender_name = req.session.admin.Name;
    let Sender_Id = req.session.admin._id
    let status = "textmessage";
    let type_of_message = "broadcast";
    console.log("ADMIN  BROADCAST : ",req.body)
    try { 
      let messageContent = req.body.messageContent.replace(/[\r\n]+/g, "");
      let actualMessageId = req.body.actualMessageId;
      let MessageId = req.body.MessageId;
      let actualMessageContent = req.body.actualMessageContent;
      const timestamp = new Date();
      await adminHelpers.handleBroadcastMessage(MessageId,messageContent,actualMessageId,actualMessageContent, timestamp,status,Sender_name,Sender_Id,type_of_message);
      res.redirect("/admin/message_all_admin");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
}
}else {
res.redirect('/admin');
}
});

router.post('/message_all_post_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    console.log("ADMIN POST BROADCAST : ",req.body)
    const postData = { ...req.body};
    let Sender_name = req.session.admin.Name;
    let Sender_Id = req.session.admin._id;
    const timestamp = new Date();
    const status = "multimedia";
    let MessageId = req.body.MessageId
    let imageFileNames = [];
    let videoFileNames = [];
    const baseFolderPath = `./public/broadcast/${MessageId}/`;
    
    if (!fs.existsSync(baseFolderPath)) {
      fs.mkdirSync(baseFolderPath, { recursive: true });
    }
    try {
      await adminHelpers.addPostOneBroadcastAdmin(postData, timestamp, status, Sender_name, Sender_Id);

      let files = req.files ? (Array.isArray(req.files.postImage) ? req.files.postImage : [req.files.postImage]) : [];
      files.forEach((file, index) => {
        let fileExtension = file.name.split('.').pop();
        let fileName = `${MessageId}_${index + 1}.${fileExtension}`;
        file.mv(baseFolderPath + fileName);
        if (file.mimetype.includes('image')) {
          imageFileNames.push(fileName);
          console.log("IMAGE PUSHED")
        } else if (file.mimetype.includes('video')) {
          videoFileNames.push(fileName);
          console.log("VIDEO PUSHED")
        }
      });

      console.log(imageFileNames)

      await adminHelpers.addPostOneImagesAdminBroadcast(Sender_Id, MessageId, imageFileNames);
      await adminHelpers.addPostOneVideosAdminBroadcast(Sender_Id, MessageId, videoFileNames);

      res.redirect("/admin/message_all_admin");
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }else {
    res.redirect('/admin');
  }
})


router.post('/delete-message-from-broadcast',(req,res,next)=>{
  if (req.session && req.session.admin) {
    adminHelpers.deleteBroadcastMessage(req.body.MessagE).then((response)=>{
      res.json(response)
    })
  }else {
    res.redirect('/admin');
  }
})


router.get('/view_user_log_admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    res.render('admin/view_user_log_b-admin',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})


router.post('/view_user_log_b-admin',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let aber=req.session.admin;
    let Name = req.body.searchName;
    let usersAll =  await adminHelpers.GetAllUserThroughSearch(Name)
    res.render('admin/view_user_log_b-admin',{usersAll,showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/view_user_log_admin/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      let aber = req.session.admin;
      let view = req.params.id;
      let admin_id = req.session.admin._id;
      let user = await adminHelpers.getBasicProfile(view)
      let Name = user.Name;
      let logs = await adminHelpers.getUserLoggedLogDetailsAdmin(view);
      await adminHelpers.AddAdminViewLoggedLogOfUser(view,Name,admin_id)
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
      res.render('admin/view_user_log_admin', { showAdminHeader1: true, aber,formattedLogs });
  } else {
      res.redirect('/admin');
  }
});


router.get('/enable_power_transfer',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    let admin_ID = req.session.admin._id
    let aber=req.session.admin;
    toggle_status = await adminHelpers.fetchPowerTransferState(admin_ID)
    res.render('admin/enable_power_transfer_admin',{showAdminHeader1: true,aber,admin_ID,toggle_status})
  }else {
    res.redirect('/admin');
  }
})

router.post('/enable_power_transfer', async (req, res) => {
  if (req.session && req.session.admin) {
      let admin_ID = req.body.admin_ID;
      try {
          const result = await adminHelpers.EnablePowerTransfer(admin_ID);
          res.json({ success: true, powertransfer_enabled: result.powertransfer_enabled }); // Include powertransfer_enabled in response
      } catch (error) {
          res.status(500).json({ success: false, error: error.message });
      }
  } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
  }
});


router.get('/admin_message_enquiries',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    res.render('admin/admin_message_enquiries',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})

router.get('/admin_message_enquiries',verifyLogin,async(req,res)=>{
  if (req.session && req.session.admin) {
    res.render('admin/admin_message_enquiries',{showAdminHeader1: true,aber})
  }else {
    res.redirect('/admin');
  }
})


router.get('/enquirywith_admin', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      let enquiries = await adminHelpers.GetallEnquiries();

      // Convert timestamp to human-readable format and set badge as true if applicable
      enquiries.forEach(enquiry => {
         

          if (enquiry.admin_opened_time && enquiry.admin_opened_time !== "") {
              const adminOpenedTime = new Date(enquiry.admin_opened_time);
              const entryTimestamp = new Date(enquiry.timestamp);

              if (adminOpenedTime > entryTimestamp) {
                  enquiry.badgeApplicable = 'notapplicable';
              }
          }
          if (enquiry.badgeApplicable === 'applicable') {
            enquiry.badge = true;
          } else {
            enquiry.badge = false;
          }

          enquiry.timestamp = new Date(enquiry.timestamp).toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });

      });

      console.log("ENQUIRY IS : ",enquiries)
      res.render('admin/enquirywith_admin', { showAdminHeader1: true, aber, enquiries });
  } else {
      res.redirect('/admin');
  }
});


router.get('/view_each_enquiry/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
    let view_enquery = req.params.id;
    let enquiries = await adminHelpers.GetindiEnquiries(view_enquery);
    enquiries.timestamp = new Date(enquiries.timestamp).toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
    let ImagePresent = enquiries.ImageNames && enquiries.ImageNames.length > 0;
    let VideoPresent = enquiries.VideoNames && enquiries.VideoNames.length > 0;
    let multimedia = ImagePresent || VideoPresent;
    await adminHelpers.AddAdminEnquiryView(view_enquery)
    res.render('admin/view_each_enquiry', { 
      showAdminHeader1: true, 
      aber, 
      enquiries, 
      ImagePresent, 
      VideoPresent, 
      multimedia 
    });
  } else {
    res.redirect('/admin');
  }
})



router.get('/one_on_admin_chat/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      try {
      let aber = req.session.admin;
      let Sender_Id = req.session.admin._id;
      let Reciever_Id = req.params.id;
      let Sender_Name = req.session.admin.Name;

      let reciever = await userHelpers.getProfileDetails(Reciever_Id);

          const Sender = req.session.admin._id.toString();
          const Receiver = req.params.id.toString();
          const sortedIds = [Sender, Receiver].sort().join('');
          const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');

          let time_entered_inchat = new Date();
          time_entered_inchat = time_entered_inchat.toISOString();
          await userHelpers.updateEnteredTimeUnreadAdmin(Sender_Id,Reciever_Id,Room_Id,time_entered_inchat)

          //let lastFetchMessageId = await userHelpers.FetchLastMessageId(Sender,Room_Id)

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
          res.render('admin/one_on_admin_chat', {
            showAdminHeader1: true,
            aber,Room_Id,
            messages,
            reciever,
            Reciever_Id,
            Sender_Name,
            Sender_Id
          });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
}else {
  res.redirect('/admin');
}
});


router.post('/send_one_admin_message/:id', verifyLogin, async (req, res) => {
  if (req.session && req.session.admin) {
      let Sender_name = req.session.admin.Name;
      let Sender_Id = req.session.admin._id
      let Reciever_name = null;
      let Reciever_Id = null;
      let actualMessageId = null;
      let MessageId = null;
      let status = "textmessage"
      let actualMessageContent = null;
      try {     
          let messageContent = req.body.messageContent.replace(/[\r\n]+/g, " ");
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
          res.redirect("/admin/one_on_admin_chat/"+req.params.id);
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: "Internal Server Error" });
      }
  }else {
    res.redirect('/admin');
  }
});

router.post('/add_one_post_admin_tochat/:id', async (req, res) => {
  if (req.session && req.session.admin) {
      const postData = { ...req.body};
      let Sender_name = req.session.admin.Name;
      let Reciever_Id = req.params.id;
      let Sender_Id = req.session.admin._id;
      const timestamp = new Date();
      const sortedIds = [Sender_Id, Reciever_Id].sort().join('');
      const Room_Id = sortedIds.replace(/[^a-zA-Z0-9]/g, '');
      let time_entered_inchat = timestamp.toISOString();
      const status = "multimedia";
      let MessageId = req.body.MessageId;
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

        res.redirect('/admin/one_on_admin_chat/' + req.params.id);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
  }else {
    res.redirect('/admin');
  }
});

router.get('/chatwith_admin', verifyLogin, async (req, res) => {
  try {
    if (req.session && req.session.admin) {
        let aber = req.session.admin;
        const userId = req.session.admin._id;
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

        combinedMessages.forEach(async (message) => {
            if (message.status === "multimedia") {
              message.media = true;
            } else if(message.status === "textmessage"){
              message.text = true;
            }
        });


        res.render('admin/chatwith_admin', {userId, combinedMessages, showAdminHeader1: true,aber });
    } else {
      res.redirect('/admin');
    }
  } catch (error) {
    console.error("Error fetching chat room update:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});


router.post('/send_timestamp_leave_adminchat/:id', async (req, res) => {
  if (req.session && req.session.admin) {
      let Reciever_Id = req.params.id;
      let Sender_Id = req.session.admin._id;

      try {
        const messageCount = await userHelpers.getArrayCountAdmin(Sender_Id, Reciever_Id);
        const Sender = req.session.admin._id.toString();
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
  }else {
    res.redirect('/admin');
  }
});


router.post('/send_timestamp_leave_adminmenu', async(req, res) => {
  if (req.session && req.session.admin) {
      let Sender_Id = req.session.admin._id;
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
  }else {
      res.redirect('/admin');
    }
  });


module.exports = router;
