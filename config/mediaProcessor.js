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

const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set ffmpeg path to ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegStatic);

const { mediaBuffer, outputPath, fileType } = workerData;

async function processMedia() {
  try {
    if (fileType === 'image') {
      // Process image
      await sharp(mediaBuffer)
        .resize({ width: 800, height: 800, fit: 'inside' }) // Resize as needed
        .jpeg({ quality: 80 }) // Compress the image
        .toFile(outputPath);
    } else if (fileType === 'video') {
      // Process video
      const tempInputPath = path.join(__dirname, 'temp_input_' + Date.now() + '_' + Math.random().toString(36).substring(7) + path.extname(outputPath));
      //console.log('Temp input file created at:', tempInputPath);

      fs.writeFileSync(tempInputPath, mediaBuffer);

      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .size('640x?') // Resize as needed
          .on('end', () => {
            //console.log('Processing finished for', tempInputPath);
            if (fs.existsSync(tempInputPath)) {
              try {
                fs.unlinkSync(tempInputPath); // Clean up temp input file
                //console.log('Deleted temp file:', tempInputPath);
              } catch (unlinkError) {
                console.error('Error cleaning up temp file:', unlinkError);
              }
            }
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg processing error:', err);
            if (fs.existsSync(tempInputPath)) {
              try {
                fs.unlinkSync(tempInputPath); // Clean up temp input file
                //console.log('Deleted temp file after error:', tempInputPath);
              } catch (unlinkError) {
                console.error('Error cleaning up temp file after error:', unlinkError);
              }
            }
            reject(err);
          })
          .run();
      });
    }
    parentPort.postMessage({ status: 'success' });
  } catch (error) {
    console.error('Error in processMedia:', error);
    parentPort.postMessage({ status: 'error', error: error.message });
  }
}

processMedia();



/*else if (fileType === 'video') {
  const tempInputPath = path.join(__dirname, 'temp_input_' + Date.now() + path.extname(outputPath));
  fs.writeFileSync(tempInputPath, mediaBuffer);

  await new Promise((resolve, reject) => {
    ffmpeg(tempInputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .size('854x480') // Resize to 480p, a common resolution for WhatsApp
      .outputOptions([
        '-preset veryslow',   // Slower preset for better compression
        '-crf 28',            // WhatsApp's CRF is typically around 28
        '-b:v 500k',          // Set a maximum bitrate of 500kbps
        '-maxrate 800k',      // Limit max rate to avoid spikes in bitrate
        '-bufsize 1000k',     // Buffer size for bitrate control
        '-acodec aac',        // Compress audio using AAC codec
        '-ar 44100',          // Audio sample rate
        '-b:a 96k',           // Audio bitrate
        '-movflags +faststart', // Optimize for streaming
        '-pix_fmt yuv420p'    // Pixel format
      ])
      .on('end', () => {
        fs.unlinkSync(tempInputPath); // Clean up temp input file
        resolve();
      })
      .on('error', (err) => {
        fs.unlinkSync(tempInputPath); // Clean up temp input file
        reject(err);
      })
      .run();
  });
}*/