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

var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response, use } = require('../app')
const { parse } = require('handlebars')
var objectId = require('mongodb').ObjectId
const fs = require('fs');
var path = require('path');
const { timeStamp } = require('console')
module.exports={

    doMaintainerLogin: (maintainerData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {};
                let maintainer = await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).findOne({ maintainer_mail: maintainerData.Email });
    
                if (maintainer) {
                    // Check if the account is locked
                    if (maintainer.lockoutMaintainerTime && new Date() < maintainer.lockoutMaintainerTime) {
                        // Account is lockedz
                        resolve({ status: false, locked: true });
                    } else {
                        if (maintainer.Maccess) {
                            let status1 = await bcrypt.compare(maintainerData.passKey, maintainer.maintainer_pass);
    
                            if (status1) {
                                // Reset failed attempts on successful login
                                await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).updateOne(
                                    { m_id: maintainer.m_id },
                                    { $set: { failedMaintainerAttempts: 0, lockoutMaintainerTime: null } }
                                );

                                console.log("login success");
                                response.maintainer = {
                                    _id: maintainer.m_id,
                                    Name: maintainer.MName || null,
                                    Email: maintainer.maintainer_mail || null
                                };

                                response.status = true;
                                resolve(response);

                            } else {
                                // Increment failed attempts on unsuccessful login
                                let failedMaintainerAttempts = maintainer.failedMaintainerAttempts ? maintainer.failedMaintainerAttempts + 1 : 1;
                                let lockoutMaintainerTime = null;
                                if (failedMaintainerAttempts >= 3) {
                                    // Set lockout time for 1 day
                                    lockoutMaintainerTime = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                                }
                                await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).updateOne(
                                    { m_id: maintainer.m_id },
                                    { $set: { failedMaintainerAttempts: failedMaintainerAttempts, lockoutMaintainerTime: lockoutMaintainerTime } }
                                );
                                console.log("login failed");
                                resolve({ status: false });
                            }
                        } else {
                            resolve({ accesssfail: true });
                        }
                    }
                } else {
                    console.log("login failed");
                    resolve({ status: false });
                }
            } catch (error) {
                console.error("Error in doMaintainerLogin:", error);
                reject(error); // Optionally, you may want to resolve with an error object or handle differently
            }
        });
    },   


    getOtpRequest: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).findOne(
                { maintainer_mail: email },
                { projection: { MOtpreQuestcounT: 1, mopt_lock_time: 1 } }
            ).then((response) => {
                if (response) {
                    resolve(response);
                } else {
                    resolve(null);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },
    

    updateOtpRequest: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).updateOne(
                { maintainer_mail: email },
                {
                    $set: {
                        MOtpreQuestcounT: 0,
                        mopt_lock_time: null
                    }
                }
            ).then((response) => {
                if (response.matchedCount > 0) {
                    resolve(response);
                } else {
                    resolve(null);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },    


    setRequestOtp: (email) => {
        return new Promise((resolve, reject) => {
            const usercollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION)
            
            usercollection.findOne({ maintainer_mail: email }).then((user) => {
                if (!user) {
                    // No user found with the given email
                    resolve();
                    return;
                }
    
                const updateFields = {};
                const currentTime = new Date();
    
                if (!user.MOtpreQuestcounT && !user.mopt_lock_time) {
                    updateFields.MOtpreQuestcounT = 1;
                    updateFields.mopt_lock_time = null;
                } else if (user.MOtpreQuestcounT === 2) {
                    updateFields.MOtpreQuestcounT = 3;
                    updateFields.mopt_lock_time = currentTime;
                } else if (user.MOtpreQuestcounT) {
                    if (user.MOtpreQuestcounT < 3) {
                        updateFields.MOtpreQuestcounT = user.MOtpreQuestcounT + 1;
                    }
                } else {
                    updateFields.MOtpreQuestcounT = 1;
                }
    
                usercollection.updateOne(
                    { maintainer_mail: email },
                    { $set: updateFields }
                ).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        });
    },


    getOtpRequestTime: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).findOne(
                { maintainer_mail: email },
                { projection: { mopt_lock_time: 1 } }
            ).then((response) => {
                if (response) {
                    resolve(response);
                } else {
                    resolve(null);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },


    addPostToGallery: (postData, timestamp, userId, mediaType, fileName) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Create the post document
                const postDocument = {
                    ...postData,
                    timestamp: timestamp,
                    mediaType: mediaType,
                    fileName: fileName
                };
    
                // Find the entry in SUPER_ADMIN_COLLECTION where the m_id matches the userId
                const superAdminCollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION);
                const query = { m_id: userId };
                const update = {
                    $push: { Gallery_posts: postDocument },
                    $inc: { GalleryCount: 1 }
                };
                const options = { upsert: true, returnDocument: 'after' };
    
                const result = await superAdminCollection.findOneAndUpdate(query, update, options);
    
                // Handle cases where result.value might be null
                if (!result.value) {
                    // If result.value is null, manually retrieve the updated document
                    const updatedDocument = await superAdminCollection.findOne(query);
                    resolve(updatedDocument);
                } else {
                    // If the Gallery_posts array does not exist, create it and insert the postDocument
                    if (!result.value.Gallery_posts) {
                        await superAdminCollection.updateOne(query, {
                            $set: { Gallery_posts: [postDocument], GalleryCount: 1 }
                        });
                    }
                    resolve(result.value);
                }
            } catch (error) {
                console.error(error);
                reject(new Error("Error adding post to gallery"));
            }
        });
    },    


    getAllGallery: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Find the entry in SUPER_ADMIN_COLLECTION where the m_id matches the userId
                const superAdminCollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION);
                const query = { m_id: userId };
    
                // Fetch the document matching the query
                const result = await superAdminCollection.findOne(query, { projection: { Gallery_posts: 1 } });
    
                if (result && result.Gallery_posts) {
                    // Sort the Gallery_posts array by timestamp in descending order (newest first)
                    const sortedGalleryPosts = result.Gallery_posts.sort((a, b) => b.timestamp - a.timestamp);
    
                    // Resolve with the sorted array
                    resolve(sortedGalleryPosts);
                } else {
                    // If the Gallery_posts array is not found, resolve with an empty array
                    resolve([]);
                }
            } catch (error) {
                console.error(error);
                reject(new Error("Error retrieving posts from gallery"));
            }
        });
    },    
    
    
    deletePost: (postID, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Find the entry in SUPER_ADMIN_COLLECTION where the m_id matches the userId
                const superAdminCollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION);
                const query = { m_id: userId };
        
                // Find the document matching the query
                const result = await superAdminCollection.findOne(query, { projection: { Gallery_posts: 1, GalleryCount: 1 } });
        
                let deletedMedia = false; // Initialize deletedMedia as false
    
                if (result && result.Gallery_posts) {
                    // Find the index of the post with the specified MediaId (postID)
                    const postIndex = result.Gallery_posts.findIndex(post => post.MediaId === postID);
                    
                    if (postIndex !== -1) {
                        // If the post is found, remove it from the array
                        result.Gallery_posts.splice(postIndex, 1);
    
                        // Decrement the GalleryCount by 1
                        const newGalleryCount = result.GalleryCount - 1;
    
                        // Update the document in the collection
                        await superAdminCollection.updateOne(query, {
                            $set: {
                                Gallery_posts: result.Gallery_posts,
                                GalleryCount: newGalleryCount
                            }
                        });
    
                        // Set deletedMedia to true indicating the post was deleted
                        deletedMedia = true;
                    }
                }
                
                // Resolve the deletedMedia variable
                resolve(deletedMedia);
            } catch (error) {
                console.error(error);
                reject(new Error("Error deleting post from gallery"));
            }
        });
    },


    editGalleryMedia: (postID, postDescription, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Find the entry in SUPER_ADMIN_COLLECTION where the m_id matches the userId
                const superAdminCollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION);
                const query = { m_id: userId };
                
                // Find the document matching the query
                const result = await superAdminCollection.findOne(query, { projection: { Gallery_posts: 1 } });
    
                let editedGalleryMedia = false; // Initialize editedGalleryMedia as false
    
                if (result && result.Gallery_posts) {
                    // Find the post with the specified MediaId (postID)
                    const postIndex = result.Gallery_posts.findIndex(post => post.MediaId === postID);
                    
                    if (postIndex !== -1) {
                        // If the post is found, update its messageContent with postDescription
                        result.Gallery_posts[postIndex].messageContent = postDescription;
    
                        // Update the document in the collection
                        await superAdminCollection.updateOne(query, { $set: { Gallery_posts: result.Gallery_posts } });
    
                        // Set editedGalleryMedia to true indicating the post was updated
                        editedGalleryMedia = true;
                    }
                }
                
                // Resolve the editedGalleryMedia variable
                resolve(editedGalleryMedia);
            } catch (error) {
                console.error(error);
                reject(new Error("Error editing post in gallery"));
            }
        });
    },


    send1Reo2rde2rDat8a : (userId, re_order) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Get the collection
                const superAdminCollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION);
                const query = { m_id: userId };
    
                // Find the document for the given userId
                const superAdminDoc = await superAdminCollection.findOne(query);
    
                if (superAdminDoc && superAdminDoc.Gallery_posts) {
                    const galleryPosts = superAdminDoc.Gallery_posts;
    
                    // Create a mapping of mediaID to its corresponding order
                    const orderMapping = {};
                    re_order.forEach(item => {
                        orderMapping[item.mediaID] = parseInt(item.order, 10);
                    });
    
                    // Sort the Gallery_posts array based on the current timestamp to get the oldest to newest
                    galleryPosts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
                    // Create a new array to hold the reordered timestamps
                    const reorderedTimestamps = [];
    
                    // Reorder the timestamps based on the order specified in re_order
                    re_order.forEach(orderItem => {
                        const matchingPost = galleryPosts.find(post => post.MediaId === orderItem.mediaID);
                        if (matchingPost) {
                            reorderedTimestamps.push(matchingPost.timestamp);
                        }
                    });
    
                    // Sort the reordered timestamps by their order value
                    reorderedTimestamps.sort((a, b) => orderMapping[a.MediaId] - orderMapping[b.MediaId]);
    
                    // Update the original galleryPosts array with the new timestamps based on the order
                    galleryPosts.forEach(post => {
                        if (orderMapping[post.MediaId] !== undefined) {
                            const newIndex = orderMapping[post.MediaId] - 1;
                            post.timestamp = reorderedTimestamps[newIndex];
                        }
                    });
    
                    // Update the document in the collection
                    await superAdminCollection.updateOne(query, { $set: { Gallery_posts: galleryPosts } });
    
                    resolve({ reOrdered: true });
                } else {
                    reject(new Error("No Gallery_posts found for the given userId"));
                }
            } catch (error) {
                console.error(error);
                reject(new Error("Error editing post in gallery"));
            }
        });
    },    
    
    
    
    
}