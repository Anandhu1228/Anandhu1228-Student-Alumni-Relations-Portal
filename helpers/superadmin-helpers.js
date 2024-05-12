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
            let loginStatus = false;
            let response = {};
            let superadmin = await db.getDb().collection(collection.SUPER_ADMIN_COLLECTION).findOne({ Email: superadminData.Email });
            if (superadmin) {
                bcrypt.compare(superadminData.key_1, superadmin.key1).then((status1) => {
                    bcrypt.compare(superadminData.key_2, superadmin.key2).then((status2) => {
                        if (status1 && status2) {
                            console.log("login success");
                            response.superadmin = superadmin;
                            response.status = true;
                            resolve(response);
                        } else {
                            console.log("login failed");
                            resolve({ status: false });
                        }
                    });
                });
            } else {
                console.log("login failed");
                resolve({ status: false });
            }
        });
    },


    BasicSupergetProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
            resolve(profile);
        });
    },

    getAdminLoggedData: async () => {
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

    AdminViewedDeletedPrivateChat: async () => {
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

    ViewAdminEditedProfile: async () => {
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

    AdminViewUserPasswordUpdateLog: async () => {
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


    fetchPowerTransferStateSuperAdmin: () => {
        return new Promise((resolve, reject) => {
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
        });
    },
    
    updateAdminPass: (userDetails) => {
        let response = {};
        return new Promise((resolve, reject) => {
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
                });
              });
            })
            .catch((error) => {
              console.error("Error fetching admin:", error);
              resolve({ status: false, message: "Error fetching admin" });
            });
        });
      },     
      
      
      BlockAdminActivities: () => {
        return new Promise((resolve, reject) => {
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
    
                const updateObject = {
                    $set: {
                        access: updatedAccessValue
                    }
                };
    
                // If access was true and is being set to false, set a timeout to turn it back to true after 7 days
                if (accessValue && !updatedAccessValue) {
                    const sevenDaysLater = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000); // Add 7 days
                    const timeUntilExpiration = sevenDaysLater - currentTime;
    
                    setTimeout(() => {
                        adminCollection.updateOne({ _id: new objectId(admin._id) }, { $set: { access: true } })
                            .then(() => console.log("Access restored after 7 days."))
                            .catch(err => console.error("Error restoring access after 7 days:", err));
                    }, timeUntilExpiration);
                }
    
                adminCollection.updateOne({}, updateObject).then(() => {
                    resolve({ access: updatedAccessValue });
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        });
    },

    BlgetAdminBlockStat: () => {
        return new Promise((resolve, reject) => {
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
        });
    },
    
    

}