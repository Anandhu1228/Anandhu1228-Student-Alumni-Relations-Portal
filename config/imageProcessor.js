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

const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');

const { imageBuffer, outputPath } = workerData;

sharp(imageBuffer)
  .resize({ width: 800 })
  .jpeg({ quality: 80 })
  .toFile(outputPath)
  .then(() => {
    parentPort.postMessage({ status: 'success' });
  })
  .catch((error) => {
    parentPort.postMessage({ status: 'error', error });
  });
