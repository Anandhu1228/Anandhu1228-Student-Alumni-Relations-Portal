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
const session = require('express-session');
const { log } = require('handlebars');
const { response, use } = require('../app');
const { Console } = require('console');
const maintainerHelpers = require('../helpers/maintainer_helpers');
const sharp = require('sharp');
const { Worker } = require('worker_threads');
const archiver = require('archiver');


const verifyLogin = (req,res,next)=>{
  if(req.session.maintainerLoggedIn){
    next()
    return;
  }else{
    res.redirect('/maintainer')
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
const userHelpers = require('../helpers/user-helpers');
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
        res.render('maintainer/login_button');
        return;
    } catch (error) {
        console.error("Error in GET / route:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get('/maintainer_view_page', async (req, res) => {
    try {
        if (req.session.maintainerLoggedIn) {
            let maber = req.session.maintainer.Name;
            res.render('maintainer/maintainer_view_page', { showMaintainerHeader1: true, maber });
            return;
        } else {
            res.render('maintainer/maintainerlogin');
            req.session.maintainerLoginErr = false;
            return;
        }
    } catch (error) {
        console.error("Error in GET /maintainer_view_page route:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.post('/maintainerlogin', async (req, res) => {
    try {
      req.body.Email = req.body.Email.trim()
      let response = await maintainerHelpers.doMaintainerLogin(req.body);
      if (response.status) {
          req.session.maintainerLoggedIn = true;
          req.session.maintainer = response.maintainer;
          res.redirect('/maintainer/maintainer_view_page');
          return;
      } else if (response.accesssfail) {
          res.render('maintainer/maintainerlogin', { maintainer_block: true });
          return;
      } else if (response.locked) {
          req.session.maintainerLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
          res.render('maintainer/maintainerlogin', { "LoginERROR": req.session.maintainerLoginErr });
          return;
      } else {
          req.session.maintainerLoginErr = "Invalid Username or Password";
          res.render('maintainer/maintainerlogin', { "LoginERROR": req.session.maintainerLoginErr });
          return;
      }
    } catch (error) {
        console.error("Error in POST /maintainerlogin route:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


//  EMAIL SERVICE INTEGRATED
/*router.post('/maintainerlogin', async (req, res) => {
    try {
  
      // Check if OTP resend is requested
      if (req.body.resendOtp) {
        let otpRequests_time = await maintainerHelpers.getOtpRequest(req.body.senCurreSponDer);
  
        let otpRequests = otpRequests_time ? otpRequests_time.MOtpreQuestcounT : 0;
        const lockTime = otpRequests_time ? otpRequests_time.mopt_lock_time : null;
  
        if (otpRequests >= 3) {
          const currentTime = new Date();
          const lockTimeElapsed = lockTime ? (currentTime - new Date(lockTime)) / (1000 * 60 * 60) : 0; // Difference in hours
  
          if (lockTimeElapsed >= 1) {
            // Reset the OTP request count and lock time
            await maintainerHelpers.updateOtpRequest(req.body.senCurreSponDer);
          } else {
            // Too many OTP requests
            res.render('maintainer/templogin', { tomanyOTPAfterHour: true });
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
          req.session.motp = otp;
  
          await maintainerHelpers.setRequestOtp(req.body.senCurreSponDer)
          
          res.render('maintainer/otp',{send_mail: req.body.senCurreSponDer});
        });
        return; // Exit the route handler to avoid further processing
      }

      req.body.Email = req.body.Email.trim()
  
      let otp_Requests_time = await maintainerHelpers.getOtpRequestTime(req.body.Email);
      let OTP_LOCK_TIME = otp_Requests_time ? otp_Requests_time.opt_lock_time: null
      let currentTime = new Date();
      let lockTimeElapsed = OTP_LOCK_TIME ? (currentTime - new Date(OTP_LOCK_TIME)) / (1000 * 60 * 60) : 0; // Difference in hours
  
      if (lockTimeElapsed >= 1) {
        // Reset the OTP request count and lock time
        await maintainerHelpers.updateOtpRequest(req.body.Email);
      }
  
      if (lockTimeElapsed >= 1 || OTP_LOCK_TIME == null) {
  
        const response = await maintainerHelpers.doMaintainerLogin(req.body);
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
  
            await maintainerHelpers.setRequestOtp(req.body.Email);
  
            req.session.motp = otp;
            req.session.Pm$p_mAU$Ar = response.maintainer; // Temporarily store user data
            res.render('maintainer/otp',{send_mail: req.body.Email});
            return
          });
  
        } else if (response.accesssfail) {
            res.render('maintainer/maintainerlogin', { maintainer_block: true });
            return;
        } else if (response.locked) {
            req.session.maintainerLoginErr = "Account is locked due to too many failed login attempts. Try again later.";
            res.render('maintainer/maintainerlogin', { "LoginERROR": req.session.maintainerLoginErr });
            return;
        } else {
            req.session.maintainerLoginErr = "Invalid Username or Password";
            res.render('maintainer/maintainerlogin', { "LoginERROR": req.session.maintainerLoginErr });
            return;
        }
      } else{
        let date = new Date(OTP_LOCK_TIME);
        date.setTime(date.getTime() + 3600000); // 3600000 ms = 1 hour
        let now = new Date();
        let timeDifference = date - now; // difference in milliseconds
        let minutesLeft = Math.floor(timeDifference / 60000); // convert to minutes
        res.render('maintainer/templogin',{tomanyOTP: true, minutesLeft})
        return
      }
    } catch (error) {
        console.error("Error in POST /maintainerlogin route:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});
  
  
router.post('/verify-otp', async(req, res, next) => {
    try {
      const { otp } = req.body;
      
      if (req.session.motp === otp) {
        req.session.maintainerLoggedIn = true;
        req.session.maintainer = req.session.Pm$p_mAU$Ar; // Transfer the user details
        
        delete req.session.motp;
        delete req.session.Pm$p_mAU$Ar; // Clean up temp user data
        await maintainerHelpers.updateOtpRequest(req.session.maintainer.Email);
        
        res.redirect('/maintainer/maintainer_view_page');
      } else {
        res.status(400).send('Invalid OTP');
      }
    } catch (error) {
      console.error('Error during OTP verification:', error);
      next(error); // Pass the error to the next middleware (error handler)
    }
});*/


router.get('/maintainerlogout', async (req, res) => {
    try {
        if (req.session && req.session.maintainer) {
            req.session.destroy(async (err) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("An error occurred while logging out.");
                } else {
                    try {
                        res.redirect('/maintainer');
                        return;
                    } catch (innerError) {
                        console.error("Error occured:", innerError);
                        res.status(500).send("An error occurred while logging out.");
                    }
                }
            });
        } else {
            res.redirect('/maintainer');
            return;
        }
    } catch (error) {
        console.error("Error in GET /maintainerlogout route:", error);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.get('/edit_page_content', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let maber = req.session.maintainer.Name;
          res.render('maintainer/edit_page_content', { showMaintainerHeader1: true, maber});
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.get('/edit_gallery', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let maber = req.session.maintainer.Name;
          res.render('maintainer/edit_gallery', { showMaintainerHeader1: true, maber});
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.get('/add_image_with_compression', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let maber = req.session.maintainer.Name;
          let contents = await maintainerHelpers.getAllGallery(req.session.maintainer._id);
          res.render('maintainer/add_image_with_compression', { showMaintainerHeader1: true, maber,contents});
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.get('/add_image_without_compression', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let maber = req.session.maintainer.Name;
          let contents = await maintainerHelpers.getAllGallery(req.session.maintainer._id);
          res.render('maintainer/add_image_without_compression', { showMaintainerHeader1: true, maber, contents});
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.get('/reorder_image', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let maber = req.session.maintainer.Name;
          let contents = await maintainerHelpers.getAllGallery(req.session.maintainer._id);
          let content_count = contents.length;
          res.render('maintainer/reorder_image', { showMaintainerHeader1: true, maber, contents, content_count});
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.post('/add_image_to_gallery', async (req, res) => {
    try {
        if (req.session && req.session.maintainer) {
            const userId = req.session.maintainer._id;
            const postData = { ...req.body };
            let messageContent = postData.messageContent;
            messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
            postData.messageContent = messageContent;
            const timestamp = new Date();
            const MediaId = req.body.MediaId;
            let mediaType = null;
            const baseFolderPath = `./public/gallery/`;

            if (!fs.existsSync(baseFolderPath)) {
                fs.mkdirSync(baseFolderPath, { recursive: true });
            }

            const file = req.files ? req.files.postImage : null;

            if (!file) {
                res.status(400).json({ error: "No file uploaded" });
                return;
            }

            const fileExtension = file.name.split('.').pop();
            const fileName = `${MediaId}.${fileExtension}`;
            const filePath = path.join(baseFolderPath, fileName);

            await file.mv(filePath);

            if (file.mimetype.includes('image')) {
                mediaType = "image";
            } else if (file.mimetype.includes('video')) {
                mediaType = "video";
            } else {
                res.status(400).json({ error: "Invalid file type. Only images and videos are allowed." });
                return;
            }

            await maintainerHelpers.addPostToGallery(postData, timestamp, userId, mediaType,fileName);

            res.json({ addedMediaPost: true });
            return
        } else {
            res.redirect('/maintainer');
            return
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/add_image_to_gallery_compression', async (req, res) => {
  try {
    if (req.session && req.session.maintainer) {
      
      const userId = req.session.maintainer._id;
      const postData = { ...req.body };
      let messageContent = postData.messageContent;
      messageContent = messageContent.replace(/[\r\n]+/g, " ").replace(/\s+/g, ' ').trim();
      postData.messageContent = messageContent;
      
      const timestamp = new Date();
      const MediaId = req.body.MediaId;
      const baseFolderPath = `./public/gallery/`;
      
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      const file = req.files ? req.files.postImage : null;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const fileExtension = file.name.split('.').pop();
      const fileName = `${MediaId}.${fileExtension}`;
      const filePath = path.join(baseFolderPath, fileName);

      const fileProcessingPromise = new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, '../config/mediaProcessor.js'), {
          workerData: {
            mediaBuffer: file.data,
            outputPath: filePath,
            fileType: file.mimetype.includes('image') ? 'image' : 'video'
          }
        });

        worker.on('message', (message) => {
          if (message.status === 'success') {
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
      });

      await fileProcessingPromise;

      const mediaType = file.mimetype.includes('image') ? 'image' : file.mimetype.includes('video') ? 'video' : null;

      if (!mediaType) {
        res.status(400).json({ error: "Invalid file type. Only images and videos are allowed." });
        return;
      }

      await maintainerHelpers.addPostToGallery(postData, timestamp, userId, mediaType, fileName);

      res.json({ addedMediaPost: true });
    } else {
      res.redirect('/maintainer');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/delete_gallery_media', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let response = await maintainerHelpers.deletePost(req.body.PostID,req.session.maintainer._id)
          res.json(response)
          if(response){
            const GalleryImagesDir = path.resolve(__dirname, '../public/gallery');
            if(req.body.MediaTYPE == "image"){

              const GalleryImagePath = path.join(GalleryImagesDir, req.body.PostID);
              const extensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', 
                '.ico', '.heif', '.raw', '.jfif', '.avif', '.exif'
              ];
              
              for (const ext of extensions) {
                const filePath = GalleryImagePath + ext;
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath); 
                  break; 
                }
              }

            } else if(req.body.MediaTYPE == "video"){
              const GalleryVideoPath = path.join(GalleryImagesDir, req.body.PostID);
              const extensions = [
                '.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv',  '.mpeg', '.mpg', '.m4v', 
                '.3gp', '.3g2', '.ogg', '.ogv', '.ts',  '.mts', '.m2ts', '.vob', '.f4v', '.mxf' 
              ];              
              
              for (const ext of extensions) {
                const filePath = GalleryVideoPath + ext;
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath); 
                  break; 
                }
              }
            }
          }
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.post('/edit_media_gallery', async (req, res, next) => {
    try {
        if (req.session && req.session.maintainer) {
          let response = await maintainerHelpers.editGalleryMedia(req.body.PoStId,req.body.d_escription,req.session.maintainer._id)
          res.json(response)
          return;
        } else {
          res.redirect('/maintainer');
          return;
        }
      } catch (err) {
        next(err);
      }
});


router.post('/send_gallery_media_reorder', async (req, res, next) => {
  try {
      if (req.session && req.session.maintainer) {
          const re_order = JSON.parse(req.body.DaTaToSeNd); // Ensure it's parsed correctly as an array
          let response = await maintainerHelpers.send1Reo2rde2rDat8a(req.session.maintainer._id, re_order);
          if(response.reOrdered){
            res.json({ reOrdered: true });
            return
          }
      } else {
          res.redirect('/maintainer');
      }
  } catch (err) {
      next(err);
  }
}); 


router.get('/get_current_frontpage', async (req, res, next) => {
  try {
      if (req.session && req.session.maintainer) {
          const filePath = path.join(__dirname, '../views/user/view-page.hbs');
          res.download(filePath, 'view-page.hbs', (err) => {
              if (err) {
                  next(err);
              }
          });
      } else {
          res.redirect('/maintainer');
      }
  } catch (err) {
      next(err);
  }
});


router.get('/get_current_frontpage_resources', async (req, res, next) => {
  try {
    if (req.session && req.session.maintainer) {
      const directoryPath = path.join(__dirname, '../public/images/');
      const zipFileName = 'images-archive.zip';

      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      res.setHeader('Content-Type', 'application/zip');

      const archive = archiver('zip', {
        zlib: { level: 0 } // Set the compression level to 0 for no compression
      });

      archive.on('error', (err) => {
        next(err);
      });

      // Pipe archive data to the response
      archive.pipe(res);

      // Append files from the images directory to the archive
      archive.directory(directoryPath, false, (entry) => {
        return entry; // Optionally customize the entry name
      });

      // Finalize the archive
      archive.finalize();
      
    } else {
      res.redirect('/maintainer');
    }
  } catch (err) {
    next(err);
  }
});


router.post('/upload_new_front_page', async (req, res, next) => {
  try {
    if (req.session && req.session.maintainer) {
      // Check if the file was uploaded
      if (!req.files || !req.files.file) {
        return res.status(400).send('No file was uploaded.');
      }
      
      const uploadedFile = req.files.file;
      
      // Define the path to the existing view-page.hbs file
      const filePath = path.join(__dirname, '../views/user/view-page.hbs');

      // Ensure the directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Move the uploaded file to the desired location
      fs.writeFile(filePath, uploadedFile.data, (err) => {
        if (err) {
          return next(err);
        }
        res.send('File uploaded and replaced successfully.');
      });

    } else {
      res.redirect('/maintainer');
    }
  } catch (err) {
    next(err);
  }
});


router.post('/add_main_media', async (req, res) => {
  try {
    if (req.session && req.session.maintainer) {
      const baseFolderPath = path.join(__dirname, '../public/images/'); // Define base path for images folder

      // Ensure the images directory exists
      if (!fs.existsSync(baseFolderPath)) {
        fs.mkdirSync(baseFolderPath, { recursive: true });
      }

      const file = req.files ? req.files.postImage : null;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      // Define the full file path including filename
      const filePath = path.join(baseFolderPath, file.name);

      // Move the file to the images folder
      await file.mv(filePath);

      res.json({ addedMainMedia: true });
      return;
    } else {
      res.redirect('/maintainer');
      return;
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/removea_main_media', async (req, res) => {
  try {
    if (req.session && req.session.maintainer) {

      req.body.FileName = req.body.FileName.trim()

      const baseFolderPath = path.join(__dirname, '../public/images/'); // Base path for the images folder
      const filePath = path.join(baseFolderPath, req.body.FileName); // Full path to the file

      // Check if file exists
      if (fs.existsSync(filePath)) {
        // Remove the file
        fs.unlinkSync(filePath);
        res.json({ removedaMainMedia: true });
      } else {
        console.log(`File ${req.body.FileName} not found.`);
        res.json({ removedaMainMedia: false, message: 'File not found' });
      }
      return;
    } else {
      res.redirect('/maintainer');
      return;
    }
  } catch (error) {
    console.error('Error removing file:', error);
    res.status(500).json({ removedaMainMedia: false, error: 'Internal Server Error' });
  }
});


router.get('/maintainer_guideline', async (req, res, next) => {
  try {
      if (req.session && req.session.maintainer) {
        let maber = req.session.maintainer.Name;
        res.render('maintainer/help_guideline', { showMaintainerHeader1: true, maber});
        return;
      } else {
        res.redirect('/maintainer');
        return;
      }
    } catch (err) {
      next(err);
    }
});




module.exports = router;
