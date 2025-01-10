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

module.exports={


    doSuperAdminLogin: (superadminData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {};
                let superadmin = await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).findOne({ Email: superadminData.Email });
    
                if (superadmin) {
                    // Check if the account is locked
                    if (superadmin.lockoutTime && new Date() < superadmin.lockoutTime) {
                        // Account is locked
                        resolve({ status: false, locked: true });
                    } else {
                        let status1 = await bcrypt.compare(superadminData.key_1, superadmin.key1);
                        let status2 = await bcrypt.compare(superadminData.key_2, superadmin.key2);
    
                        if (status1 && status2) {
                            // Reset failed attempts on successful login
                            await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).updateOne(
                                { _id: superadmin._id },
                                { $set: { failedAttempts: 0, lockoutTime: null } }
                            );

                            console.log("login success");
                            response.superadmin = {
                                Name: superadmin.Name || null,
                                Email: superadmin.Email || null
                            };
                            response.status = true;
                            resolve(response);

                        } else {
                            // Increment failed attempts on unsuccessful login
                            let failedAttempts = superadmin.failedAttempts ? superadmin.failedAttempts + 1 : 1;
                            let lockoutTime = null;
                            if (failedAttempts >= 5) {
                                // Set lockout time for 1 day
                                lockoutTime = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                            }
                            await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).updateOne(
                                { _id: superadmin._id },
                                { $set: { failedAttempts: failedAttempts, lockoutTime: lockoutTime } }
                            );
                            console.log(`login failed. ${5 - failedAttempts} attempts left`);
                            resolve({ status: false, attemptsLeft: 5 - failedAttempts });
                        }
                    }
                } else {
                    console.log("login failed");
                    resolve({ status: false });
                }
            } catch (error) {
                console.log("An error occurred:", error);
                reject(error);
            }
        });
    },    


    getOtpRequest: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).findOne(
                { Email: email },
                { projection: { OtpreQuestcounT: 1, opt_lock_time: 1 } }
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
                { Email: email },
                {
                    $set: {
                        OtpreQuestcounT: 0,
                        opt_lock_time: null
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
            
            usercollection.findOne({ Email: email }).then((user) => {
                if (!user) {
                    // No user found with the given email
                    resolve();
                    return;
                }
    
                const updateFields = {};
                const currentTime = new Date();
    
                if (!user.OtpreQuestcounT && !user.opt_lock_time) {
                    updateFields.OtpreQuestcounT = 1;
                    updateFields.opt_lock_time = null;
                } else if (user.OtpreQuestcounT === 2) {
                    updateFields.OtpreQuestcounT = 3;
                    updateFields.opt_lock_time = currentTime;
                } else if (user.OtpreQuestcounT) {
                    if (user.OtpreQuestcounT < 3) {
                        updateFields.OtpreQuestcounT = user.OtpreQuestcounT + 1;
                    }
                } else {
                    updateFields.OtpreQuestcounT = 1;
                }
    
                usercollection.updateOne(
                    { Email: email },
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
                { Email: email },
                { projection: { opt_lock_time: 1 } }
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


    BasicSupergetProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
                resolve(profile);
            } catch (error) {
                console.log("An error occurred:", error);
                reject(error);
            }
        });
    },
    

    getAdminLogged_1228_Data: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { logs: 1 }
            );
            if (result && result.logs) {
                return result.logs;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },    


    ViewAdminDeletedCandidates: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { deletedCandidates: 1 }
            );
            if (result && result.deletedCandidates) {
                return result.deletedCandidates;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },


    ViewAdminUpdatedUserStatus: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { StatusUpdateLog: 1 }
            );
            if (result && result.StatusUpdateLog) {
                return result.StatusUpdateLog;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    }, 


    ViewAdminClearedUserRecord: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { ClearRecordLog: 1 }
            );
            if (result && result.ClearRecordLog) {
                return result.ClearRecordLog;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    }, 


    AdminViewedDeletedGroupChat: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { ViewDeletedGroupMessageLog: 1 }
            );
            if (result && result.ViewDeletedGroupMessageLog) {
                return result.ViewDeletedGroupMessageLog;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    }, 


    AdminViewed1Deleted2Private2Chat8: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { viewedOneonOneChat: 1 }
            );
            if (result && result.viewedOneonOneChat) {
                return result.viewedOneonOneChat;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },  


    ViewAdminDeletedJobs: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { JobDeletedLogByAdmin: 1 }
            );
            if (result && result.JobDeletedLogByAdmin) {
                return result.JobDeletedLogByAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },   


    ViewAdminDeletedInternshipRequests: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { InternDeletedLogByAdmin: 1 }
            );
            if (result && result.InternDeletedLogByAdmin) {
                return result.InternDeletedLogByAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },   


    ViewAdminDeletedMentorQuestions: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { deletedMentorQuestion: 1 }
            );
            if (result && result.deletedMentorQuestion) {
                return result.deletedMentorQuestion;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },   


    ViewAdminDeletedMentorReplies: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { deletedMentorReply: 1 }
            );
            if (result && result.deletedMentorReply) {
                return result.deletedMentorReply;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },  


    ViewAdminAddNewUser: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { newUserAdded: 1 }
            );
            if (result && result.newUserAdded) {
                return result.newUserAdded;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },    


    ViewAdminEditedProfile1228: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { EditProfileByAdmin: 1 }
            );
            if (result && result.EditProfileByAdmin) {
                return result.EditProfileByAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },    


    ViewAdminUpdatedProfile: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { UpdateProfileByAdmin: 1 }
            );
            if (result && result.UpdateProfileByAdmin) {
                return result.UpdateProfileByAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },    


    ViewAdminEditedUserPassword: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { UpdatePasswordOfUserByAdmin: 1 }
            );
            if (result && result.UpdatePasswordOfUserByAdmin) {
                return result.UpdatePasswordOfUserByAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    }, 


    AdminoneViewtwoUsertwoPasswordeightUpdateLog: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { AdminViewPassUpdateLogOfUser: 1 }
            );
            if (result && result.AdminViewPassUpdateLogOfUser) {
                return result.AdminViewPassUpdateLogOfUser;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },  


    AdminViewUserLoggedLog: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { AdminViewLoggedUpdateLogOfUser: 1 }
            );
            if (result && result.AdminViewLoggedUpdateLogOfUser) {
                return result.AdminViewLoggedUpdateLogOfUser;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },  


    AdminDeletedPosts: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { deletedPostsAdmin: 1 }
            );
            if (result && result.deletedPostsAdmin) {
                return result.deletedPostsAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error; // Or handle the error as needed
        }
    },    


    fetchPower_one_2_two_8_TransferStateSuperAdmin: () => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                    {},
                    { powertransfer_enabled: 1 }
                ).then((result) => {
                    if (result && result.powertransfer_enabled !== undefined) {
                        resolve({ powerTransferEnabled: result.powertransfer_enabled });
                    } else {
                        resolve({ powerTransferEnabled: false });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.log("An error occurred:", error);
                reject(error);
            }
        });
    },

    
    updateAdminPass: (userDetails) => {
        let response = {};
        return new Promise((resolve, reject) => {
            try {
                db.getDb()
                    .collection(collection.ADMIN_COLLECTION)
                    .findOne({ Email: userDetails.Email })
                    .then(async (admin) => {
                        if (!admin) {
                            resolve({ status: false, message: "Admin not found" });
                            return;
                        }
    
                        const old_KEY1 = admin.key1;
                        const old_KEY2 = admin.key2;
                        const new_KEY1 = userDetails.key_1;
                        const new_KEY2 = userDetails.key_2;
    
                        bcrypt.compare(new_KEY1, old_KEY1).then(async (match1) => {
                            if (!match1) {
                                resolve({ status: false, message: "Key 1 does not match" });
                                return;
                            }
    
                            bcrypt.compare(new_KEY2, old_KEY2).then(async (match2) => {
                                if (!match2) {
                                    resolve({ status: false, message: "Key 2 does not match" });
                                    return;
                                }
    
                                const newKey1Hash = await bcrypt.hash(userDetails.new_key_1, 10);
                                const newKey2Hash = await bcrypt.hash(userDetails.new_key_2, 10);
    
                                db.getDb()
                                    .collection(collection.ADMIN_COLLECTION)
                                    .updateOne(
                                        { Email: userDetails.Email },
                                        {
                                            $set: {
                                                key1: newKey1Hash,
                                                key2: newKey2Hash,
                                            },
                                        }
                                    )
                                    .then(() => {
                                        response.status = true;
                                        resolve(response);
                                    })
                                    .catch((error) => {
                                        console.error("Error updating keys:", error);
                                        resolve({ status: false, message: "Error updating keys" });
                                    });
                            }).catch((error) => {
                                console.error("Error comparing key 2:", error);
                                resolve({ status: false, message: "Error comparing key 2" });
                            });
                        }).catch((error) => {
                            console.error("Error comparing key 1:", error);
                            resolve({ status: false, message: "Error comparing key 1" });
                        });
                    })
                    .catch((error) => {
                        console.error("Error fetching admin:", error);
                        resolve({ status: false, message: "Error fetching admin" });
                    });
            } catch (error) {
                console.error("An unexpected error occurred:", error);
                reject(error);
            }
        });
    },


    BlockAdminActivities: () => {
        return new Promise((resolve, reject) => {
            try {
                const adminCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
                adminCollection.findOne({}).then((admin) => {
                    if (!admin) {
                        reject("Admin not found.");
                        return;
                    }
    
                    const currentTime = new Date();
                    const accessValue = admin.access;
    
                    // Toggle the access field
                    const updatedAccessValue = !accessValue;
    
                    let updateObject = {
                        $set: {
                            access: updatedAccessValue
                        }
                    };
    
                    // When access is set to false, add blocked_time
                    if (accessValue && !updatedAccessValue) {
                        updateObject.$set.blocked_time = currentTime;
    
                        // Set a timeout to restore access and remove blocked_time after 7 days
                        const sevenDaysLater = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
                        const timeUntilExpiration = sevenDaysLater - currentTime;
    
                        setTimeout(() => {
                            adminCollection.updateOne(
                                { _id: new ObjectId(admin._id) },
                                { 
                                    $set: { access: true }, 
                                    $unset: { blocked_time: "" } // Remove blocked_time after timeout
                                }
                            )
                            .then(() => console.log("Access restored and blocked_time removed after 7 days."))
                            .catch(err => console.error("Error restoring access and removing blocked_time:", err));
                        }, timeUntilExpiration);
                    }
    
                    // When access is set to true, remove blocked_time
                    if (!accessValue && updatedAccessValue) {
                        updateObject.$unset = { blocked_time: "" };
                    }
    
                    // Update the document with the new access and blocked_time
                    adminCollection.updateOne({}, updateObject).then(() => {
                        resolve({ access: updatedAccessValue });
                    }).catch((err) => {
                        reject(err);
                    });
                }).catch((err) => {
                    reject(err);
                });
            } catch (error) {
                console.error("An unexpected error occurred:", error);
                reject(error);
            }
        });
    },    
    

    BlgetAdminBlockStat: () => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_COLLECTION).findOne(
                    {},
                    { access: 1 }
                ).then((result) => {
                    if (result && result.access !== undefined) {
                        resolve({ BlockEnabled: result.access });
                    } else {
                        resolve({ BlockEnabled: false });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error("An unexpected error occurred:", error);
                reject(error);
            }
        });
    },    
    
    
    ViewAdminRestrictedGroupchat: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { adminRestrictedGroupUser: 1 } // Select only the 'adminRestrictedGroupUser' field
            );
    
            if (result && result.adminRestrictedGroupUser) {
                // Transform the array to the desired format
                const transformedArray = result.adminRestrictedGroupUser.map(entry => {
                    const userId = Object.keys(entry).find(key => key !== 'timestamp');
                    return {
                        userID: userId,
                        stat: entry[userId],
                        timed: entry.timestamp
                    };
                });
                return transformedArray; // Return the transformed array
            } else {
                return []; // Return an empty array if the field is not found
            }
        } catch (error) {
            throw error; // Handle the error as needed
        }
    },
      

    ViewAdminRestrictedUser: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { adminPortalRestrictedUser: 1 } // Select only the 'adminPortalRestrictedUser' field
            );
            
            if (result && result.adminPortalRestrictedUser) {
                // Transform the array to the desired format
                const transformedArray = result.adminPortalRestrictedUser.map(entry => {
                    const userId = Object.keys(entry).find(key => key !== 'timestamp');
                    return {
                        userID: userId,
                        stat: entry[userId],
                        timed: entry.timestamp
                    };
                });
                return transformedArray; // Return the transformed array
            } else {
                return []; // Return an empty array if the field is not found
            }
        } catch (error) {
            throw error; // Handle the error as needed
        }
    },      


    ViewAdminDeletedPostComments: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { deletedPostCommentsAdmin: 1 }
            );
            if (result && result.deletedPostCommentsAdmin) {
                return result.deletedPostCommentsAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error;
        }
    },  


    ViewAdminDeletedPostCommentReplies: async () => {
        try {
            const result = await db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                {},
                { deletedPostCommentRepliesAdmin: 1 }
            );
            if (result && result.deletedPostCommentRepliesAdmin) {
                return result.deletedPostCommentRepliesAdmin;
            } else {
                return [];
            }
        } catch (error) {
            throw error;
        }
    },  


    ViewDetailAdminDeletedPostComment: async (postID, commentID) => {
        try {
            const result = await db.getDb().collection(collection.DELETED_POST_COMMENT_REPLY)
                .findOne(
                    { 
                        postID: postID,
                        comment_id: commentID
                    }, 
                    {
                        projection: {
                            comment_owner_name: 1,
                            deleted_Comment_data: 1,
                            comment_owner_id: 1
                        }
                    }
                );
            
            if (!result) {
                return { message: "No matching comment found", success: false };
            }
    
            return {
                comment_owner_name: result.comment_owner_name,
                deleted_comment_data: result.deleted_Comment_data,
                comment_owner_id: result.comment_owner_id,
                success: true
            };
    
        } catch (error) {
            throw error;
        }
    },
    
    
    ViewDetailAdminDeletedPostCommentReply: async (postID, commentID, replyID) => {
        try {
            const dbInstance = db.getDb();
            const deletedPostCommentReplyCollection = dbInstance.collection(collection.DELETED_POST_COMMENT_REPLY);
            const postCollection = dbInstance.collection(collection.POST_COLLECTION);
    
            // First query: Get the reply details from DELETED_POST_COMMENT_REPLY
            const replyResult = await deletedPostCommentReplyCollection.findOne(
                { 
                    postID: postID,
                    comment_id: replyID,
                    comment_red_id: commentID
                }, 
                {
                    projection: {
                        comment_owner_name: 1,
                        deleted_Comment_data: 1,
                        comment_owner_id: 1
                    }
                }
            );
    
            // If reply found in DELETED_POST_COMMENT_REPLY, proceed to find original comment
            if (replyResult) {
                // Check if the original comment exists in DELETED_POST_COMMENT_REPLY
                const originalCommentResult = await deletedPostCommentReplyCollection.findOne(
                    { 
                        postID: postID,
                        comment_id: commentID
                    }, 
                    {
                        projection: {
                            comment_owner_name: 1,
                            deleted_Comment_data: 1,
                            comment_owner_id: 1
                        }
                    }
                );
    
                if (originalCommentResult) {
                    // Return reply data along with original comment from DELETED_POST_COMMENT_REPLY
                    return {
                        comment_owner_name: replyResult.comment_owner_name,
                        deleted_comment_data: replyResult.deleted_Comment_data,
                        comment_owner_id: replyResult.comment_owner_id,
                        actual_comment_data: originalCommentResult.deleted_Comment_data,
                        actual_comment_owner: originalCommentResult.comment_owner_name,
                        success: true,
                        deleted_comment: true,
                        actual_comment_owner_id: originalCommentResult.comment_owner_id
                    };
                } else {
                    // If original comment is not found in DELETED_POST_COMMENT_REPLY, check POST_COLLECTION
                    const postResult = await postCollection.findOne(
                        { _id: new objectId(postID), 'comments.comment_id': new objectId(commentID) },
                        { projection: { 'comments.$': 1 } }
                    );
    
                    if (postResult && postResult.comments && postResult.comments.length > 0) {
                        const originalCommentFromPost = postResult.comments[0];
                        return {
                            comment_owner_name: replyResult.comment_owner_name,
                            deleted_comment_data: replyResult.deleted_Comment_data,
                            comment_owner_id: replyResult.comment_owner_id,
                            actual_comment_data: originalCommentFromPost.Comment_data,
                            actual_comment_owner: originalCommentFromPost.comment_owner_name,
                            success: true,
                            deleted_comment: false,
                            actual_comment_owner_id: originalCommentFromPost.comment_owner_id
                        };
                    }
                }
            }
    
            // If nothing is found in both DELETED_POST_COMMENT_REPLY and POST_COLLECTION
            if (replyResult) {
                return {
                    comment_owner_name: replyResult.comment_owner_name,
                    deleted_comment_data: replyResult.deleted_Comment_data,
                    comment_owner_id: replyResult.comment_owner_id,
                    success: true
                };
            } else {
                return { message: "No matching reply found", success: false };
            }
        } catch (error) {
            throw error;
        }
    },
    
    


    
}