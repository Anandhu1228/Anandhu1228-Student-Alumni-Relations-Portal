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

    
    doSignup: async (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!userData) {
                    resolve("Something went wrong, please try again.");
                    return;
                }
    
                userData.upassExistingCount = parseInt(userData.upassExistingCount);
                userData.upassCurrentCount = parseInt(userData.upassCurrentCount);
                userData.upassConfirm = Boolean(userData.upassConfirm);
    
                await Promise.all([
                    userData.upassExist,
                    userData.upassCurrentCount,
                    userData.upassConfirm
                ]);
    
                userData.Password = await bcrypt.hash(userData.Password, 10);
                userData.Cpass = await bcrypt.hash(userData.Cpass, 10);
    
                db.getDb().collection(collection.USER_COLLECTION).insertOne(userData).then((response) => {
                    resolve(response.insertedId);
                });
    
            } catch (error) {
                reject(error);
            }
        });
    },    


    checkAlreadyPresentSignup: (signName, DOB) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_BASIC_COLLECTION).findOne({
                    $expr: {
                        $and: [
                            { $eq: [{ $toLower: "$Name" }, signName.toLowerCase()] },
                            { $eq: ["$DOB", DOB] }
                        ]
                    }
                })
                .then((response) => {
                    if (response) {
                        // If document is found, resolve true
                        resolve(true);
                    } else {
                        // If document is not found, resolve false
                        resolve(false);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    
    
    getPortalAccess: (checkMail) => {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await db.getDb().collection(collection.USER_COLLECTION).findOne({ Email: checkMail });
    
                if (user) {
                    // Check if 'restrict_portal' exists and its value
                    if (user.restrict_portal === true) {
                        resolve(false); // Restrict access if 'restrict_portal' is true
                    } else {
                        resolve(true); // Allow access if 'restrict_portal' is false or not present
                    }
                } else {
                    resolve(false); // User not found, resolve false to indicate no access
                }
            } catch (error) {
                console.error(error);
                reject(error); // Handle any errors during the operation
            }
        });
    },    
    
    
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
          try {
            let loginStatus = false;
            let response = {};
            let user = await db.getDb().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
      
            if (user) {
              // Check if the account is locked
              if (user.lockoutTime && new Date() < user.lockoutTime) {
                const formattedLOCKTimestamp = new Date(user.lockoutTime).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                // Account is locked
                resolve({ status: false, locked: true, formattedLOCKTimestamp });
              } else {
                bcrypt.compare(userData.Password, user.Password).then(async (status) => {
                  if (status) {
                    // Reset failed attempts on successful login
                    await db.getDb().collection(collection.USER_COLLECTION).updateOne(
                      { _id: user._id },
                      { $set: { failedAttempts: 0, lockoutTime: null } }
                    );
                    console.log("login success");
                    
                    // Prepare the filtered user data
                    response.user = {
                        _id: user._id,
                        Name: user.Name || null,
                        Email: user.Email || null,
                        Status: user.Status || null,
                        Branch: user.Branch || null,
                        activeStatus: user.activeStatus || null,
                        restrict_group: user.restrict_group || null,
                        passoutYear: user.passoutYear || null,
                        upassExistingCount: user.upassExistingCount || null,
                        Gender: user.Gender || null
                    };
                    response.status = true;
      
                    const loginTimestamp = new Date();
                    await db.getDb().collection(collection.LOG_DETAILS_COLLECTION).updateOne(
                      { _id: user._id }, 
                      { $set: { lastLogin: loginTimestamp } }
                    );
      
                    resolve(response);
                  } else {
                    // Increment failed attempts on unsuccessful login
                    let failedAttempts = user.failedAttempts ? user.failedAttempts + 1 : 1;
                    let lockoutTime = null;
                    if (failedAttempts >= 6) {
                      // Set lockout time for 12 hours (half day)
                      lockoutTime = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
                    }
                    await db.getDb().collection(collection.USER_COLLECTION).updateOne(
                      { _id: user._id },
                      { $set: { failedAttempts: failedAttempts, lockoutTime: lockoutTime } }
                    );
                    console.log(`login failed. ${6 - failedAttempts} attempts left`);
                    resolve({ status: false, attemptsLeft: 6 - failedAttempts });
                  }
                });
              }
            } else {
              console.log("login failed");
              resolve({ status: false });
            }
          } catch (error) {
            console.error(error);
            reject(error);
          }
        });
    },
    
    
    setRequestOtp: (email) => {
        return new Promise((resolve, reject) => {
            const usercollection = db.getDb().collection(collection.USER_COLLECTION)
            
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
    
    
    getOtpRequest: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
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


    getOtpRequestTime: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
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
    

    updateOtpRequest: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).updateOne(
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


    trainDoc2VecInternshipModel: async() => {
        try {
            var users = await db.getDb().collection(collection.USER_COLLECTION).find().toArray();
            var internships = await db.getDb().collection(collection.INTERN_COLLECTION).find().toArray();
            const trainingData = [];
            users.forEach(user => {
                const userInterests = {
                    experiences: user.experience ? user.experience.map(exp => exp.description) : [],
                    location: user.currentLocation ? user.currentLocation : "",
                    interests: user.workDomains ? user.workDomains : []
                };
                trainingData.push({
                    userId: user._id ? user._id : "",
                    userName: user.Name ? user.Name : "",
                    ...userInterests
                });
            });
            internships.forEach(internship => {
                const internshipInterests = {
                    location: internship.LocationCurrent ? internship.LocationCurrent : "",
                    interests: internship.interestarea ? [internship.interestarea] : []
                };
                trainingData.push({
                    userId: internship.UserId ? internship.UserId : "",
                    userName: internship.Name ? internship.Name : "",
                    ...internshipInterests
                });
            });  
            trainingData.forEach(data => {
                if (Array.isArray(data.interests)) {
                    data.interests = data.interests.flat();
                }
            });  
            const jsonData = JSON.stringify(trainingData);
            const filePath = path.join(__dirname, '..', 'machine models', 'training_doc2vec_internship_data.json');
            fs.writeFileSync(filePath, jsonData);        
            console.log('Preprocessed data saved to training_doc2vec_internship_data.json');
        } catch (error) {
            console.error('Error processing data for  training_doc2vec_internship_data model:', error);
        }
    },   


    trainDoc2VecJobModel: async() => {
        try {
            var users = await db.getDb().collection(collection.USER_COLLECTION).find().toArray();
            const trainingData = [];
            users.forEach(user => {
                const userInterests = {
                    experiences: user.experience ? user.experience.map(exp => exp.description) : [],
                    location: user.currentLocation ? user.currentLocation : "",
                    interests: user.workDomains ? user.workDomains : [],
                    branch : user.Branch ? user.Branch : ""
                };
                trainingData.push({
                    userId: user._id ? user._id : "",
                    userName: user.Name ? user.Name : "",
                    ...userInterests
                });
            }); 
            trainingData.forEach(data => {
                if (Array.isArray(data.interests)) {
                    data.interests = data.interests.flat();
                }
            });  
            const jsonData = JSON.stringify(trainingData);
            const filePath = path.join(__dirname, '..', 'machine models', 'training_doc2vec_job_data.json');
            fs.writeFileSync(filePath, jsonData);        
            console.log('Preprocessed data saved to training_doc2vec_job_data.json');
        } catch (error) {
            console.error('Error processing data for training_doc2vec_job_data  model:', error);
        }
    },  


    passIndiProfileRecJsonDoc2VecModel : async (userId) => {
        try {
            // Ensure userId is in ObjectId format
            const userObjectId = new objectId(userId);
            
            // Find the user with the specified _id
            const user = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: userObjectId });
    
            if (!user) {
                throw new Error('User not found');
            }
    
            // Prepare user data for training
            const userInterests = {
                experiences: user.experience ? user.experience.map(exp => exp.description) : [],
                location: user.currentLocation ? user.currentLocation : "",
                interests: user.workDomains ? user.workDomains : [],
                branch: user.Branch ? user.Branch : ""
            };
    
            const trainingData = {
                userId: user._id ? user._id.toString() : "",
                userName: user.Name ? user.Name : "",
                ...userInterests
            };
    
            // Return the JSON data
            return trainingData;
        } catch (error) {
            console.error('Error processing data for training_doc2vec_job_data model:', error);
            throw error; // Re-throw the error for handling by the caller
        }
    },
    
    
    get1Profile2For2Profile8 : (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Define the fields to be retrieved
                const projection = {
                    Name: 1,
                    Email: 1,
                    Contact: 1,
                    Status: 1,
                    passoutYear: 1,
                    AdmissionYear: 1,
                    currentLocation: 1,
                    workDomains: 1,
                    Note: 1,
                    employmentStatus: 1,
                    experience: 1,
                    _id: 1
                };

                // Fetch the profile with the specified fields
                const profile = await db.getDb().collection(collection.USER_COLLECTION)
                    .findOne({ _id: new objectId(userId) }, { projection });

                // Check if the profile exists
                if (!profile) {
                    return resolve(null);
                }

                // Conditionally add employment-specific fields
                if (profile.employmentStatus === 'working') {
                    const working = await db.getDb().collection(collection.USER_COLLECTION)
                        .findOne(
                            { _id: new objectId(userId) },
                            { projection: { working: 1 } }
                        );
                    if (working) profile.working = working.working;
                } else if (profile.employmentStatus === 'ownCompany') {
                    const ownCompany = await db.getDb().collection(collection.USER_COLLECTION)
                        .findOne(
                            { _id: new objectId(userId) },
                            { projection: { ownCompany: 1 } }
                        );
                    if (ownCompany) profile.ownCompany = ownCompany.ownCompany;
                } else if (profile.employmentStatus === 'higherStudies') {
                    const higherStudies = await db.getDb().collection(collection.USER_COLLECTION)
                        .findOne(
                            { _id: new objectId(userId) },
                            { projection: { higherStudies: 1 } }
                        );
                    if (higherStudies) profile.higherStudies = higherStudies.higherStudies;
                }

                resolve(profile);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getProfileForNote : (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Define the projection to retrieve only the Note field
                const projection = { Note: 1 };
    
                // Fetch the profile with only the Note field
                const profile = await db.getDb().collection(collection.USER_COLLECTION)
                    .findOne({ _id: new objectId(userId) }, { projection });
    
                // Resolve only the Note field from the profile
                resolve(profile ? profile.Note : null);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getProfileForViewProfile : (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Define the fields to be retrieved
                const projection = {
                    Name: 1,
                    Email: 1,
                    Status: 1,
                    passoutYear: 1,
                    AdmissionYear: 1,
                    currentLocation: 1,
                    workDomains: 1,
                    Note: 1,
                    employmentStatus: 1,
                    experience: 1,
                    _id: 1,
                    activeStatus: 1,
                    restrict_portal: 1
                };

                // Fetch the profile with the specified fields
                const profile = await db.getDb().collection(collection.USER_COLLECTION)
                    .findOne({ _id: new objectId(userId) }, { projection });

                // Check if the profile exists
                if (!profile) {
                    return resolve(null);
                }

                // Conditionally add employment-specific fields
                if (profile.employmentStatus === 'working') {
                    const working = await db.getDb().collection(collection.USER_COLLECTION)
                        .findOne(
                            { _id: new objectId(userId) },
                            { projection: { working: 1 } }
                        );
                    if (working) profile.working = working.working;
                } else if (profile.employmentStatus === 'ownCompany') {
                    const ownCompany = await db.getDb().collection(collection.USER_COLLECTION)
                        .findOne(
                            { _id: new objectId(userId) },
                            { projection: { ownCompany: 1 } }
                        );
                    if (ownCompany) profile.ownCompany = ownCompany.ownCompany;
                } else if (profile.employmentStatus === 'higherStudies') {
                    const higherStudies = await db.getDb().collection(collection.USER_COLLECTION)
                        .findOne(
                            { _id: new objectId(userId) },
                            { projection: { higherStudies: 1 } }
                        );
                    if (higherStudies) profile.higherStudies = higherStudies.higherStudies;
                }

                resolve(profile);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getLowProfile: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: { Name: 1, Status: 1,passoutYear: 1,
                        AdmissionYear: 1, _id: 1} }
                )
                .then((user) => {
                    resolve(user);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    get1Edit2Profile2Details8 : (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: { Name: 1, Gender: 1, Email: 1, Contact: 1, _id: 0} }
                )
                .then((user) => {
                    resolve(user);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getUpdateProfileDetails : (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: {
                        passoutYear: 1,
                        AdmissionYear: 1,
                        currentLocation: 1,
                        employmentStatus: 1,
                        higherStudies: 1,
                        working: 1,
                        ownCompany: 1,
                        _id: 0
                    } }
                )
                .then((user) => {
                    resolve(user);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getPassUpdateProfileDetails : (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: { Password: 1} }
                )
                .then((user) => {
                    resolve(user.Password);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    insertNameIdStatus: (userData) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_BASIC_COLLECTION).insertOne(userData)
                    .then((response) => {
                        resolve(response);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    getBasicProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) }
                );
                if (profile) {
                    const { Name, Status, _id } = profile;
                    resolve({ Name, Status, _id: _id.toString() });
                } else {
                    resolve(null); // or resolve(undefined) depending on your preference
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    get1BasicUserProfile2DetailsFor2View8Viewers: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) })
                    .then((user) => {
                        if (!user) {
                            resolve(null); // Return null if no user found
                        } else {
                            const basicDetails = {
                                Status: user.Status
                            };
                            resolve(basicDetails); // Resolve only Name and Status fields
                        }
                    })
                    .catch(err => reject(err)); // Catch any internal errors
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },


    getEditSkillProfileDetails : (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: { workDomains: 1 } }
                )
                .then((user) => {
                    resolve(user.workDomains);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    getBasicUserProfileDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) })
                    .then((user) => {
                        if (!user) {
                            resolve(null); // Return null if no user found
                        } else {
                            const basicDetails = {
                                Name: user.Name,
                                Status: user.Status
                            };
                            resolve(basicDetails); // Resolve only Name and Status fields
                        }
                    })
                    .catch(err => reject(err)); // Catch any internal errors
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    

    getProfileViewers: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER).findOne({ user_id: userId })
                    .then((user) => {
                        if (!user || !user.viewerDetails || user.viewerDetails.length === 0) {
                            resolve([]); // Return empty array if no entry found or no viewerDetails array
                        } else {
                            const viewers = user.viewerDetails.map(viewer => ({ viewId: viewer.viewId, viewName: viewer.viewName, timestamp: viewer.timestamp }));
                            resolve(viewers); // Return array of viewId and timestamp objects
                        }
                    })
                    .catch(err => reject(err)); // Catch any internal errors
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    
    
    update1228Profile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) }, {
                    $set: {
                        Name: userDetails.Name,
                        Email: userDetails.Email,
                        Contact: userDetails.Contact,
                        Gender: userDetails.gender
                    }
                }).then((response) => {
                    resolve(); // Resolve the promise on successful update
                }).catch(err => {
                    reject(err); // Catch any error during the update operation
                });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },


    changeEmailAfterPass: (userId,password,changemail) => {
        // ONLY HERE 12 HOUR AFTER IS SETTED.
        return new Promise(async(resolve, reject) => {
            try {
                let response = {};
                let user = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
          
                if (user) {
                  // Check if the account is locked
                  if (user.lockoutChangeEmailPassTime && new Date() < user.lockoutChangeEmailPassTime) {
                    const formattedLOCKTimestamp = new Date(user.lockoutChangeEmailPassTime).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

                    // Account email change is locked
                    resolve({ status: false, locked: true, formattedLOCKTimestamp });
                  } else {
                    bcrypt.compare(password, user.Password).then(async (status) => {
                      if (status) {
                        // Reset failed attempts on successful login
                        await db.getDb().collection(collection.USER_COLLECTION).updateOne(
                          { _id: user._id },
                          { $set: { failedChangeEmailAttempts: 0, lockoutChangeEmailPassTime: null, Email: changemail} }
                        );
                        response.status = true;
          
                        resolve(response);
                      } else {
                        // Increment failed attempts on unsuccessful login
                        let failedChangeEmailAttempts = user.failedChangeEmailAttempts ? user.failedChangeEmailAttempts + 1 : 1;
                        let lockoutChangeEmailPassTime = null;
                        if (failedChangeEmailAttempts >= 3) {
                          // Set lockout time for 12 hours (half day)
                          lockoutChangeEmailPassTime = new Date(new Date().getTime() + 12 * 60 * 60 * 1000);
                        }
                        await db.getDb().collection(collection.USER_COLLECTION).updateOne(
                          { _id: user._id },
                          { $set: { failedChangeEmailAttempts: failedChangeEmailAttempts, lockoutChangeEmailPassTime: lockoutChangeEmailPassTime } }
                        );
                        resolve({ status: false, attemptsLeft: 3 - failedChangeEmailAttempts });
                      }
                    });
                  }
                } else {
                  resolve({ status: false });
                }
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    


    getUpdateProfilePushSettings: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) }).then((user) => {
                    if (!user) {
                        resolve(null); // Return null if no user found
                        return;
                    }
    
                    let location = user.currentLocation ? true : false;
                    let passoutYear = user.passoutYear ? true : false;
                    let empStatus = user.employmentStatus ? true : false;
                    resolve({ location, passoutYear, empStatus });
                }).catch(err => {
                    reject(err); // Catch any error during findOne query
                });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    

    getUpdateProfilePushInProfileExperienceSettings: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) }).then((user) => {
                    if (!user) {
                        resolve(null); // Return null if no user found
                        return;
                    }
    
                    let experience = user.experience ? true : false;
                    resolve({ experience });
                }).catch(err => {
                    reject(err); // Catch any error during findOne query
                });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    
    
    getUpdateProfilePushInProfileDomainSettings: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) }).then((user) => {
                    if (!user) {
                        resolve(null); // Return null if no user found
                        return;
                    }
    
                    let domain = user.workDomains ? true : false;
                    resolve({ domain });
                }).catch(err => {
                    reject(err); // Catch any error during findOne query
                });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    
    
    insertloggedINTime1228: (userId) => {
        userId = userId.toString()
        return new Promise((resolve, reject) => {
            try {
                let currentTime = new Date(); // Get current timestamp
                let logEntry = {
                    userId: userId,
                    logs: [{ loggedIN: currentTime }] // Create an array with current timestamp
                };
    
                db.getDb().collection(collection.LOG_DETAILS_COLLECTION).findOne({ userId: userId })
                    .then((existingEntry) => {
                        if (existingEntry) {
                            return db.getDb().collection(collection.LOG_DETAILS_COLLECTION)
                                .updateOne(
                                    { userId: userId },
                                    { $push: { logs: { loggedIN: currentTime } } }
                                );
                        } else {
                            return db.getDb().collection(collection.LOG_DETAILS_COLLECTION).insertOne(logEntry);
                        }
                    })
                    .then(() => {
                        return db.getDb().collection(collection.USER_COLLECTION)
                            .updateOne(
                                { _id: new objectId(userId) },
                                { $set: { lastlogged_In: currentTime } }
                            );
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error); // Catch any error during database operations
                    });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
        
    
    insertloggedOUTTime: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                let currentTime = new Date(); // Get current timestamp
                let logEntry = {
                    userId: userId,
                    logs: [{ loggedOUT: currentTime }] // Create an array with current timestamp
                };
    
                db.getDb().collection(collection.LOG_DETAILS_COLLECTION).findOne({ userId: userId })
                    .then((existingEntry) => {
                        if (existingEntry) {
                            return db.getDb().collection(collection.LOG_DETAILS_COLLECTION)
                                .updateOne(
                                    { userId: userId },
                                    { $push: { logs: { loggedOUT: currentTime } } }
                                );
                        } else {
                            return db.getDb().collection(collection.LOG_DETAILS_COLLECTION).insertOne(logEntry);
                        }
                    })
                    .then(() => {
                        return db.getDb().collection(collection.USER_COLLECTION)
                            .updateOne(
                                { _id: new objectId(userId) },
                                { $set: { lastlogged_OUT: currentTime } }
                            );
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error); // Catch any error during database operations
                    });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },
    

    countLogins: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.LOG_DETAILS_COLLECTION).aggregate([
                    { $match: { userId: userId } },
                    { $unwind: "$logs" },
                    { $match: { "logs.loggedIN": { $exists: true }, "logs.loggedOUT": { $exists: false } } },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ]).toArray()
                .then(result => {
                    if (result.length > 0) {
                        resolve(result[0].count);
                    } else {
                        resolve(0); // If no matching documents found, resolve with count 0
                    }
                })
                .catch(error => {
                    reject(error); // Catch any error during aggregation pipeline or promise chain
                });
            } catch (error) {
                reject(error); // Catch any synchronous errors
            }
        });
    },    


    addViewProfile: (userId, viewId, viewName) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER);
                userCollection.findOne({ user_id: userId })
                    .then(user => {
                        if (!user) {
                            // User not found, create a new entry
                            const newUserEntry = {
                                user_id: userId,
                                viewerDetails: [{ viewId: viewId, viewName: viewName, timestamp: new Date() }],
                                existing_view_count: 1 // Initialize existing_view_count to 1
                            };
                            return userCollection.insertOne(newUserEntry);
                        } else {
                            // User found, update the viewerDetails array and increment existing_view_count
                            const viewDetail = { viewId: viewId, viewName: viewName, timestamp: new Date() };
                            return userCollection.updateOne(
                                { _id: new objectId(user._id) },
                                { 
                                    $push: { viewerDetails: viewDetail },
                                    $inc: { existing_view_count: 1 } // Increment existing_view_count by 1
                                }
                            );
                        }
                    })
                    .then(result => {
                        resolve(result);
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        reject(error); // Catch any errors during MongoDB operations
                    });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch any synchronous errors
            }
        });
    },


    getLastViewProfileMailSended: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER);
    
                // Find the user by userId
                userCollection.findOne({ user_id: userId })
                    .then(user => {
                        if (!user || user.last_view_profile_mailtime === undefined) {
                            // If user not found or last_view_profile_mailtime is not found, resolve null
                            resolve(null);
                        } else {
                            // If last_view_profile_mailtime is found, resolve its value
                            resolve(user.last_view_profile_mailtime);
                        }
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        reject(error); // Catch any errors during MongoDB operations
                    });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch any synchronous errors
            }
        });
    },  
    
    
    setLastViewProfileMailSended: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                const current_time = new Date();
                const userCollection = db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER);
    
                // Find the user by userId
                userCollection.findOne({ user_id: userId })
                    .then(user => {
                        if (user) {
                            // If user is found, update last_view_profile_mailtime to the current time
                            return userCollection.updateOne(
                                { user_id: userId },
                                { $set: { last_view_profile_mailtime: current_time } }
                            );
                        } else {
                            // If no user found, resolve without doing anything
                            resolve();
                        }
                    })
                    .then(() => {
                        // Resolve the promise after the update
                        resolve();
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        reject(error); // Catch any errors during MongoDB operations
                    });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch any synchronous errors
            }
        });
    },    
    

    getViewNotifications: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.NOTIFICATION_COLLECTION).findOne({ Sender_Id: userId })
                    .then((user) => {
                        if (user && user.notification && user.notification.length > 0) {
                            resolve(user.notification);
                        } else {
                            resolve([]);
                        }
                    })
                    .catch((err) => {
                        reject(err); // Catch any errors from MongoDB operations
                    });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch any synchronous errors
            }
        });
    },    
    

    updateNote: (userId, userNote) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).updateOne(
                    { _id: new objectId(userId) },
                    {
                        $set: {
                            Note: userNote.Note
                        }
                    }
                ).then((response) => {
                    resolve();
                }).catch((error) => {
                    console.error("MongoDB Update Error:", error);
                    reject(error); // Catch MongoDB update errors
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
    

    updateonetwoskilltwoeightProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
            try {
                const updateObject = {};
    
                if (userDetails.workDomains) {
                    let validWorkDomains = [];
    
                    if (Array.isArray(userDetails.workDomains)) {
                        validWorkDomains = userDetails.workDomains.filter(domain => domain !== null && domain.trim() !== "");
                    } else {
                        if (userDetails.workDomains !== null && userDetails.workDomains.trim() !== "") {
                            validWorkDomains.push(userDetails.workDomains);
                        }
                    }
    
                    if (validWorkDomains.length > 0) {
                        updateObject.$push = { workDomains: { $each: validWorkDomains } };
                    }
                }
    
                if (Object.keys(updateObject).length > 0) {
                    db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) }, updateObject)
                        .then((response) => {
                            resolve();
                        })
                        .catch((error) => {
                            console.error("MongoDB Update Error:", error);
                            reject(error); // Catch MongoDB update errors
                        });
                } else {
                    resolve();
                }
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
    

    editskillProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
            try {
                const updateObject = {};
    
                if (userDetails.hasOwnProperty('workDomains')) {
                    if (Array.isArray(userDetails.workDomains)) {
                        // Filter out null or empty strings
                        const filteredWorkDomains = userDetails.workDomains.filter(domain => domain !== null && domain.trim() !== "");
    
                        if (filteredWorkDomains.length > 0) {
                            // If filtered array is not empty, set the workDomains field
                            updateObject.$set = { workDomains: filteredWorkDomains };
                        } else {
                            // If filtered array is empty, clear the workDomains field
                            updateObject.$unset = { workDomains: "" };
                        }
                    } else if (typeof userDetails.workDomains === 'string' && userDetails.workDomains.trim() !== "") {
                        // If workDomains is a non-empty string, set it as an array with one element
                        updateObject.$set = { workDomains: [userDetails.workDomains.trim()] };
                    } else {
                        // If workDomains is an empty string or something else, clear the workDomains field
                        updateObject.$unset = { workDomains: "" };
                    }
                } else {
                    // If workDomains is not present in userDetails, clear the workDomains field
                    updateObject.$unset = { workDomains: "" };
                }
    
                // If there's something to update (either $set or $unset)
                if (Object.keys(updateObject).length > 0) {
                    db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) }, updateObject)
                        .then(() => {
                            resolve();
                        })
                        .catch((error) => {
                            console.error("MongoDB Update Error:", error);
                            reject(error); // Catch MongoDB update errors
                        });
                } else {
                    // Nothing to update, resolve immediately
                    resolve();
                }
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },     
    

    updateexperienceProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
            try {
                // Fetch the existing user details
                db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) }).then(existingUser => {
                    const existingExperiences = existingUser.experience || [];
        
                    const experiences = [];
        
                    // Convert single values to arrays
                    const startMonths = Array.isArray(userDetails.experienceStartMonth) ? userDetails.experienceStartMonth : [userDetails.experienceStartMonth];
                    const startYears = Array.isArray(userDetails.experienceStartYear) ? userDetails.experienceStartYear : [userDetails.experienceStartYear];
                    const endMonths = Array.isArray(userDetails.experienceEndMonth) ? userDetails.experienceEndMonth : [userDetails.experienceEndMonth];
                    const endYears = Array.isArray(userDetails.experienceEndYear) ? userDetails.experienceEndYear : [userDetails.experienceEndYear];
                    const companies = Array.isArray(userDetails.experienceCompanyName) ? userDetails.experienceCompanyName : [userDetails.experienceCompanyName];
                    const descriptions = Array.isArray(userDetails.experienceDescription) ? userDetails.experienceDescription : [userDetails.experienceDescription];
        
                    // Calculate the next experience number
                    const nextExperienceNumber = existingExperiences.length + 1;
        
                    // Loop through the arrays and create the desired structure
                    startMonths.forEach((startMonth, index) => {
                        const experienceId = new objectId();
                        const experience = {
                            _id: experienceId,
                            startMonth: startMonths[index],
                            startYear: startYears[index],
                            endMonth: endMonths[index],
                            endYear: endYears[index],
                            companyName: companies[index],
                            description: descriptions[index]
                        };
                        experiences.push(experience);
                    });
        
                    // Add the new experiences to the existing array in the database
                    db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) }, {
                        $push: { experience: { $each: experiences } }
                    }).then((response) => {
                        resolve();
                    }).catch((error) => {
                        console.error("MongoDB Update Error:", error);
                        reject(error); // Catch MongoDB update errors
                    });
                }).catch((error) => {
                    console.error("Fetch User Error:", error);
                    reject(error); // Catch errors during fetching existing user details
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
    
    
    getExperienceDetails: (userId, experienceId) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                userCollection.findOne({
                    _id: new objectId(userId),
                    "experience._id": new objectId(experienceId)
                }).then((user) => {
                    if (user) {
                        const experience = user.experience.find(exp => exp._id.toString() === experienceId);
                        resolve(experience);
                    } else {
                        resolve(null); // Experience not found
                    }
                }).catch((err) => {
                    console.error("MongoDB Find Error:", err);
                    reject(err); // Catch MongoDB find errors
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
    

    updateExperience: (userId, experienceBody) => {
        return new Promise((resolve, reject) => {
            try {
                const experienceId = experienceBody.Expid;
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                userCollection.findOneAndUpdate(
                    {
                        _id: new objectId(userId),
                        "experience._id": new objectId(experienceId)
                    },
                    {
                        $set: {
                            "experience.$.startMonth": experienceBody.experienceStartMonth,
                            "experience.$.startYear": experienceBody.experienceStartYear,
                            "experience.$.endMonth": experienceBody.experienceEndMonth,
                            "experience.$.endYear": experienceBody.experienceEndYear,
                            "experience.$.companyName": experienceBody.experienceCompanyName,
                            "experience.$.description": experienceBody.experienceDescription
                        }
                    },
                    { returnDocument: 'after' } // Return the updated document
                ).then((result) => {
                    const updatedExperience = result.value ? result.value.experience.find(exp => exp._id.toString() === experienceId) : null;
                    resolve(updatedExperience);
                }).catch((err) => {
                    console.error("MongoDB Update Error:", err);
                    reject(err); // Catch MongoDB update errors
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
     

    deleteExperience: (userId, experienceId) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                userCollection.updateOne(
                    {
                        _id: new objectId(userId)
                    },
                    {
                        $pull: {
                            experience: {
                                _id: new objectId(experienceId)
                            }
                        }
                    }
                ).then((response) => {
                    resolve({ deleteJob: true });
                }).catch((error) => {
                    console.error("MongoDB Update Error:", error);
                    reject(error); // Catch MongoDB update errors
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
        

    updateUPass: (User, OldPass,old_Pass,UserId) => {
        let OldP = User;
        let NewP = OldPass;
        let NewPW = old_Pass
        let response = {};

        return new Promise((resolve, reject) => {
            try {
                if (!OldP) {
                    throw new Error('Old password and new password must be provided');
                }

                bcrypt.compare(NewP, OldP).then(async (status) => {
                    if (status) {
                        NewPW = await bcrypt.hash(NewPW, 10);
                        await db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(UserId)},
                        {
                            $set: {
                                Password: NewPW,
                            },
                        });
                        response.status = true;
                        resolve(response);
                    } else {
                        resolve({ status: false });
                    }
                }).catch(err => {
                    console.error("Bcrypt compare error:", err);
                    reject(err);
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },


    setupassFail: (userID) => {
        return new Promise(async(resolve, reject) => {
            try {
                const usercollection = db.getDb().collection(collection.USER_COLLECTION)
                usercollection.findOne({ _id: new objectId(userID) }).then((user) => {
                if (!user) {
                    // No user found 
                    resolve();
                    return;
                }
        
                const updateFields = {};
                const currentTime = new Date();
    
                if (!user.updatePassRequst && !user.updatepass_lock_time) {
                    updateFields.updatePassRequst = 1;
                    updateFields.updatepass_lock_time = null;
                } else if (user.updatePassRequst === 2) {
                    updateFields.updatePassRequst = 3;
                    updateFields.updatepass_lock_time = currentTime;
                } else if (user.updatePassRequst) {
                    if (user.updatePassRequst < 3) {
                        updateFields.updatePassRequst = user.updatePassRequst + 1;
                    }
                } else {
                    updateFields.updatePassRequst = 1;
                }
        
                usercollection.updateOne(
                    { _id: new objectId(userID) },
                    { $set: updateFields }
                ).then((response) => {
                    resolve();
                    }).catch((error) => {
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
                   
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },


    updateupassFail: (userID) => {
        return new Promise(async(resolve, reject) => {
            try {

                db.getDb().collection(collection.USER_COLLECTION).updateOne(
                    { _id: new objectId(userID) },
                    {
                        $set: {
                            updatePassRequst: 0,
                            updatepass_lock_time: null
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
                   
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },
    

    getupassFail: (userID) => {
        return new Promise(async(resolve, reject) => {
            try {

                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userID) },
                    { projection: { updatePassRequst: 1, updatepass_lock_time: 1 } }
                ).then((response) => {
                    if (response) {
                        resolve(response);
                    } else {
                        resolve(null);
                    }
                }).catch((error) => {
                    reject(error);
                });
                   
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },


    updateUPassOTP: (userID, NewPW) => {
        let response = {};

        return new Promise(async(resolve, reject) => {
            try {
                NewPW = await bcrypt.hash(NewPW, 10);
                await db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userID) },
                    {
                        $set: {
                            Password: NewPW,
                        },
                    });
                response.status = true;
                resolve(response);     
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },
    

    doRecoveruserpass: (userDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {};
                let user = await db.getDb().collection(collection.USER_COLLECTION).findOne({ Email: userDetails.Email });
                let NewPW = userDetails.newpassword;
                let userId = user._id;
    
                if (user) {
                    NewPW = await bcrypt.hash(NewPW, 10);
                    await db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) },
                        {
                            $set: {
                                Password: NewPW,
                                Cpass: NewPW
                            },
                        });
                    response.status = true;
                    resolve(response);
                        
                } else {
                    resolve({ status: false });
                }
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },


    RecAccountCount: (Sender_Mail) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const user = await userCollection.findOne({ Email: Sender_Mail });

                if (user) {
                    if (user.upassCurrentCount !== undefined) {
                        await userCollection.updateOne(
                            { _id: user._id },
                            { $inc: { upassCurrentCount: 1 }, $set: { upassConfirm: false } }
                        );
                    } else {
                        await userCollection.updateOne(
                            { _id: user._id },
                            { $set: { upassCurrentCount: 1, upassConfirm: false } }
                        );
                    }
                }

                resolve(); // Resolve the promise as there's no need to return anything
            } catch (error) {
                reject(error);
            }
        });
    },


    userPassUpdateRecDataDetailLog: (Sender_Mail) => {
        return new Promise(async (resolve, reject) => {
            try {
                let currentTime = new Date(); // Get current timestamp
                const logDetailsCollection = db.getDb().collection(collection.LOG_DETAILS_COLLECTION);
                const userCollection = await db.getDb().collection(collection.USER_COLLECTION).findOne({ Email: Sender_Mail });
    
                if (!userCollection) {
                    throw new Error('User not found');
                }
        
                const existingEntry = await logDetailsCollection.findOne({ userId: userCollection._id });
    
                if (existingEntry) {
                    await logDetailsCollection.updateOne(
                        { userId: (existingEntry.userId).toString() },
                        { $push: { RecoverPasslogs: { Last_Updated: currentTime } } }
                    );
                } else {
                    let RecoverPasslogEntry = {
                        userId: userCollection._id,
                        RecoverPasslogs: [{ Last_Updated: currentTime }] // Create an array with current timestamp
                    };
                    await logDetailsCollection.insertOne(RecoverPasslogEntry);
                }
    
                await db.getDb().collection(collection.USER_COLLECTION).updateOne(
                    { Email: Sender_Mail },
                    { $set: { lastPasswordRecovered: currentTime } }
                );
                resolve();
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },
    

    getRecOtpRequest: (email) => {
        console.log("GET RECOVER OTP FUNCTION CALLED")
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
                { Email: email },
                { projection: { RecoverOtpreQuestcounT: 1, recover_opt_lock_time: 1 } }
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


    updateRecOtpRequest: (email) => {
        console.log("GET UPDATE OTP FUNCTION CALLED")
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).updateOne(
                { Email: email },
                {
                    $set: {
                        RecoverOtpreQuestcounT: 0,
                        recover_opt_lock_time: null
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


    setRequestRecOtp: (email) => {
        console.log("SET RECOVER OTP FUNCTIONS CALLED")
        return new Promise((resolve, reject) => {
            const usercollection = db.getDb().collection(collection.USER_COLLECTION)
            
            usercollection.findOne({ Email: email }).then((user) => {
                if (!user) {
                    // No user found with the given email
                    resolve();
                    return;
                }
    
                const updateFields = {};
                const currentTime = new Date();
    
                if (!user.RecoverOtpreQuestcounT && !user.recover_opt_lock_time) {
                    updateFields.RecoverOtpreQuestcounT = 1;
                    updateFields.recover_opt_lock_time = null;
                } else if (user.RecoverOtpreQuestcounT === 2) {
                    updateFields.RecoverOtpreQuestcounT = 3;
                    updateFields.recover_opt_lock_time = currentTime;
                } else if (user.RecoverOtpreQuestcounT) {
                    if (user.RecoverOtpreQuestcounT < 3) {
                        updateFields.RecoverOtpreQuestcounT = user.RecoverOtpreQuestcounT + 1;
                    }
                } else {
                    updateFields.RecoverOtpreQuestcounT = 1;
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


    getRecOtpRequestTime: (email) => {
        console.log("GET TIME RECOVER OTP FUNCTION CALLED")
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
                { Email: email },
                { projection: { recover_opt_lock_time: 1 } }
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
    

    userPassUpdateDetailLog: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let currentTime = new Date(); // Get current timestamp
                let UpdatePasslogEntry = {
                    userId: userId,
                    updatePasslogs: [{ Last_Updated: currentTime }] // Create an array with current timestamp
                };
                const logDetailsCollection = db.getDb().collection(collection.LOG_DETAILS_COLLECTION);
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                const existingEntry = await logDetailsCollection.findOne({ userId: userId });
    
                if (existingEntry) {
                    await logDetailsCollection.updateOne(
                        { userId: userId },
                        { $push: { updatePasslogs: { Last_Updated: currentTime } } }
                    );
                } else {
                    await logDetailsCollection.insertOne(UpdatePasslogEntry);
                }
    
                await userCollection.updateOne(
                    { _id: new objectId(userId) },
                    { $set: { lastPasswordUpdated: currentTime } }
                );
    
                resolve();
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },
    

    updateuserProfile: (userId, userDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const user = await userCollection.findOne({ _id: new objectId(userId) });
                const currentTime = new Date();
    
                let updatedData = {
                    $set: {
                        passoutYear: userDetails.passoutYear,
                        AdmissionYear: userDetails.AdmissionYear,
                        employmentStatus: userDetails.employmentStatus,
                        currentLocation: userDetails.currentLocation,
                        lasProfiletUpdated: currentTime
                    },
                    $addToSet: {}
                };
    
                if (userDetails.employmentStatus === 'working') {
                    // Store the arrays related to working in workingOwnedPreviousStorage array inside storage space working
                    updatedData.$set.working = {
                        workingCompanyName: userDetails.workingCompanyName,
                        workingCompanyJoinedYear: userDetails.workingCompanyJoinedYear,
                        WorkingownedPreviousCompany: userDetails.WorkingownedPreviousCompany === 'yes' ? 'yes' : 'no',
                        WorkingownedPreviousStorage: []
                    };
    
                    if (Array.isArray(userDetails['WorkingadditionalFoundedCompanyYear'])) {
                        userDetails['WorkingadditionalFoundedCompanyYear'].forEach((year, index) => {
                            const name = userDetails['WorkingadditionalFoundedCompanyName'][index];
    
                            if (year && name) {
                                updatedData.$set.working.WorkingownedPreviousStorage.push({ year, name });
                            }
                        });
                    } else if (userDetails['WorkingadditionalFoundedCompanyYear'] && userDetails['WorkingadditionalFoundedCompanyName']) {
                        // Handle single values
                        const year = userDetails['WorkingadditionalFoundedCompanyYear'];
                        const name = userDetails['WorkingadditionalFoundedCompanyName'];
    
                        updatedData.$set.working.WorkingownedPreviousStorage.push({ year, name });
                    }
                } else if (userDetails.employmentStatus === 'ownCompany') {
                    // Store the arrays related to ownCompany in ownAdditionalFoundedCompanyStorage array inside storage space ownCompany
                    updatedData.$set.ownCompany = {
                        FoundedCompanyName: userDetails.FoundedCompanyName,
                        foundedYear: userDetails.foundedYear,
                        mainLocation: userDetails.mainLocation,
                        subbranches: userDetails['subbranches'] ? userDetails['subbranches'] : [],
                        ownedPreviousCompany: userDetails.ownedOwnPreviousCompany === 'yes' ? 'yes' : 'no',
                        OwnadditionalFoundedCompanyStorage: []
                    };
    
    
                    if (Array.isArray(userDetails['OwnadditionalFoundedCompanyYear'])) {
                        userDetails['OwnadditionalFoundedCompanyYear'].forEach((year, index) => {
                            const name = userDetails['OwnadditionalFoundedCompanyName'][index];
    
                            if (year && name) {
                                updatedData.$set.ownCompany.OwnadditionalFoundedCompanyStorage.push({ year, name });
                            }
                        });
                    } else if (userDetails['OwnadditionalFoundedCompanyYear'] && userDetails['OwnadditionalFoundedCompanyName']) {
                        // Handle single values
                        const year = userDetails['OwnadditionalFoundedCompanyYear'];
                        const name = userDetails['OwnadditionalFoundedCompanyName'];
    
                        updatedData.$set.ownCompany.OwnadditionalFoundedCompanyStorage.push({ year, name });
                    }
                } else if (userDetails.employmentStatus === 'higherStudies') {
                    updatedData.$set.higherStudies = {
                        higherstudiesJoinedInstitutionName: userDetails.higherstudiesJoinedInstitutionName,
                        higherstudiesJoinedCoarse: userDetails.higherstudiesJoinedCoarse,
                        higherstudiesJoinedCourseBrief: userDetails.higherstudiesJoinedCourseBrief,
                        higherstudiesJoinedYear: userDetails.higherstudiesJoinedYear,
                        higherstudiesJoinedLocation: userDetails.higherstudiesJoinedLocation,
                        higherstudiesJoinedEntrance: userDetails.higherstudiesJoinedEntrance === 'yes' ? 'yes' : 'no',
                        entranceExamName: userDetails.entranceExamName,
                        entranceExamScore: userDetails.entranceExamScore,
                    };
                }
            
                // Update or insert data into the database
                if (user) {
                    await userCollection.updateOne({ _id: new objectId(userId) }, updatedData);
                } else {
                    await userCollection.insertOne(updatedData.$set);
                }
                resolve();
            } catch (error) {
                console.error("Error:", error);
                reject(error);
            }
        });
    },

    
    handleGroupChatMessage: (MessageId, userId, Name, messageContent, actualMessageId, actualMessageUsername, actualMessageContent, timestamp, status, SENDBY, formattedTime) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date(); // Get the current time
    
                // Insert the message into the GROUP_CHAT_COLLECTION
                const insertMessage = db.getDb().collection(collection.GROUP_CHAT_COLLECTION).insertOne({
                    MessageId,
                    userId,
                    Name,
                    messageContent,
                    actualMessageId,
                    actualMessageUsername,
                    actualMessageContent,
                    timestamp,
                    status,
                    SENDBY,
                    formattedTime
                });
    
                // Check if an entry exists in GROUP_UNIQUE_COLLECTION
                const findAndUpdateOrInsertTime = db.getDb().collection(collection.GROUP_UNIQUE_COLLECTION).findOneAndUpdate(
                    {}, // Filter condition, you can adjust this if you have specific criteria
                    { $set: { initial_time: currentTime } }, // Update the initial_time with current time
                    { upsert: true, returnOriginal: false } // Upsert: insert if not found; return the new document
                );
    
                // Wait for both operations to complete
                Promise.all([insertMessage, findAndUpdateOrInsertTime]).then(() => {
                    resolve({ addedGroupMessage: true });
                }).catch(error => {
                    console.error(error);
                    reject(new Error("Error handling group chat message"));
                });
    
            } catch (error) {
                console.error(error);
                reject(new Error("Error handling group chat message"));
            }
        });
    },    


    FetchGroupMessageInitiationTime: () => {
        return new Promise((resolve, reject) => {
            try {
                // Fetch the initial_time from GROUP_UNIQUE_COLLECTION
                db.getDb().collection(collection.GROUP_UNIQUE_COLLECTION).findOne({}, { projection: { initial_time: 1 } })
                    .then(document => {
                        if (document && document.initial_time) {
                            resolve(document.initial_time);
                        } else {
                            resolve(null); // If no document or initial_time found, resolve with null
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        reject(new Error("Error fetching group chat initiation time"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error fetching group chat initiation time"));
            }
        });
    },    
    
    
    handleOneChatMessage: (MessageId, messageContent, actualMessageId, actualMessageContent, timestamp, status, Reciever_Id, Sender_Id, ReadableTime, Sender_name, Reciever_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION);
    
                // Check if the sender's document exists
                let senderChat = await oneOnOneChatCollection.findOne({ Sender_Id });
    
                // If the sender's document doesn't exist, create it
                if (!senderChat) {
                    await oneOnOneChatCollection.insertOne({ Sender_Id, [Sender_Id]: {} });
                    senderChat = await oneOnOneChatCollection.findOne({ Sender_Id });
                }
    
                // Initialize the receiver's array if it doesn't exist
                if (!senderChat[Sender_Id][Reciever_Id]) {
                    senderChat[Sender_Id][Reciever_Id] = [];
                }
    
                // Add the new message to the receiver's array
                senderChat[Sender_Id][Reciever_Id].push({
                    MessageId,
                    messageContent,
                    actualMessageId,
                    actualMessageContent,
                    timestamp,
                    status,
                    ReadableTime,
                    Sender_name,
                    Reciever_name
                });
    
                // Update the sender's document with the new message
                await oneOnOneChatCollection.updateOne(
                    { Sender_Id },
                    { $set: { [Sender_Id]: senderChat[Sender_Id] } }
                );
    
                // Resolve with addedonemessage set to true
                resolve({ addedonemessage: true });
    
            } catch (error) {
                console.error(error);
                reject(new Error("Error handling one-on-one chat message"));
            }
        });
    },    
       

    handleOneChatMessageAdmin: async (MessageId, messageContent, actualMessageId, actualMessageContent, timestamp, status, Reciever_Id, Sender_Id, ReadableTime, Sender_name, Reciever_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN);
        
                const senderChat = await oneOnOneChatCollection.findOne({ Sender_Id });
        
                if (!senderChat) {
                    await oneOnOneChatCollection.insertOne({ Sender_Id, [Sender_Id]: {} });
                }
        
                const senderChatDocument = await oneOnOneChatCollection.findOne({ Sender_Id });

                if (!senderChatDocument[Sender_Id][Reciever_Id]) {
                    senderChatDocument[Sender_Id][Reciever_Id] = [];
                }
        
                senderChatDocument[Sender_Id][Reciever_Id].push({
                    MessageId,
                    messageContent,
                    Reciever_name,
                    Sender_name,
                    actualMessageId,
                    actualMessageContent,
                    timestamp,
                    ReadableTime,
                    status
                });
        
                await oneOnOneChatCollection.updateOne({ Sender_Id }, { $set: { [Sender_Id]: senderChatDocument[Sender_Id] } });
                resolve({ addedoneAdminmessage: true });

            } catch (error) {
                console.error(error);
                throw new Error("Error handling one-on-one chat message");
            }
        });
    },


    addOneReaction: (messageID, receiverId, SenderId, Emoji) => {
        return new Promise(async (resolve, reject) => {
            try {
                const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION);
    
                // Find the document where Sender_Id matches SenderId parameter
                const senderChatDocument = await oneOnOneChatCollection.findOne({ Sender_Id: SenderId });
    
                if (!senderChatDocument) {
                    throw new Error("Sender chat document not found");
                }
    
                // Check if there's a document named SenderId
                if (!senderChatDocument[SenderId]) {
                    senderChatDocument[SenderId] = {};
                }
    
                // Check if there's an array named receiverId
                if (!senderChatDocument[SenderId][receiverId]) {
                    senderChatDocument[SenderId][receiverId] = [];
                }
    
                // Find the entry in the array where MessageId matches messageID
                const messageEntry = senderChatDocument[SenderId][receiverId].find(message => message.MessageId === messageID);
    
                if (!messageEntry) {
                    throw new Error("Message entry not found");
                }
    
                // Check if there's a field named emoji in the message entry
                if (messageEntry.emoji) {
                    if (messageEntry.emoji === Emoji) {
                        // Remove the emoji field if it matches the Emoji parameter
                        delete messageEntry.emoji;
                    } else {
                        // Replace existing emoji with new Emoji parameter
                        messageEntry.emoji = Emoji;
                    }
                } else {
                    // Create a field named emoji and insert Emoji into it
                    messageEntry.emoji = Emoji;
                }
    
                // Update the document in the collection
                await oneOnOneChatCollection.updateOne(
                    { Sender_Id: SenderId },
                    { $set: { [SenderId]: senderChatDocument[SenderId] } }
                );
    
                // Resolve the variable addONEreaction as true
                resolve({ addONEreaction: true });
    
            } catch (error) {
                console.error(error);
                reject(new Error("Error handling one-on-one chat message"));
            }
        });
    },


    getMessageByAdminOneIdText: (messageId, user_iD, recieverId) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": user_iD
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne(query)
                    .then((result) => {
                        if (result) {
                            const userMessages = result[user_iD];
                            if (userMessages && userMessages[recieverId]) {
                                const messagesArray = userMessages[recieverId];
                                const message = messagesArray.find(msg => msg.MessageId === messageId);
                                if (message) {
                                    let result = {
                                        has_message: false
                                    };
                                    if (message.messageContent && message.messageContent !== '' && message.messageContent !== null) {
                                        result.has_message = true;
                                    }
                                    resolve(result);
                                } else {
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error getting message by admin one ID text"));
            }
        });
    },
     

    getMessageByAdminOneId: (messageId, user_iD, recieverId) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": user_iD
                };
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne(query)
                    .then((result) => {
                        if (result) {
                            const userMessages = result[user_iD];
                            if (userMessages && userMessages[recieverId]) {
                                const messagesArray = userMessages[recieverId];
                                const message = messagesArray.find(msg => msg.MessageId === messageId);
                                if (message) {
                                    resolve(message);
                                } else {
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error getting message by admin one ID"));
            }
        });
    },
        

    addOneAdminReaction: (messageID, receiverId, SenderId, Emoji) => {
        return new Promise(async (resolve, reject) => {
            try {
                const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN);
    
                // Find the document where Sender_Id matches SenderId parameter
                const senderChatDocument = await oneOnOneChatCollection.findOne({ Sender_Id: SenderId });
    
                if (!senderChatDocument) {
                    throw new Error("Sender chat document not found");
                }
    
                // Check if there's a document named SenderId
                if (!senderChatDocument[SenderId]) {
                    senderChatDocument[SenderId] = {};
                }
    
                // Check if there's an array named receiverId
                if (!senderChatDocument[SenderId][receiverId]) {
                    senderChatDocument[SenderId][receiverId] = [];
                }
    
                // Find the entry in the array where MessageId matches messageID
                const messageEntry = senderChatDocument[SenderId][receiverId].find(message => message.MessageId === messageID);
    
                if (!messageEntry) {
                    throw new Error("Message entry not found");
                }
    
                // Check if there's a field named emoji in the message entry
                if (messageEntry.emoji) {
                    if (messageEntry.emoji === Emoji) {
                        // Remove the emoji field if it matches the Emoji parameter
                        delete messageEntry.emoji;
                    } else {
                        // Replace existing emoji with new Emoji parameter
                        messageEntry.emoji = Emoji;
                    }
                } else {
                    // Create a field named emoji and insert Emoji into it
                    messageEntry.emoji = Emoji;
                }
    
                // Update the document in the collection
                await oneOnOneChatCollection.updateOne(
                    { Sender_Id: SenderId },
                    { $set: { [SenderId]: senderChatDocument[SenderId] } }
                );
    
                // Resolve the variable addONEreaction as true
                resolve({ addONEADMINreaction: true });
    
            } catch (error) {
                console.error(error);
                reject(new Error("Error handling one-on-one chat message"));
            }
        });
    },


    getMessageByAdminOneIdEmoji: (messageId, user_iD, recieverId) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": user_iD
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne(query)
                    .then((result) => {
                        if (result) {
                            const userMessages = result[user_iD];
                            if (userMessages && userMessages[recieverId]) {
                                const messagesArray = userMessages[recieverId];
                                const message = messagesArray.find(msg => msg.MessageId === messageId);
                                if (message) {
                                    let result = {
                                        MessageId: message.MessageId,
                                        emoji: message.emoji,
                                    };            
                                    resolve(result);
                                } else {
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(new Error("Error finding message"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error getting message by admin one ID emoji"));
            }
        });
    }, 


    AddInverseChat: (receiver, sender) => {
        return new Promise(async (resolve, reject) => {
            try {
                const chatCollection = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK);
                const time_stamp = new Date();

                // Find if there's an entry with Sender_Id same as sender parameter
                const existingEntry = await chatCollection.findOne({ Sender_Id: sender });
    
                if (existingEntry) {
                    // Check if there's an array named inverse_chat
                    if (!existingEntry.inverse_chat) {
                        existingEntry.inverse_chat = []; // Create inverse_chat array if not present
                    }
    
                    // Check if there's an entry with Reciever_Id same as receiver
                    const existingReceiverEntry = existingEntry.inverse_chat.find(entry => entry.Reciever_Id === receiver);
    
                    if (existingReceiverEntry) {
                        existingReceiverEntry.count += 1; // Increment count if entry exists
                        existingReceiverEntry.time_stamp = time_stamp;
                    } else {
                        // Create a new entry with Reciever_Id and set count value to 1
                        existingEntry.inverse_chat.push({ Reciever_Id: receiver, count: 1,time_stamp: time_stamp });
                    }
    
                    // Update the existing entry in the database
                    await chatCollection.updateOne({ Sender_Id: sender }, { $set: existingEntry });
                } else {
                    // Create a new entry if Sender_Id not present
                    const newEntry = {
                        Sender_Id: sender,
                        inverse_chat: [{ Reciever_Id: receiver, count: 1,time_stamp: time_stamp }]
                    };
                    await chatCollection.insertOne(newEntry);
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    


    getMessageTimeInterval: (receiver, sender) => {
        return new Promise(async (resolve, reject) => {
            try {
                const chatCollection = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK);
        
                // Find if there's an entry with Sender_Id same as sender parameter
                const existingEntry = await chatCollection.findOne({ Sender_Id: sender });
        
                if (existingEntry && existingEntry.inverse_chat) {
                    // Find the chat with the matching Reciever_Id
                    const chat = existingEntry.inverse_chat.find(chat => chat.Reciever_Id === receiver);
                    
                    if (chat && chat.time_stamp) {
                        // Resolve with the time_stamp
                        resolve(chat.time_stamp);
                    } else {
                        // Resolve null if no matching Reciever_Id or time_stamp is found
                        resolve(null);
                    }
                } else {
                    // Resolve null if no existingEntry or inverse_chat is found
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },     


    AddInverseChatAdmin: (receiver, sender) => {
        return new Promise(async (resolve, reject) => {
            try {
                const chatCollection = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK_ADMIN);
                const time_stamp = new Date();

                // Find if there's an entry with Sender_Id same as sender parameter
                const existingEntry = await chatCollection.findOne({ Sender_Id: sender });
    
                if (existingEntry) {
                    // Check if there's an array named inverse_chat
                    if (!existingEntry.inverse_chat) {
                        existingEntry.inverse_chat = []; // Create inverse_chat array if not present
                    }
    
                    // Check if there's an entry with Reciever_Id same as receiver
                    const existingReceiverEntry = existingEntry.inverse_chat.find(entry => entry.Reciever_Id === receiver);
    
                    if (existingReceiverEntry) {
                        existingReceiverEntry.count += 1; // Increment count if entry exists
                        existingReceiverEntry.time_stamp = time_stamp;
                    } else {
                        // Create a new entry with Reciever_Id and set count value to 1
                        existingEntry.inverse_chat.push({ Reciever_Id: receiver, count: 1,time_stamp: time_stamp });
                    }
    
                    // Update the existing entry in the database
                    await chatCollection.updateOne({ Sender_Id: sender }, { $set: existingEntry });
                } else {
                    // Create a new entry if Sender_Id not present
                    const newEntry = {
                        Sender_Id: sender,
                        inverse_chat: [{ Reciever_Id: receiver, count: 1,time_stamp: time_stamp }]
                    };
                    await chatCollection.insertOne(newEntry);
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },  
    
    
    AddadminMessageFlag: (Sender_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.LOG_DETAILS_COLLECTION);
                const userDoc = await userCollection.findOne({ userId: Sender_id });
                if (userDoc) {
                    if (!userDoc.hasOwnProperty('Send_Admin')) {
                        const updateResult = await userCollection.updateOne(
                            { userId: Sender_id },
                            { $set: { Send_Admin: 1 } }
                        );
                        resolve(updateResult);
                    } else {
                        resolve(userDoc);
                    }
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    Fetch_1_2_2_adminMessageFlag_8: (Sender_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.LOG_DETAILS_COLLECTION);
                const userDoc = await userCollection.findOne({ userId: Sender_id });
                if (userDoc && userDoc.hasOwnProperty('Send_Admin')) {
                    resolve(1);
                } else {
                    resolve(0);
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getAllMessage: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION)
                    .find({})
                    .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                    .skip(skip)
                    .limit(limit)
                    .toArray()
                    .then((messages) => {
                        resolve(messages);
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(new Error("Error fetching messages"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getAllMessage function"));
            }
        });
    },
    
    

    d2eighteleteMessage12: (messageId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({
                    MessageId: messageId, userId: userID
                }).then((deletedMessage) => {
                    // If the message exists, update its content and insert into DELETED_GROUP_CHAT_COLLECTION
                    if (deletedMessage) {
                        // Save ImageNames and VideoNames arrays before deleting
                        const deletedImageNames = deletedMessage.ImageNames || [];
                        const deletedVideoNames = deletedMessage.VideoNames || [];
                        var formattedTimestamp = new Date().toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    
                        const updatedMessage = {
                            $set: {
                                messageContent: "This message was deleted",
                                deleteStatus: "deletedMessage",
                                ImageNames: [],
                                VideoNames: [],
                                deleted_time: new Date(),
                                formattedDeletedTime: formattedTimestamp
                            }
                        };
    
                        // Update the message in GROUP_CHAT_COLLECTION
                        db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({
                            MessageId: messageId
                        }, updatedMessage).then(() => {
                            // Insert the deleted message into DELETED_GROUP_CHAT_COLLECTION
                            deletedMessage.deletedtime = new Date();
                            deletedMessage.formatteddeletedtime = formattedTimestamp;
                            db.getDb().collection(collection.DELETED_GROUP_CHAT_COLLECTION).insertOne(deletedMessage).then(() => {
                                // Add the deleted ImageNames and VideoNames arrays to DELETED_GROUP_CHAT_COLLECTION
                                deletedMessage.ImageNames = deletedImageNames;
                                deletedMessage.VideoNames = deletedVideoNames;
    
                                resolve({ deleteMessage: true });
                            }).catch((error) => {
                                console.error(error);
                                reject(new Error("Error inserting into DELETED_GROUP_CHAT_COLLECTION"));
                            });
                        }).catch((error) => {
                            console.error(error);
                            reject(new Error("Error updating message in GROUP_CHAT_COLLECTION"));
                        });
                    } else {
                        resolve({ deleteMessage: false, message: "Message not found" });
                    }
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding message in GROUP_CHAT_COLLECTION"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in deleteMessage function"));
            }
        });
    },
    

    addRemoveReaction: (messageId, emoji, user_id, user_Name) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({
                    MessageId: messageId
                }).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                        return;
                    }
    
                    // Initialize reactions array if not present
                    if (!message.reactions) {
                        message.reactions = [];
                    }
    
                    // Check if the user already reacted
                    const reactionIndex = message.reactions.findIndex(r => r.user_id === user_id);
                    if (reactionIndex > -1) {
                        // If user has already reacted
                        if (message.reactions[reactionIndex].emoji === emoji) {
                            // If the emoji is the same, remove the reaction
                            message.reactions.splice(reactionIndex, 1);
                        } else {
                            // If the emoji is different, update the emoji
                            message.reactions[reactionIndex].emoji = emoji;
                        }
                    } else {
                        // If user has not reacted, add the reaction
                        message.reactions.push({ emoji: emoji, user_id: user_id, user_Name: user_Name });
                    }
    
                    // Update the message with the new reactions array
                    db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne(
                        { MessageId: messageId },
                        { $set: { reactions: message.reactions } }
                    ).then(() => {
                        resolve({ addedReaction: true });
                    }).catch((error) => {
                        console.error(error);
                        reject(new Error("Error updating message reactions"));
                    });
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding message"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in addRemoveReaction function"));
            }
        });
    },
         

    getMessageById: (messageId, user_iD) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({ MessageId: messageId, userId :  user_iD}).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                    } else {
                        resolve(message);
                    }
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding message"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getMessageById function"));
            }
        });
    },
         

    getMessageByIdText: (messageId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({ MessageId: messageId ,userId: userID}).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                    } else {
                        let result = {
                            has_message: false
                        }
                        if (message.messageContent && message.messageContent !== '' && message.messageContent !== null) {
                            result.has_message = true;
                        }
                        resolve(result);
                    }
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding message"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getMessageByIdText function"));
            }
        });
    },
        

    getMessageByIdEmoji: (messageId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({ MessageId: messageId})
                    .then((message) => {
                        if (!message) {
                            reject(new Error("Message not found"));
                        } else {
                            let result = {
                                reactions: [],
                            };

                            if (message.reactions && message.reactions.length > 0) {
                                result.reactions = message.reactions;
                            }
                        
                            resolve(result);
                        }                
                    })
                    .catch((error) => {
                        console.error(error);
                        reject(new Error("Error finding message"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getMessageByIdEmoji function"));
            }
        });
    },
      

    addPin: (messageId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const groupUniqueCollection = db.getDb().collection(collection.GROUP_UNIQUE_COLLECTION);
                const groupChatCollection = db.getDb().collection(collection.GROUP_CHAT_COLLECTION);
    
                const groupUnique = await groupUniqueCollection.findOne();
    
                if (!groupUnique || !groupUnique.pin_message) {
                    // pin_message not found, insert messageId as pin_message
                    await groupUniqueCollection.updateOne({}, { $set: { pin_message: messageId } }, { upsert: true });
    
                    // Now find the entry in GROUP_CHAT_COLLECTION and set pinStatus to true
                    await groupChatCollection.updateOne(
                        { MessageId: messageId },
                        { $set: { pinStatus: true } }
                    );
                    resolve({ addedPin: true });
                } else {
                    // pin_message already present, fetch its value
                    const previousPinMessageId = groupUnique.pin_message;
    
                    // Find the entry in GROUP_CHAT_COLLECTION with previous pin_message ID
                    const prevMessage = await groupChatCollection.findOne({ MessageId: previousPinMessageId });
    
                    if (prevMessage && prevMessage.pinStatus) {
                        // Remove pinStatus field if it exists
                        await groupChatCollection.updateOne(
                            { MessageId: previousPinMessageId },
                            { $unset: { pinStatus: "" } }
                        );
    
                        // Find the entry with the new messageId and set pinStatus to true if it does not exist
                        const newMessage = await groupChatCollection.findOne({ MessageId: messageId });
                        if (newMessage && !newMessage.pinStatus) {
                            await groupChatCollection.updateOne(
                                { MessageId: messageId },
                                { $set: { pinStatus: true } }
                            );
    
                            // Update pin_message in GROUP_UNIQUE_COLLECTION
                            await groupUniqueCollection.updateOne({}, { $set: { pin_message: messageId } });
                            resolve({ addedPin: true });
                        } else {
                            resolve({ addedPin: true });
                        }
                    } else {
                        // If previous pinMessage is not found or pinStatus does not exist, directly set the new pin
                        const newMessage = await groupChatCollection.findOne({ MessageId: messageId });
                        if (newMessage && !newMessage.pinStatus) {
                            await groupChatCollection.updateOne(
                                { MessageId: messageId },
                                { $set: { pinStatus: true } }
                            );
    
                            // Update pin_message in GROUP_UNIQUE_COLLECTION
                            await groupUniqueCollection.updateOne({}, { $set: { pin_message: messageId } });
                            resolve({ addedPin: true });
                        } else {
                            resolve({ addedPin: true });
                        }
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    removePin: (messageId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const groupUniqueCollection = db.getDb().collection(collection.GROUP_UNIQUE_COLLECTION);
                const groupChatCollection = db.getDb().collection(collection.GROUP_CHAT_COLLECTION);
    
                // Step 1: Check if messageId matches pin_message in GROUP_UNIQUE_COLLECTION
                const pinMessageDoc = await groupUniqueCollection.findOne({});
    
                if (pinMessageDoc && pinMessageDoc.pin_message === messageId) {
                    // Step 2: Remove pin_message field from GROUP_UNIQUE_COLLECTION
                    await groupUniqueCollection.updateOne({}, { $unset: { pin_message: '' } });
                } else {
                    // If messageId does not match pin_message, do nothing
                    resolve({ removedPin: false });
                    return;
                }
    
                // Step 3: Find document in GROUP_CHAT_COLLECTION with matching MessageId
                const chatMessageDoc = await groupChatCollection.findOne({ MessageId: messageId });
    
                if (chatMessageDoc) {
                    // Step 4: Check and remove pinStatus field if present
                    if (chatMessageDoc.pinStatus) {
                        await groupChatCollection.updateOne(
                            { MessageId: messageId },
                            { $unset: { pinStatus: '' } }
                        );
                    }
                }
    
                // Successfully removed pin
                resolve({ removedPin: true });
            } catch (error) {
                reject(error);
            }
        });
    },


    initializePOLLInGroup: (pollbody, userid, userName) => {
        console.log("INITIALIZED POLL IN GROUP")
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION; // POLL -INITIALIZE POLL
                
                const timestamp = new Date();
                const formattedTimestamp = timestamp.toLocaleTimeString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
            });

    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group) {
                            // Entry exists in GROUP_UNIQUE_COLLECTION
                            const pollUpdate = {
                                poll: {
                                    caption: pollbody.caption,
                                    options: Object.keys(pollbody)
                                            .filter(key => key.startsWith('option') && pollbody[key].trim() !== '')
                                            .map(key => pollbody[key]),
                                    polledUser: userid,
                                    polledUserName: userName,
                                    polledTime: timestamp,
                                    readable_poll_time: formattedTimestamp,
                                    Poll_Id: pollbody.Poll_Id
                                }
                            };
    
                            dbInstance.collection(collectionName).updateOne(
                                {},  // Assuming there’s only one document, match it with an empty filter
                                { $set: pollUpdate }
                            )
                            .then(result => {
                                console.log("Poll updated successfully");
                                resolve(result);
                            })
                            .catch(error => {
                                console.error("Error updating poll:", error);
                                reject(new Error("Error updating poll"));
                            });
    
                        } else {
                            // No entry found, create a new one
                            const newGroup = {
                                poll: {
                                    caption: pollbody.caption,
                                    options: Object.keys(pollbody)
                                                .filter(key => key.startsWith('option') && pollbody[key].trim() !== '')
                                                .map(key => pollbody[key]),
                                    polledUser: userid,
                                    polledUserName: userName,
                                    polledTime: timestamp,
                                    readable_poll_time: formattedTimestamp,
                                    Poll_Id: pollbody.Poll_Id
                                }
                            };
    
                            dbInstance.collection(collectionName).insertOne(newGroup)
                            .then(result => {
                                console.log("Poll initialized successfully in new group entry");
                                resolve(result);
                            })
                            .catch(error => {
                                console.error("Error initializing poll in new group entry:", error);
                                reject(new Error("Error initializing poll in new group entry"));
                            });
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching group entry:", error);
                        reject(new Error("Error InitializingPoll"));
                    });
            } catch (error) {
                console.error("Error in initializing poll function:", error);
                reject(new Error("Error in initializing poll function"));
            }
        });
    }, 
    
    
    checkThirtyDayPollInitiationPolicy: () => {
        console.log("ENTERED IN 30 DAY POLL CHECK......")
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION; // POLL -CHECK 30
                const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
                const currentTime = new Date();
                
                // Find the document in GROUP_UNIQUE_COLLECTION
                dbInstance.collection(collectionName).findOne()
                    .then(group => {
                        if (group && group.poll) {
                            // Check if the polledTime is older than 30 days
                            const pollTime = new Date(group.poll.polledTime);
                            if (currentTime - pollTime > thirtyDaysInMilliseconds) {
                                // Remove the poll field if older than 30 days
                                dbInstance.collection(collectionName).updateOne(
                                    { _id: group._id }, // Match the document by its _id
                                    { $unset: { poll: "" } } // Remove the poll field
                                )
                                .then(() => {
                                    console.log("Poll document removed successfully.");
                                    resolve("Poll document removed successfully.");
                                })
                                .catch(error => {
                                    console.error("Error removing poll document:", error);
                                    reject(new Error("Error removing poll document"));
                                });
                            } else {
                                resolve("Poll document is not older than 30 days.");
                            }
                        } else {
                            resolve("No poll document found.");
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching document:", error);
                        reject(new Error("Error fetching document"));
                    });
            } catch (error) {
                console.error("Error in checking poll time in 30 days:", error);
                reject(new Error("Error in checking poll time in 30 days"));
            }
        });
    },    
    
    
    deletePoll: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION; // POLL- DELETE POLL
                const groupUniqueCollection = dbInstance.collection(collectionName);
                
                let deletedPoll = false; // Initialize the variable to track deletion status
    
                // Check if there is an entry in GROUP_UNIQUE_COLLECTION
                const groupEntry = await groupUniqueCollection.findOne({});
    
                if (groupEntry && groupEntry.poll) {
                    // If poll document is present, remove it
                    const updateResult = await groupUniqueCollection.updateOne(
                        { _id: groupEntry._id },
                        { $unset: { poll: "" } }
                    );
    
                    if (updateResult.modifiedCount > 0) {
                        deletedPoll = true; // Set deletedPoll to true if deletion was successful
                    }
                }
    
                resolve(deletedPoll); // Resolve the promise with the deletedPoll status
    
            } catch (error) {
                console.error("Error in deleting poll function:", error);
                reject(new Error("Error in deleting poll function"));
            }
        });
    },    
    
    
    submitPoll: (value, user, userName) => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION; // POLL - SUBMIT POLL
    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group && group.poll) {
                            const poll = group.poll;
    
                            // Initialize pollresults and pollresultsForUser if not present
                            let pollResults = poll.pollresults || {};
                            let pollResultsForUser = poll.pollresultsForUser || [];
    
                            // Update pollResults (by value)
                            if (!pollResults[value]) {
                                pollResults[value] = [{ userName, user }];
                            } else {
                                const userIndex = pollResults[value].findIndex(result => result.user === user);
                                if (userIndex !== -1) {
                                    pollResults[value].splice(userIndex, 1);
                                    if (pollResults[value].length === 0) {
                                        delete pollResults[value];
                                    }
                                } else {
                                    pollResults[value].push({ userName, user });
                                }
                            }
    
                            // Update pollResultsForUser (by user)
                            const userVoteIndex = pollResultsForUser.findIndex(result => result.user === user);
                            if (userVoteIndex !== -1) {
                                const userVotes = pollResultsForUser[userVoteIndex].values;
                                const valueIndex = userVotes.indexOf(value);
    
                                if (valueIndex !== -1) {
                                    userVotes.splice(valueIndex, 1);
                                    if (userVotes.length === 0) {
                                        pollResultsForUser.splice(userVoteIndex, 1);
                                    }
                                } else {
                                    userVotes.push(value);
                                }
                            } else {
                                pollResultsForUser.push({ user: user, userName: userName, values: [value] });
                            }
    
                            // Update the poll in the database
                            dbInstance.collection(collectionName).updateOne(
                                { _id: group._id },
                                { $set: { "poll.pollresults": pollResults, "poll.pollresultsForUser": pollResultsForUser } }
                            )
                            .then(result => {
                                console.log("Poll result updated successfully");
                                resolve({ addedPole: true });  // Only resolve with addedPole: true
                            })
                            .catch(error => {
                                console.error("Error updating poll result:", error);
                                reject(new Error("Error updating poll result"));
                            });
    
                        } else {
                            console.error("No poll found to submit the result to");
                            reject(new Error("No poll found"));
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching group entry:", error);
                        reject(new Error("Error submitting poll"));
                    });
            } catch (error) {
                console.error("Error in submitPoll function:", error);
                reject(new Error("Error in submitPoll function"));
            }
        });
    },    
    
    
    getAllPollResult: () => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION; // POLL - GET ALL POLL RESULT
    
                dbInstance.collection(collectionName).find({ "poll.pollresults": { $exists: true, $ne: {} } })
                    .toArray()
                    .then(groups => {
                        if (groups.length > 0) {
                            const pollData = {};
    
                            groups.forEach(group => {
                                const poll = group.poll;
    
                                // Iterate over the keys (options) in poll.pollresults
                                for (const option in poll.pollresults) {
                                    if (poll.pollresults.hasOwnProperty(option)) {
                                        if (!pollData[option]) {
                                            pollData[option] = [];
                                        }
    
                                        // Aggregate user details by option
                                        poll.pollresults[option].forEach(result => {
                                            pollData[option].push({
                                                name: result.userName,
                                                userid: result.user
                                            });
                                        });
                                    }
                                }
                            });
    
                            // Convert the result object into an array format
                            const formattedResults = Object.entries(pollData).map(([option, users]) => ({
                                option,
                                users
                            }));
    
                            resolve(formattedResults); // Resolve with the formatted results
                        } else {
                            resolve([]); // No polls with results found
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching poll results:", error);
                        reject(new Error("Error fetching poll results"));
                    });
            } catch (error) {
                console.error("Error in getting poll function:", error);
                reject(new Error("Error in getting poll function"));
            }
        });
    },    


    getPollInformation: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION;  // POLL -GET POLL INFORMATION
    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group && group.poll) {
                            // Extract only the necessary fields from the poll object
                            const { caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName, pollresultsForUser } = group.poll;
    
                            let userValues = [];
    
                            if (pollresultsForUser && Array.isArray(pollresultsForUser)) {
                                const userPoll = pollresultsForUser.find(result => result.user === userId);
                                if (userPoll) {
                                    userValues = userPoll.values || [];
                                }
                            }
    
                            resolve({ caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName, values: userValues });
                        } else {
                            resolve(null);  // No poll found or no entry in the collection
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching poll data:", error);
                        reject(new Error("Error fetching poll data"));
                    });
            } catch (error) {
                console.error("Error in getting poll function:", error);
                reject(new Error("Error in getting poll function"));
            }
        });
    },      


    GetPinnedMessage: () => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_UNIQUE_COLLECTION).findOne()
                    .then((message) => {
                        if (message && message.pin_message) {
                            resolve(message.pin_message);
                        } else {
                            resolve(0);
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        reject(new Error("Error finding pinned message"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in GetPinnedMessage function"));
            }
        });
    },
           

    deleteOneMessage: (messageId, Sender_Id, Reciever_Id) => {
        return new Promise((resolve, reject) => {
            try {
                // Find the entry in ONE_ON_ONE_CHAT_COLLECTION with Sender_Id
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne({
                    Sender_Id: Sender_Id
                }).then((senderData) => {
                    if (senderData && senderData[Sender_Id] && senderData[Sender_Id][Reciever_Id]) {
                        // Find the array with Reciever_Id
                        const messagesArray = senderData[Sender_Id][Reciever_Id];
                        const deletedMessageIndex = messagesArray.findIndex(msg => msg.MessageId === messageId);
    
                        if (deletedMessageIndex !== -1) {
                            const deletedMessage = messagesArray[deletedMessageIndex];
                            const deletedImageNames = deletedMessage.ImageNames || [];
                            const deletedVideoNames = deletedMessage.VideoNames || [];
    
                            // Add deleted_time to the deletedMessage
                            const timestamp = new Date();
                            const formattedTimestamp = timestamp.toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric'
                            });
    
                            deletedMessage.deleted_time = formattedTimestamp;
    
                            // Copy the deleted message to DELETED_ONE_ON_ONE_CHAT_COLLECTION
                            const filter = {
                                Sender_Id: Sender_Id,
                                [Sender_Id]: { $exists: true },
                                [Sender_Id + '.' + Reciever_Id]: { $exists: true }
                            };
    
                            const update = {
                                $push: { [Sender_Id + '.' + Reciever_Id]: deletedMessage }
                            };
    
                            db.getDb().collection(collection.DELETED_ONE_ON_ONE_CHAT_COLLECTION).updateOne(filter, update, { upsert: true }).then(() => {
                                // Update the message in ONE_ON_ONE_CHAT_COLLECTION
                                const updatedMessage = {
                                    $set: {
                                        [Sender_Id + '.' + Reciever_Id + '.' + deletedMessageIndex + '.messageContent']: "This message was deleted",
                                        [Sender_Id + '.' + Reciever_Id + '.' + deletedMessageIndex + '.deleteStatus']: "deletedMessage",
                                        [Sender_Id + '.' + Reciever_Id + '.' + deletedMessageIndex + '.deleted_time']: formattedTimestamp,
                                        [Sender_Id + '.' + Reciever_Id + '.' + deletedMessageIndex + '.ImageNames']: [],
                                        [Sender_Id + '.' + Reciever_Id + '.' + deletedMessageIndex + '.VideoNames']: []
                                    }
                                };
    
                                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).updateOne({
                                    Sender_Id: Sender_Id
                                }, updatedMessage).then(() => {
                                    resolve({ deleteMessage: true });
                                }).catch((error) => {
                                    reject(error);
                                });
                            }).catch((error) => {
                                reject(error);
                            });
                        } else {
                            resolve({ deleteMessage: false});
                        }
                    } else {
                        resolve({ deleteMessage: false});
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    
        

    addPostGroup: (postData, timestamp, status, userId, Name, formattedTime) => {
        return new Promise(async (resolve, reject) => {
            try {
                const currentTime = new Date(); // Get the current time
    
                // Create the post document
                const postDocument = {
                    ...postData,
                    timestamp: timestamp,
                    status: status,
                    userId: userId,
                    Name: Name,
                    formattedTime: formattedTime
                };
    
                // Insert the post into the GROUP_CHAT_COLLECTION
                const insertPost = db.getDb().collection(collection.GROUP_CHAT_COLLECTION).insertOne(postDocument);
    
                // Check if an entry exists in GROUP_UNIQUE_COLLECTION and update or insert the current time
                const findAndUpdateOrInsertTime = db.getDb().collection(collection.GROUP_UNIQUE_COLLECTION).findOneAndUpdate(
                    {}, // Filter condition, adjust if you have specific criteria
                    { $set: { initial_time: currentTime } }, // Update the initial_time with current time
                    { upsert: true, returnOriginal: false } // Upsert: insert if not found; return the new document
                );
    
                // Wait for both operations to complete
                const [result] = await Promise.all([insertPost, findAndUpdateOrInsertTime]);
    
                // Resolve with the ID of the inserted post
                const insertedPostId = result.insertedId;
                resolve(insertedPostId);
    
            } catch (error) {
                console.error(error);
                reject(new Error("Error adding post to group"));
            }
        });
    },    


    addPostGroupImages: (postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({ MessageId: postId }, {
                    $set: {
                        ImageNames: postNames
                    }
                }).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    
    addPostGroupVideos: (postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({ MessageId: postId }, {
                    $set: {
                        VideoNames: postNames
                    }
                }).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    addPostOne: async (postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id) => {
        try {
            const postDocument = {
                ...postData,
                timestamp,
                status,
                Sender_name
            };
    
            const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION);
    
            // Check if the Sender_Id exists in ONE_ON_ONE_CHAT_COLLECTION
            const senderChat = await oneOnOneChatCollection.findOne({ Sender_Id });
    
            // If not present, create a storage space for Sender_Id
            if (!senderChat) {
                await oneOnOneChatCollection.insertOne({ Sender_Id, [Sender_Id]: {} });
            }
    
            // Retrieve the sender's chat document
            const senderChatDocument = await oneOnOneChatCollection.findOne({ Sender_Id });
    
            // Check if Reciever_Id exists in the sender's chats
            if (!senderChatDocument[Sender_Id][Reciever_Id]) {
                senderChatDocument[Sender_Id][Reciever_Id] = [];
            }
    
            // Add the post details to the sender's document
            senderChatDocument[Sender_Id][Reciever_Id].push(postDocument);
    
            // Update the sender's document in the ONE_ON_ONE_CHAT_COLLECTION
            await oneOnOneChatCollection.updateOne({ Sender_Id }, { $set: { [Sender_Id]: senderChatDocument[Sender_Id] } });
    
        } catch (error) {
            console.error(error);
            throw new Error("Error adding post");
        }
    },
    

    addPostOneAdmin: async (postData, timestamp, status, Sender_name, Sender_Id, Reciever_Id) => {
        try {
            const postDocument = {
                ...postData,
                timestamp,
                status,
                Sender_name
            };
    
            const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN);
    
            // Check if the Sender_Id exists in ONE_ON_ONE_CHAT_COLLECTION
            const senderChat = await oneOnOneChatCollection.findOne({ Sender_Id });
    
            // If not present, create a storage space for Sender_Id
            if (!senderChat) {
                await oneOnOneChatCollection.insertOne({ Sender_Id, [Sender_Id]: {} });
            }
    
            // Retrieve the sender's chat document
            const senderChatDocument = await oneOnOneChatCollection.findOne({ Sender_Id });
    
            // Check if Reciever_Id exists in the sender's chats
            if (!senderChatDocument[Sender_Id][Reciever_Id]) {
                senderChatDocument[Sender_Id][Reciever_Id] = [];
            }
    
            // Add the post details to the sender's document
            senderChatDocument[Sender_Id][Reciever_Id].push(postDocument);
    
            // Update the sender's document in the ONE_ON_ONE_CHAT_COLLECTION
            await oneOnOneChatCollection.updateOne({ Sender_Id }, { $set: { [Sender_Id]: senderChatDocument[Sender_Id] } });
    
        } catch (error) {
            console.error(error);
            throw new Error("Error adding post");
        }
    },
    

    addPostOneImages: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION);
    
                userCollection.findOne({ Sender_Id: Sender_Id })
                    .then((user) => {
                        // Check if user exists, if not, create a new user entry
                        if (!user) {
                            user = {
                                Sender_Id: Sender_Id,
                            };
                        }
    
                        // Check if storage space exists, create if not
                        if (!user[Sender_Id]) {
                            user[Sender_Id] = {};
                        }
    
                        const storageSpace = user[Sender_Id];
    
                        // Check if array with Reciever_Id exists in storage space, create if not
                        if (!storageSpace[Reciever_Id]) {
                            storageSpace[Reciever_Id] = [];
                        }
    
                        const chatArray = storageSpace[Reciever_Id];
                        const existingPostIndex = chatArray.findIndex(entry => entry.MessageId === postId);
    
                        if (existingPostIndex !== -1) {
                            // Update existing entry
                            const existingEntry = chatArray[existingPostIndex];
                            
                            // Create ImageNames array if it doesn't exist
                            if (!existingEntry.ImageNames) {
                                existingEntry.ImageNames = [];
                            }
    
                            // Concatenate postNames to existing ImageNames
                            existingEntry.ImageNames = existingEntry.ImageNames.concat(postNames);
                        } else {
                            // Create new entry
                            const newEntry = {
                                MessageId: postId,
                                Reciever_Id: Reciever_Id,
                                ImageNames: postNames,
                                // Include other required fields
                            };
    
                            chatArray.push(newEntry);
                        }
    
                        // Update the user document
                        return userCollection.updateOne({ Sender_Id: Sender_Id }, {
                            $set: {
                                [Sender_Id]: storageSpace
                            }
                        });
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    addPostOneImagesAdmin: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN);
    
                userCollection.findOne({ Sender_Id: Sender_Id })
                    .then((user) => {
                        // Check if user exists, if not, create a new user entry
                        if (!user) {
                            user = {
                                Sender_Id: Sender_Id,
                            };
                        }
    
                        // Check if storage space exists, create if not
                        if (!user[Sender_Id]) {
                            user[Sender_Id] = {};
                        }
    
                        const storageSpace = user[Sender_Id];
    
                        // Check if array with Reciever_Id exists in storage space, create if not
                        if (!storageSpace[Reciever_Id]) {
                            storageSpace[Reciever_Id] = [];
                        }
    
                        const chatArray = storageSpace[Reciever_Id];
                        const existingPostIndex = chatArray.findIndex(entry => entry.MessageId === postId);
    
                        if (existingPostIndex !== -1) {
                            // Update existing entry
                            const existingEntry = chatArray[existingPostIndex];
                            
                            // Create ImageNames array if it doesn't exist
                            if (!existingEntry.ImageNames) {
                                existingEntry.ImageNames = [];
                            }
    
                            // Concatenate postNames to existing ImageNames
                            existingEntry.ImageNames = existingEntry.ImageNames.concat(postNames);
                        } else {
                            // Create new entry
                            const newEntry = {
                                MessageId: postId,
                                Reciever_Id: Reciever_Id,
                                ImageNames: postNames,
                                // Include other required fields
                            };
    
                            chatArray.push(newEntry);
                        }
    
                        // Update the user document
                        return userCollection.updateOne({ Sender_Id: Sender_Id }, {
                            $set: {
                                [Sender_Id]: storageSpace
                            }
                        });
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    
        
    addPostOneVideos: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION);
    
                userCollection.findOne({ Sender_Id: Sender_Id })
                    .then((user) => {
                        // Check if user exists, if not, create a new user entry
                        if (!user) {
                            user = {
                                Sender_Id: Sender_Id,
                            };
                        }
    
                        // Check if storage space exists, create if not
                        if (!user[Sender_Id]) {
                            user[Sender_Id] = {};
                        }
    
                        const storageSpace = user[Sender_Id];
    
                        // Check if array with Reciever_Id exists in storage space, create if not
                        if (!storageSpace[Reciever_Id]) {
                            storageSpace[Reciever_Id] = [];
                        }
    
                        const chatArray = storageSpace[Reciever_Id];
                        const existingPostIndex = chatArray.findIndex(entry => entry.MessageId === postId);
    
                        if (existingPostIndex !== -1) {
                            // Update existing entry
                            const existingEntry = chatArray[existingPostIndex];
    
                            // Create VideoNames array if it doesn't exist
                            if (!existingEntry.VideoNames) {
                                existingEntry.VideoNames = [];
                            }
    
                            // Concatenate postNames to existing VideoNames
                            existingEntry.VideoNames = existingEntry.VideoNames.concat(postNames);
                        } else {
                            // Create new entry
                            const newEntry = {
                                MessageId: postId,
                                Reciever_Id: Reciever_Id,
                                VideoNames: postNames,
                                // Include other required fields
                            };
    
                            chatArray.push(newEntry);
                        }
    
                        // Update the user document
                        return userCollection.updateOne({ Sender_Id: Sender_Id }, {
                            $set: {
                                [Sender_Id]: storageSpace
                            }
                        });
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
        

    addPostOneVideosAdmin: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN);
    
                userCollection.findOne({ Sender_Id: Sender_Id })
                    .then((user) => {
                        // Check if user exists, if not, create a new user entry
                        if (!user) {
                            user = {
                                Sender_Id: Sender_Id,
                            };
                        }
    
                        // Check if storage space exists, create if not
                        if (!user[Sender_Id]) {
                            user[Sender_Id] = {};
                        }
    
                        const storageSpace = user[Sender_Id];
    
                        // Check if array with Reciever_Id exists in storage space, create if not
                        if (!storageSpace[Reciever_Id]) {
                            storageSpace[Reciever_Id] = [];
                        }
    
                        const chatArray = storageSpace[Reciever_Id];
                        const existingPostIndex = chatArray.findIndex(entry => entry.MessageId === postId);
    
                        if (existingPostIndex !== -1) {
                            // Update existing entry
                            const existingEntry = chatArray[existingPostIndex];
    
                            // Create VideoNames array if it doesn't exist
                            if (!existingEntry.VideoNames) {
                                existingEntry.VideoNames = [];
                            }
    
                            // Concatenate postNames to existing VideoNames
                            existingEntry.VideoNames = existingEntry.VideoNames.concat(postNames);
                        } else {
                            // Create new entry
                            const newEntry = {
                                MessageId: postId,
                                Reciever_Id: Reciever_Id,
                                VideoNames: postNames,
                                // Include other required fields
                            };
    
                            chatArray.push(newEntry);
                        }
    
                        // Update the user document
                        return userCollection.updateOne({ Sender_Id: Sender_Id }, {
                            $set: {
                                [Sender_Id]: storageSpace
                            }
                        });
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
        

    oneONoneCHAT: (Sender_Id, Reciever_Id) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": Sender_Id,
                    [`${Sender_Id}.${Reciever_Id}`]: { $exists: true }
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne(query)
                    .then((result) => {
                        if (result) {
                            const messages = result[Sender_Id][Reciever_Id] || [];
                            resolve(messages);
                        } else {
                            resolve([]);
                        }
                    })
                    .catch((err) => {
                        if (err.message === "User not found in ONE_ON_ONE_CHAT_COLLECTION") {
                            // Handle the case when the document is not found
                            resolve([]);
                        } else {
                            console.error(err);
                            reject(err);
                        }
                    });
            } catch (error) {
                reject(error);
            }
        });
    },


    /*oneONoneCHAT: (Sender_Id, Reciever_Id, skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": Sender_Id,
                    [`${Sender_Id}.${Reciever_Id}`]: { $exists: true }
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION)
                    .findOne(query)
                    .then((result) => {
                        if (result) {
                            const messages = result[Sender_Id][Reciever_Id] || [];
    
                            // Sort the messages array by timestamp in descending order
                            messages.sort((a, b) => b.timestamp - a.timestamp);
    
                            // Apply skip and limit
                            const limitedMessages = messages.slice(skip, skip + limit);
    
                            resolve(limitedMessages);
                        } else {
                            resolve([]);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(new Error("Error fetching messages"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in oneONoneCHAT function"));
            }
        });
    }, */
    

    getMessageByOneTwoId: (messageId, user_iD, recieverId) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": user_iD
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne(query)
                    .then((result) => {
                        if (result) {
                            const userMessages = result[user_iD];
                            if (userMessages && userMessages[recieverId]) {
                                const messagesArray = userMessages[recieverId];
                                const message = messagesArray.find(msg => msg.MessageId === messageId);
                                if (message) {
                                    resolve(message);
                                } else {
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
       

    getMessageByOneIdText: (messageId, user_iD, recieverId) => {
        console.log("GET MESSAGE CALLED");
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": user_iD
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne(query)
                    .then((result) => {
                        if (result) {
                            const userMessages = result[user_iD];
                            if (userMessages && userMessages[recieverId]) {
                                const messagesArray = userMessages[recieverId];
                                const message = messagesArray.find(msg => msg.MessageId === messageId);
                                if (message) {
                                    let result = {
                                        has_message: false
                                    }
                                    if (message.messageContent && message.messageContent !== '' && message.messageContent !== null) {
                                        result.has_message = true;
                                    }
                                    resolve(result);
                                } else {
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
     

    getMessageByOneIdEmoji: (messageId, user_iD, recieverId) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": user_iD
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne(query)
                    .then((result) => {
                        if (result) {
                            const userMessages = result[user_iD];
                            if (userMessages && userMessages[recieverId]) {
                                const messagesArray = userMessages[recieverId];
                                const message = messagesArray.find(msg => msg.MessageId === messageId);
                                if (message) {
                                    let result = {
                                        MessageId: message.MessageId,
                                        emoji: message.emoji,
                                    };
                                    resolve(result);
                                } else {
                                    resolve(null);
                                }
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },    


    oneONoneCHATAdmin: (Sender_Id, Reciever_Id) => {
        return new Promise((resolve, reject) => {
            try {
                const query = {
                    "Sender_Id": Sender_Id,
                    [`${Sender_Id}.${Reciever_Id}`]: { $exists: true }
                };
    
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne(query)
                    .then((result) => {
                        if (result) {
                            const messages = result[Sender_Id][Reciever_Id] || [];
                            resolve(messages);
                        } else {
                            resolve([]);
                        }
                    })
                    .catch((err) => {
                        if (err.message === "User not found in ONE_ON_ONE_CHAT_COLLECTION_ADMIN") {
                            // Handle the case when the document is not found
                            resolve([]);
                        } else {
                            console.error(err);
                            reject(err);
                        }
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
        
    
    GetAllAdminBroadcastMessage: (skip, limit) => {
        return new Promise(async (resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL)
                .find({})
                .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                .skip(skip)
                .limit(limit)
                .toArray()
                .then((broadcastMessages) => {
                    resolve(broadcastMessages);
                })
                .catch((err) => {
                    console.error(err);
                    reject(new Error("Error fetching messages"));
                });
            } catch (error) {
                console.error(error);
                reject("Error fetching broadcast message details");
            }
        });
    },


    getAllCountOfCurrentAdminBroad: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const broadCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
                const totalEntries = await broadCollection.countDocuments();

                resolve(totalEntries);
            } catch (error) {
                reject(error);
            }
        });
    },


    getExistingBroadcastCount: (userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const broadCollection = db.getDb().collection(collection.ADMIN_CHAT_ENTRY_HISTORY);
                const entry = await broadCollection.findOne({ Sender_Id: userID });
    
                if (entry) {
                    resolve(entry.LeavedCount);
                } else {
                    resolve(null);  // or resolve(0) if you prefer to return 0 when no matching document is found
                }
            } catch (error) {
                reject(error);
            }
        });
    },    


    addRemoveAdminBroadcastReaction: (messageId, emoji, user_id, user_Name) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({
                    MessageId: messageId
                }).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                        return;
                    }
                    // Initialize reactions array if not present
                    if (!message.reactions) {
                        message.reactions = [];
                    }
                    // Check if the user already reacted
                    const reactionIndex = message.reactions.findIndex(r => r.user_id === user_id);
                    if (reactionIndex > -1) {
                        // If user has already reacted
                        if (message.reactions[reactionIndex].emoji === emoji) {
                            // If the emoji is the same, remove the reaction
                            message.reactions.splice(reactionIndex, 1);
                        } else {
                            // If the emoji is different, update the emoji
                            message.reactions[reactionIndex].emoji = emoji;
                        }
                    } else {
                        // If user has not reacted, add the reaction
                        message.reactions.push({ emoji: emoji, user_id: user_id, user_Name: user_Name });
                    }
                    // Update the message with the new reactions array
                    db.getDb().collection(collection.ADMIN_BROADCAST_ALL).updateOne(
                        { MessageId: messageId },
                        { $set: { reactions: message.reactions } }
                    ).then(() => {
                        resolve({ addedReaction: true });
                    }).catch((error) => {
                        reject(error);
                    });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    GetPinnedAdminO_n_eT_w_oT_wo_E_i_g_htBroadMessage: () => {
        console.log("GET MESSAGE CALLED");
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_UNIQUE_COLLECTION).findOne()
                    .then((message) => {
                        if (message && message.pin_message) {
                            resolve(message.pin_message);
                        } else {
                            resolve(0);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getBroadPollInformation: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION;  // POLL -GET POLL INFORMATION
    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group && group.poll) {
                            // Extract only the necessary fields from the poll object
                            const { caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName, pollresultsForUser } = group.poll;
    
                            let userValues = [];
    
                            if (pollresultsForUser && Array.isArray(pollresultsForUser)) {
                                const userPoll = pollresultsForUser.find(result => result.user === userId);
                                if (userPoll) {
                                    userValues = userPoll.values || [];
                                }
                            }
    
                            resolve({ caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName, values: userValues });
                        } else {
                            resolve(null);  // No poll found or no entry in the collection
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching poll data:", error);
                        reject(new Error("Error fetching poll data"));
                    });
            } catch (error) {
                console.error("Error in getting poll function:", error);
                reject(new Error("Error in getting poll function"));
            }
        });
    },      
        
    
    getAdminBroadMessageById: (messageId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({ MessageId: messageId }).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                    } else {
                        resolve(message);
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    getAdminBroadMessageByIdEmoji: (messageId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({ MessageId: messageId }).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                    } else {
                        let result = {
                            reactions: message.reactions
                        };
                        resolve(result);
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    submitbroadPoll: (value, user, userName) => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION;
    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group && group.poll) {
                            const poll = group.poll;
    
                            // Initialize pollresults and pollresultsForUser if not present
                            let pollResults = poll.pollresults || {};
                            let pollResultsForUser = poll.pollresultsForUser || [];
    
                            // Update pollResults (by value)
                            if (!pollResults[value]) {
                                pollResults[value] = [{ userName, user }];
                            } else {
                                const userIndex = pollResults[value].findIndex(result => result.user === user);
                                if (userIndex !== -1) {
                                    pollResults[value].splice(userIndex, 1);
                                    if (pollResults[value].length === 0) {
                                        delete pollResults[value];
                                    }
                                } else {
                                    pollResults[value].push({ userName, user });
                                }
                            }
    
                            // Update pollResultsForUser (by user)
                            const userVoteIndex = pollResultsForUser.findIndex(result => result.user === user);
                            if (userVoteIndex !== -1) {
                                const userVotes = pollResultsForUser[userVoteIndex].values;
                                const valueIndex = userVotes.indexOf(value);
    
                                if (valueIndex !== -1) {
                                    userVotes.splice(valueIndex, 1);
                                    if (userVotes.length === 0) {
                                        pollResultsForUser.splice(userVoteIndex, 1);
                                    }
                                } else {
                                    userVotes.push(value);
                                }
                            } else {
                                pollResultsForUser.push({ user: user, userName: userName, values: [value] });
                            }
    
                            // Update the poll in the database
                            dbInstance.collection(collectionName).updateOne(
                                { _id: group._id },
                                { $set: { "poll.pollresults": pollResults, "poll.pollresultsForUser": pollResultsForUser } }
                            )
                            .then(result => {
                                console.log("Poll result updated successfully");
                                resolve({ addedPole: true });  // Only resolve with addedPole: true
                            })
                            .catch(error => {
                                console.error("Error updating poll result:", error);
                                reject(new Error("Error updating poll result"));
                            });
    
                        } else {
                            console.error("No poll found to submit the result to");
                            reject(new Error("No poll found"));
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching group entry:", error);
                        reject(new Error("Error submitting poll"));
                    });
            } catch (error) {
                console.error("Error in submitPoll function:", error);
                reject(new Error("Error in submitPoll function"));
            }
        });
    },    
    
    
    getAllbroadPollResult: () => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION;
    
                dbInstance.collection(collectionName).find({ "poll.pollresults": { $exists: true, $ne: {} } })
                    .toArray()
                    .then(groups => {
                        if (groups.length > 0) {
                            const pollData = {};
    
                            groups.forEach(group => {
                                const poll = group.poll;
    
                                // Iterate over the keys (options) in poll.pollresults
                                for (const option in poll.pollresults) {
                                    if (poll.pollresults.hasOwnProperty(option)) {
                                        if (!pollData[option]) {
                                            pollData[option] = [];
                                        }
    
                                        // Aggregate user details by option
                                        poll.pollresults[option].forEach(result => {
                                            pollData[option].push({
                                                name: result.userName,
                                                userid: result.user
                                            });
                                        });
                                    }
                                }
                            });
    
                            // Convert the result object into an array format
                            const formattedResults = Object.entries(pollData).map(([option, users]) => ({
                                option,
                                users
                            }));
    
                            resolve(formattedResults); // Resolve with the formatted results
                        } else {
                            resolve([]); // No polls with results found
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching poll results:", error);
                        reject(new Error("Error fetching poll results"));
                    });
            } catch (error) {
                console.error("Error in getting poll function:", error);
                reject(new Error("Error in getting poll function"));
            }
        });
    },    
    

    addJob: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                const timeStamp = new Date();
                const userDataWithTimestamp = { ...userData, timestamp: timeStamp };
                const result = await db.getDb().collection(collection.JOB_COLLECTION).insertOne(userDataWithTimestamp);
                const insertedJobId = result.insertedId;
                resolve(insertedJobId);
            } catch (error) {
                reject(error);
            }
        });
    },


    AddJobHasImage : (jobID) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Find the job by _id and update the hasImage field to true
                await db.getDb().collection(collection.JOB_COLLECTION).updateOne(
                    { _id: new objectId(jobID) },
                    { $set: { hasImage: true } }
                );
                resolve();
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
        
    
    /*getJobDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION).find({ UserId: { $ne: userId } }).toArray()
                    .then((jobs) => {
                        resolve(jobs);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },*/   

    
    getJobDetails_with_skip_limit: (userId,skip,limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION).find({ UserId: { $ne: userId } })
                .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                .skip(skip)
                .limit(limit)
                .toArray()
                .then((jobs) => {
                    resolve(jobs);
                })
                .catch((err) => {
                    reject(err);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },   


    getAllMessage: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION)
                    .find({})
                    .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                    .skip(skip)
                    .limit(limit)
                    .toArray()
                    .then((messages) => {
                        resolve(messages);
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(new Error("Error fetching messages"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getAllMessage function"));
            }
        });
    },
    

    /*getDoc2VecJobModel: async (userId) => {
        try {
            var jobs = await db.getDb().collection(collection.JOB_COLLECTION).find({ UserId: { $ne: userId } }).toArray();
            const trainingData = [];
            jobs.forEach(jobs => {
                const jobInterests = {
                    CompanyName: jobs.CompanyName ? jobs.CompanyName : "",
                    CompanyDescription: jobs.CompanyDescription ? jobs.CompanyDescription : "",
                    jobDescription: jobs.jobDescription ? jobs.jobDescription : "",
                    Jobrole: jobs.Jobrole ? jobs.Jobrole : "",
                    Eligibility: jobs.Eligibility ? jobs.Eligibility : "",
                    Branch: jobs.Branch ? jobs.Branch : ""
                };
                trainingData.push({
                    userId: jobs._id ? jobs._id : "",
                    userName: jobs.Name ? jobs.Name : "",
                    ...jobInterests
                });
            });
            trainingData.forEach(data => {
                if (Array.isArray(data.interests)) {
                    data.interests = data.interests.flat();
                }
            });
            return trainingData; // Return trainingData directly without stringifying
        } catch (error) {
            console.error('Error processing data for fetching:', error);
            throw error; // Reject the promise with the error
        }
    }, */  


    getUserDetailsFromJobId: (jobId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let job = await db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) });
                let userData = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(job.UserId) });
                if (userData) {
                    resolve({
                        Name : userData.Name,
                    });
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getIndividualJobDetail: (jobId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let job = await db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) });
                resolve(job);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    getEditJobButtonProfile1228: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION)
                    .find({ UserId: userId })
                    .toArray()
                    .then((jobs) => {
                        resolve(jobs.length);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    


    getEditJobDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION)
                    .find({ UserId: userId })
                    .toArray()
                    .then((jobs) => {
                        resolve(jobs);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    updateJob: (jobDetails, userID) => {
        return new Promise((resolve, reject) => {
            try {
                const jobId = jobDetails.Jobid;
                db.getDb().collection(collection.JOB_COLLECTION).findOne(
                    { _id: new objectId(jobId) }
                ).then((job) => {
                    if (job && job.UserId === userID) {
                        db.getDb().collection(collection.JOB_COLLECTION).updateOne(
                            { _id: new objectId(jobId) },
                            {
                                $set: {
                                    CompanyName: jobDetails.CompanyName,
                                    CompanyDescription: jobDetails.CompanyDescription,
                                    Jobrole: jobDetails.Jobrole,
                                    jobDescription: jobDetails.jobDescription,
                                    Eligibility: jobDetails.Eligibility,
                                    JobLink: jobDetails.JobLink
                                }
                            }
                        ).then((response) => {
                            resolve({ editedJob: true });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        resolve({ editedJob: false }); // Do nothing if UserId doesn't match or job not found
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },    
    
    
    addIntern: (userDatas) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Convert single entries to arrays if needed
                userDatas.language = Array.isArray(userDatas.language) ? userDatas.language : [userDatas.language];
                userDatas.hobbies = Array.isArray(userDatas.hobbies) ? userDatas.hobbies : [userDatas.hobbies];
                userDatas.interestarea = Array.isArray(userDatas.interestarea) ? userDatas.interestarea : [userDatas.interestarea];
    
                const timeStamp = new Date();
                const userDataWithTimestamp = { ...userDatas, timestamp: timeStamp };
                const result = await db.getDb().collection(collection.INTERN_COLLECTION).insertOne(userDataWithTimestamp);
                const insertedInternId = result.insertedId;
                resolve(insertedInternId);
            } catch (error) {
                reject(error);
            }
        });
    },
    

    updateInternProfilePicture:(internshipId,picturename)=>{
        return new Promise(async (resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).updateOne({_id:new objectId(internshipId)},{
                    $set:{
                        ProfilePicture:picturename
                    }
                }).then((response)=>{
                    resolve()
                })
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },


    updateInternResume: (internshipId, resumename) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).updateOne({ _id: new objectId(internshipId) }, {
                    $set: {
                        resume: resumename
                    }
                }).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    /*getDoc2VecInternModel: async (userId) => {
        try {
            var internships = await db.getDb().collection(collection.INTERN_COLLECTION).find({UserId: { $ne: userId }}).toArray();
            const trainingData = [];
            internships.forEach(internship => {
                const internshipInterests = {
                    location: internship.LocationCurrent ? internship.LocationCurrent : "",
                    interests: internship.interestarea ? [internship.interestarea] : []
                };
                trainingData.push({
                    userId: internship._id ? internship._id : "",
                    userName: internship.Name ? internship.Name : "",
                    ...internshipInterests
                });
            });
            trainingData.forEach(data => {
                if (Array.isArray(data.interests)) {
                    data.interests = data.interests.flat();
                }
            });
            return trainingData; // Return trainingData directly without stringifying
        } catch (error) {
            console.error('Error processing data for fetching:', error);
            throw error; // Reject the promise with the error
        }
    },   */ 
    

    /*getInternDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).find({UserId: { $ne: userId }}).toArray()
                    .then((interns) => {
                        resolve(interns);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },*/


    getInternDetails_with_skip_limit: (userId,skip,limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).find({UserId: { $ne: userId }})
                .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                .skip(skip)
                .limit(limit)
                .toArray()
                .then((interns) => {
                    resolve(interns);
                })
                .catch((err) => {
                    reject(err);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    getIndividualInternshipDetails: (internshipId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).findOne({ _id: new objectId(internshipId) })
                    .then((indintern) => {
                        resolve(indintern);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    getEditButtonInternshipProfile1228: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION)
                    .find({ UserId: userId })
                    .toArray()
                    .then((interns) => {
                        resolve(interns.length);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    


    getEditInternshipDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION)
                    .find({ UserId: userId })
                    .toArray()
                    .then((interns) => {
                        resolve(interns);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    
     
    deleteInternship : (internshipId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                const InternCollection = db.getDb().collection(collection.INTERN_COLLECTION);
    
                InternCollection.findOne({ _id: new objectId(internshipId) })
                    .then((internship) => {
                        if (!internship) {
                            resolve({ deleteIntern: false }); // If internship not found
                        } else if (internship.UserId === userID) {
                            return InternCollection.deleteOne({ _id: new objectId(internshipId) });
                        } else {
                            resolve({ deleteIntern: false });
                        }
                    })
                    .then((result) => {
                        if (result && result.deletedCount === 1) {
                            resolve({ deleteIntern: true });
                        } else if (result) {
                            resolve({ deleteIntern: false });
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },    


    deleteJob : (jobId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                const JobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
                JobCollection.findOne({ _id: new objectId(jobId) })
                    .then((joB) => {
                        if (!joB) {
                            resolve({ deleteJob: false }); // If job not found
                        } else if (joB.UserId === userID) {
                            return JobCollection.deleteOne({ _id: new objectId(jobId) });
                        } else {
                            resolve({ deleteJob: false });
                        }
                    })
                    .then((result) => {
                        if (result && result.deletedCount === 1) {
                            resolve({ deleteJob: true });
                        } else if (result) {
                            resolve({ deleteJob: false });
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },   


    deleteJobImage: (jobId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                const JobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
                JobCollection.findOne({ _id: new objectId(jobId) })
                    .then((joB) => {
                        if (!joB) {
                            resolve({ deleteJobImage: false }); // Job not found
                        } else if (joB.UserId === userID) {
                            // Update the job by setting hasImage to false
                            return JobCollection.updateOne(
                                { _id: new objectId(jobId) },
                                { $set: { hasImage: false } } // Set hasImage to false
                            );
                        } else {
                            resolve({ deleteJobImage: false }); // User mismatch
                        }
                    })
                    .then((result) => {
                        if (result && result.modifiedCount === 1) {
                            resolve({ deleteJobImage: true }); // Successfully updated
                        } else if (result) {
                            resolve({ deleteJobImage: false }); // No document updated
                        }
                    })
                    .catch((error) => {
                        reject(error); // Handle any errors that occur
                    });
            } catch (error) {
                console.error(error);
                reject(error); // Catch any errors in the try block
            }
        });
    },    
    

    getIndividualInternshipDetail: (internshipId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let intern = await db.getDb().collection(collection.INTERN_COLLECTION).findOne({ _id: new objectId(internshipId) });
                resolve(intern);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    

    findUserIdFromInternshipId: (internshipId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let intern = await db.getDb().collection(collection.INTERN_COLLECTION).findOne({ _id: new objectId(internshipId) });
                if (intern) {
                    resolve({
                        intern,
                        userId: intern.UserId
                    });
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },    


    updateInternship: (internshipDetails, userID) => {
        return new Promise((resolve, reject) => {
            // Check if the incoming data is an array or single value
            const updateData = {};
            if (Array.isArray(internshipDetails.interestarea)) {
                updateData.interestarea = internshipDetails.interestarea; // If array, directly assign
            } else if (internshipDetails.interestarea) {
                updateData.interestarea = [internshipDetails.interestarea]; // If single value, convert to array
            }
    
            if (Array.isArray(internshipDetails.hobbies)) {
                updateData.hobbies = internshipDetails.hobbies; // If array, directly assign
            } else if (internshipDetails.hobbies) {
                updateData.hobbies = [internshipDetails.hobbies]; // If single value, convert to array
            }
    
            if (Array.isArray(internshipDetails.language)) {
                updateData.language = internshipDetails.language; // If array, directly assign
            } else if (internshipDetails.language) {
                updateData.language = [internshipDetails.language]; // If single value, convert to array
            }
    
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).findOne(
                    { _id: new objectId(internshipDetails.InternID) }
                ).then((intern) => {
                    if (intern && intern.UserId === userID) {
                        db.getDb().collection(collection.INTERN_COLLECTION).updateOne(
                            { _id: new objectId(internshipDetails.InternID) },
                            {
                                $set: {
                                    firstName: internshipDetails.firstName,
                                    lastName: internshipDetails.lastName,
                                    gender: internshipDetails.gender,
                                    Email: internshipDetails.Email,
                                    Interest: internshipDetails.Interest,
                                    jobintern: internshipDetails.jobintern,
                                    LocationCurrent: internshipDetails.LocationCurrent,
                                    workmode: internshipDetails.workmode,
                                    ...updateData, // Spread the updateData into the update
                                },
                            }
                        ).then(() => {
                            resolve({ editedIntern: true });
                        }).catch((err) => {
                            reject(err);
                        });
                    } else {
                        resolve({ editedIntern: false }); // Do nothing if UserId doesn't match or intern not found
                    }
                }).catch((err) => {
                    reject(err);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },    

    
    addPost: (postData, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const postDocument = {
                    ...postData,
                    timestamp: timestamp,
                    readable_time: formattedTimestamp
                };

                const result = await db.getDb().collection(collection.POST_COLLECTION).insertOne(postDocument);
                const insertedPostId = result.insertedId;
                resolve(insertedPostId);
            } catch (error) {
                reject(error);
            }
        });
    },


    getOwnPostDetails: (userId, skip, limit) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbClient = db.getDb();
                const posts = await dbClient.collection(collection.POST_COLLECTION)
                    .find({ UserId: userId })
                    .sort({ _id: -1 })  // This line sorts the documents in descending order by the _id field
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                resolve(posts);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },  
    
    
    getSingleDetails: (post_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbClient = await db.getDb();
                const post = await dbClient.collection(collection.POST_COLLECTION)
                    .findOne({ _id: new objectId(post_id) });
    
                if (post) {
                    resolve(post);
                } else {
                    resolve(null); // Return null if no post is found
                }
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },    
    

    getOtherPostDetails: (userOwnId, skip, limit) => {
        return new Promise(async(resolve, reject) => {
            try {
                const posts = await db.getDb().collection(collection.POST_COLLECTION)
                    .find({ UserId: { $ne: userOwnId } })
                    .sort({ _id: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                resolve(posts);
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
      

    add1228Like: (insertedId, post_id, Name) => {
        return new Promise((resolve, reject) => {
            try {
                const likeObject = { insertedId: insertedId, Name: Name };
    
                db.getDb().collection(collection.POST_COLLECTION).updateOne(
                    { _id: new objectId(post_id), "likes.insertedId": { $ne: insertedId } }, // Check if insertedId is not already present in likes array
                    { 
                        $addToSet: { // Add likeObject to likes array if it doesn't already exist
                            likes: likeObject 
                        }
                    }
                ).then((response) => {
                    if (response.modifiedCount === 0) { // If modifiedCount is 0, it means insertedId already existed in likes array, so remove it
                        return db.getDb().collection(collection.POST_COLLECTION).updateOne(
                            { _id: new objectId(post_id) },
                            { 
                                $pull: { // Remove likeObject from likes array
                                    likes: { insertedId: insertedId }
                                }
                            }
                        );
                    } else {
                        resolve({ likesUpdated: true });
                    }
                }).then((response) => {
                    if (response.modifiedCount === 0) {
                        resolve({ likesUpdated: false });
                    } else {
                        resolve({ likesUpdated: true });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },


    /*getComment: (post_id, userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).findOne(
                    { _id: new objectId(post_id) },
                    { comments: 1 }
                ).then((result) => {
                    if (result && result.comments && result.comments.length > 0) {
                        // Process comments array
                        result.comments = result.comments.map(comment => {
                            let liked_comment = false;
                            
                            // Check if user has liked the comment
                            if (comment.comment_likes && comment.comment_likes.length > 0) {
                                liked_comment = comment.comment_likes.includes(userId);
                            }
    
                            // Process replies if present
                            if (comment.replies && comment.replies.length > 0) {
                                comment.replies = comment.replies.reverse().map(reply => ({
                                    ...reply,
                                    userConfirmedStatusReply: reply.Reply_owner_id === userId,
                                    liked_comment_reply: reply.comment_reply_likes 
                                        ? reply.comment_reply_likes.includes(userId) 
                                        : false
                                }));
                            }
    
                            // Return modified comment object
                            return {
                                ...comment,
                                userConfirmedStatus: comment.comment_owner_id === userId,
                                liked_comment
                            };
                        });
    
                        resolve(result.comments);
                    } else {
                        resolve([]); // Return empty array if no post found with the given post_id or no comments
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },*/
    

    addComment: (postId, comment_owner_id, comment_owner_name, Comment_data, time_comment, status) => {
        return new Promise((resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const postIdQuery = { _id: new objectId(postId) };
    
                // Convert time_comment to human-readable format
                const date = new Date(time_comment);
                const options = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    // hour: '2-digit',
                    // minute: '2-digit',
                    // hour12: true
                };
                const formattedTimeComment = date.toLocaleString('en-US', options);
    
                postCollection.findOne(postIdQuery)
                    .then((post) => {
                        if (!post) {
                            reject("Post not found");
                            return;
                        }
                        if (!post.comments) {
                            post.comments = [];
                        }
                        const comment_id = new objectId();
                        const comment = {
                            comment_id: comment_id,
                            comment_owner_id: comment_owner_id,
                            comment_owner_name: comment_owner_name,
                            Comment_data: Comment_data,
                            time: formattedTimeComment,  // Use formatted time
                            status: status
                        };
                        post.comments.push(comment);
                        postCollection.updateOne({ _id: post._id }, { $set: { comments: post.comments } })
                            .then(() => {
                                resolve({ added_Comment: true, comment_id: comment_id });
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },    


    addCommentReply: async (post_Id, Comment_id, Reply_content, Comment_owner_name, Reply_owner_id, 
        Reply_owner_name, time_comment, status, Redirection_ID, Redirection_Status) => {
        return new Promise((resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
    
                const date = new Date(time_comment);
                const options = {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    // hour: '2-digit',
                    // minute: '2-digit',
                    // hour12: true
                };
                const formattedTimeComment = date.toLocaleString('en-US', options);
    
                postCollection.findOne({ "_id": new objectId(post_Id) })
                    .then((post) => {
                        if (post) {
                            if (post.comments) {
                                const commentIndex = post.comments.findIndex(comment => comment.comment_id.toString() === Comment_id);
                                if (commentIndex !== -1) {
                                    if (!post.comments[commentIndex].replies) {
                                        post.comments[commentIndex].replies = [];
                                    }
                                    const reply_id = new objectId();
                                    post.comments[commentIndex].replies.unshift({
                                        "reply_id": reply_id,
                                        "Reply_content": Reply_content,
                                        "Comment_owner_name": Comment_owner_name,
                                        "Reply_owner_id": Reply_owner_id,
                                        "Reply_owner_name": Reply_owner_name,
                                        "time_comment": formattedTimeComment,  // Use formatted time
                                        "status": status,
                                        "Redirection_ID": Redirection_ID,
                                        "Redirection_Status": Redirection_Status
                                    });
                                    postCollection.updateOne({ "_id": new objectId(post_Id) }, { $set: { "comments": post.comments } })
                                        .then(() => {
                                            resolve({ added_Comment_Reply: true, reply_id: reply_id });
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                } else {
                                    reject("Comment not found");
                                }
                            } else {
                                reject("Comments array not found");
                            }
                        } else {
                            reject("Post not found");
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },    
    
    
    deletePostComment: async (postID, commentID, replyCount, userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
    
                // Find the post and the comment to be deleted or modified
                const post = await postCollection.findOne({ _id: new objectId(postID) });
                if (!post) {
                    resolve({ deleted_Comment: false});
                    return;
                }
    
                // Locate the comment within the post
                const commentIndex = post.comments.findIndex(comment => comment.comment_id.equals(new objectId(commentID)));
                if (commentIndex === -1) {
                    resolve({ deleted_Comment: false});
                    return;
                }
    
                // Get the comment to delete or modify
                const commentToDelete = post.comments[commentIndex];
    
                // Check if comment_owner_id matches userID
                if (commentToDelete.comment_owner_id !== userID) {
                    resolve({ deleted_Comment: false});
                    return;
                }
    
                const timestamp = new Date();
                const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
                // Handle based on replyCount
                if (replyCount >= 10) {
                    // Modify the comment data
                    const deletedCommentData = commentToDelete.Comment_data;
                    post.comments[commentIndex].Comment_data = "this comment was removed by owner";
                    post.comments[commentIndex].del_com_stat = true;
                    post.comments[commentIndex].del_time = formattedTimestamp;
    
                    // Prepare data for DELETED_POST_COMMENT_REPLY collection
                    const deletedPostComment = {
                        postID: (post._id).toString(),
                        timestamp: new Date(),
                        comment_owner_id: commentToDelete.comment_owner_id,
                        deleted_Comment_data: deletedCommentData,
                        comment_owner_name: commentToDelete.comment_owner_name,
                        time: commentToDelete.time,
                        status: commentToDelete.status,
                        comment_id: (commentToDelete.comment_id).toString(),
                    };
    
                    // Insert into DELETED_POST_COMMENT_REPLY collection
                    await db.getDb().collection(collection.DELETED_POST_COMMENT_REPLY).insertOne(deletedPostComment);
                } else {
                    // Prepare data for DELETED_POST_COMMENT_REPLY collection
                    const deletedPostComment = {
                        postID: (post._id).toString(),
                        timestamp: new Date(),
                        comment_owner_id: commentToDelete.comment_owner_id,
                        deleted_Comment_data: commentToDelete.Comment_data,
                        comment_owner_name: commentToDelete.comment_owner_name,
                        time: commentToDelete.time,
                        status: commentToDelete.status,
                        comment_id: (commentToDelete.comment_id).toString(),
                    };
    
                    // Insert into DELETED_POST_COMMENT_REPLY collection
                    await db.getDb().collection(collection.DELETED_POST_COMMENT_REPLY).insertOne(deletedPostComment);
    
                    // Remove the comment from the post
                    post.comments.splice(commentIndex, 1);
                }
    
                // Update the post with modified or deleted comment
                await postCollection.updateOne({ _id: new objectId(postID) }, { $set: { comments: post.comments } });
    
                resolve({ deleted_Comment: true });
    
            } catch (err) {
                reject(err);
            }
        });
    },


    deletePostCommentReply: async (postID, commentID, replyID, userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION); 
                const post = await postCollection.findOne({ _id: new objectId(postID) });
                
                if (!post) {
                    return resolve({ deleted_reply_Comment: false});
                }     
                
                if (!post.comments) {
                    return resolve({ deleted_reply_Comment: false});
                }           
                
                const commentIndex = post.comments.findIndex(comment => comment.comment_id.equals(new objectId(commentID)));
                if (commentIndex === -1) {
                    return resolve({ deleted_reply_Comment: false});
                }
                
                if (!post.comments[commentIndex].replies) {
                    return resolve({ deleted_reply_Comment: false});
                }             
                
                const replyIndex = post.comments[commentIndex].replies.findIndex(reply => reply.reply_id.equals(new objectId(replyID)));
                if (replyIndex === -1) {
                    return resolve({ deleted_reply_Comment: false});
                }
    
                // Check if Reply_owner_id matches userID
                if (post.comments[commentIndex].replies[replyIndex].Reply_owner_id !== userID) {
                    return resolve({ deleted_reply_Comment: false});
                }
    
                // Save the original reply content before modifying
                const replyToDelete = post.comments[commentIndex].replies[replyIndex];
                const deletedReplyContent = post.comments[commentIndex].replies[replyIndex].Reply_content;
                const timestamp = new Date();
                const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
                // Update reply with modified content and additional variables
                post.comments[commentIndex].replies[replyIndex].Reply_content = "this reply was removed by owner";
                post.comments[commentIndex].replies[replyIndex].del_rep_stat = true;
                post.comments[commentIndex].replies[replyIndex].del_time = formattedTimestamp;
                post.comments[commentIndex].replies[replyIndex].deleted_Reply_content = deletedReplyContent;

                const deletedPostCommentReply = {
                    postID: (post._id).toString(),
                    timestamp: new Date(),
                    comment_owner_id: replyToDelete.Reply_owner_id,
                    deleted_Comment_data: deletedReplyContent,
                    comment_owner_name: replyToDelete.Reply_owner_name,
                    time: replyToDelete.time_comment,
                    status: replyToDelete.status,
                    comment_id: (replyToDelete.reply_id).toString(),
                    comment_red_id : (commentID).toString(),
                };

                 // Insert into DELETED_POST_COMMENT_REPLY collection
                 await db.getDb().collection(collection.DELETED_POST_COMMENT_REPLY).insertOne(deletedPostCommentReply);
    
                // Update the post in the database
                await postCollection.updateOne(
                    { _id: new objectId(postID) },
                    { $set: { comments: post.comments } }
                );   
    
                resolve({ deleted_reply_Comment: true });
            } catch (err) {
                reject(err);
            }
        });
    },    


    editCommentPost: async (Post_ID, Comment_ID, Comment_content, userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const post = await postCollection.findOne({ _id: new objectId(Post_ID) });
                if (!post) {
                    return resolve({ edited_Comment: false});
                }
                if (!Array.isArray(post.comments)) {
                    return resolve({ edited_Comment: false});
                }
                const commentIndex = post.comments.findIndex(comment => 
                    comment.comment_id.equals(new objectId(Comment_ID))
                );
                if (commentIndex === -1) {
                    return resolve({ edited_Comment: false});
                }
    
                // Check if comment_owner_id matches userID
                if (post.comments[commentIndex].comment_owner_id !== userID) {
                    return resolve({ edited_Comment: false});
                }
    
                post.comments[commentIndex].Comment_data = Comment_content;
                if (!post.comments[commentIndex].hasOwnProperty('editstatus')) {
                    post.comments[commentIndex].editstatus = true;
                }
                await postCollection.updateOne(
                    { _id: new objectId(Post_ID) },
                    { $set: { comments: post.comments } }
                );
                resolve({ edited_Comment: true });
            } catch (err) {
                reject(err);
            }
        });
    },    


    editCommentReplyPost: async (post_Id, Comment_Id, reply_Id, Reply_content, userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const post = await postCollection.findOne({ _id: new objectId(post_Id) });
                if (!post) {
                    return resolve({ edited_Comment_reply: false});
                }
                if (!Array.isArray(post.comments)) {
                    return resolve({ edited_Comment_reply: false});
                }
                const commentIndex = post.comments.findIndex(comment => 
                    comment.comment_id.equals(new objectId(Comment_Id))
                );
                if (commentIndex === -1) {
                    return resolve({ edited_Comment_reply: false});
                }
                if (!Array.isArray(post.comments[commentIndex].replies)) {
                    return resolve({ edited_Comment_reply: false});
                }
                const replyIndex = post.comments[commentIndex].replies.findIndex(reply => 
                    reply.reply_id.equals(new objectId(reply_Id))
                );
                if (replyIndex === -1) {
                    return resolve({ edited_Comment_reply: false});
                }
    
                // Check if Reply_owner_id matches userID
                if (post.comments[commentIndex].replies[replyIndex].Reply_owner_id !== userID) {
                    return resolve({ edited_Comment_reply: false});
                }
    
                post.comments[commentIndex].replies[replyIndex].Reply_content = Reply_content;
                if (!post.comments[commentIndex].replies[replyIndex].hasOwnProperty('editreplystatus')) {
                    post.comments[commentIndex].replies[replyIndex].editreplystatus = true;
                }
                await postCollection.updateOne(
                    { _id: new objectId(post_Id) },
                    { $set: { comments: post.comments } }
                );
                resolve({ edited_Comment_reply: true });
            } catch (err) {
                reject(err);
            }
        });
    },    


    addCommentLike: async (post_Id, Comment_Id, user_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const post = await postCollection.findOne({ _id: new objectId(post_Id) });
                if (!post) {
                    return reject(new Error("Post not found"));
                }
                if (!Array.isArray(post.comments)) {
                    return reject(new Error("Comments array not found"));
                }
                const commentIndex = post.comments.findIndex(comment => 
                    comment.comment_id.equals(new objectId(Comment_Id))
                );
                if (commentIndex === -1) {
                    return reject(new Error("Comment not found"));
                }
                const comment = post.comments[commentIndex];
                if (!comment.comment_likes) {
                    comment.comment_likes = [];
                }
                if (typeof comment.likes_count_comment !== 'number') {
                    comment.likes_count_comment = 0;
                }
                const userLikeIndex = comment.comment_likes.indexOf(user_id);
                let add_remove_status;
                if (userLikeIndex === -1) {
                    comment.comment_likes.push(user_id);
                    comment.likes_count_comment += 1;
                    add_remove_status = true;
                } else {
                    comment.comment_likes.splice(userLikeIndex, 1);
                    comment.likes_count_comment -= 1;
                    add_remove_status = false;
                }
                const updateResult = await postCollection.updateOne(
                    { _id: new objectId(post_Id), "comments.comment_id": new objectId(Comment_Id) },
                    { $set: { 
                        "comments.$.comment_likes": comment.comment_likes,
                        "comments.$.likes_count_comment": comment.likes_count_comment 
                    }}
                );
                if (updateResult.modifiedCount === 1) {
                    resolve({ liked_comment_added: true, add_remove_status: add_remove_status });
                } else {
                    reject(new Error("Failed to update the comment likes"));
                }
            } catch (err) {
                reject(err);
            }
        });
    },    
    

    addCommentReplyLike: async (post_Id, Comment_Id, reply_Id, user_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const post = await postCollection.findOne({ _id: new objectId(post_Id) });
                if (!post) {
                    return reject(new Error("Post not found"));
                }
                if (!Array.isArray(post.comments)) {
                    return reject(new Error("Comments array not found"));
                }
                const commentIndex = post.comments.findIndex(comment => 
                    comment.comment_id.equals(new objectId(Comment_Id))
                );
                if (commentIndex === -1) {
                    return reject(new Error("Comment not found"));
                }
                const comment = post.comments[commentIndex];
                if (!Array.isArray(comment.replies)) {
                    return reject(new Error("Replies array not found"));
                }
                const replyIndex = comment.replies.findIndex(reply => 
                    reply.reply_id.equals(new objectId(reply_Id))
                );
                if (replyIndex === -1) {
                    return reject(new Error("Reply not found"));
                }
                const reply = comment.replies[replyIndex];
                if (!reply.comment_reply_likes) {
                    reply.comment_reply_likes = [];
                }
                if (typeof reply.likes_count_reply !== 'number') {
                    reply.likes_count_reply = 0;
                }
                const userLikeIndex = reply.comment_reply_likes.indexOf(user_id);
                let add_remove_reply_status;
                if (userLikeIndex === -1) {
                    reply.comment_reply_likes.push(user_id);
                    reply.likes_count_reply += 1;
                    add_remove_reply_status = true;
                } else {
                    reply.comment_reply_likes.splice(userLikeIndex, 1);
                    reply.likes_count_reply -= 1;
                    add_remove_reply_status = false;
                }
                const updateResult = await postCollection.updateOne(
                    { _id: new objectId(post_Id), "comments.comment_id": new objectId(Comment_Id), "comments.replies.reply_id": new objectId(reply_Id) },
                    { $set: { 
                        "comments.$[commentElem].replies.$[replyElem].comment_reply_likes": reply.comment_reply_likes,
                        "comments.$[commentElem].replies.$[replyElem].likes_count_reply": reply.likes_count_reply 
                    }},
                    {
                        arrayFilters: [
                            { "commentElem.comment_id": new objectId(Comment_Id) },
                            { "replyElem.reply_id": new objectId(reply_Id) }
                        ]
                    }
                );
                if (updateResult.modifiedCount === 1) {
                    resolve({ liked_comment_reply_added: true, add_remove_reply_status: add_remove_reply_status });
                } else {
                    reject(new Error("Failed to update the comment reply likes"));
                }
            } catch (err) {
                reject(err);
            }
        });
    },    
    

    fetchCommentsByPostId: (postId) => {
        return new Promise((resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const postIdQuery = { _id: new objectId(postId) };
                postCollection.findOne(postIdQuery)
                    .then((post) => {
                        if (!post) {
                            reject("Post not found");
                            return;
                        }
                        const comments = post.comments || [];
                        resolve(comments);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
        
    
    addPostImages: (postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).updateOne({ _id: new objectId(postId) }, {
                    $set: {
                        ImageNames: postNames
                    }
                }).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    addPostVideos: (postId, postNames) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).updateOne({ _id: new objectId(postId) }, {
                    $set: {
                        VideoNames: postNames
                    }
                }).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getPostDetails: (postId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).findOne({ _id: new objectId(postId) })
                    .then((indpost) => {
                        resolve(indpost);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    editPost: (postId, descriptionInput, locationInput, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).findOne(
                    { _id: new objectId(postId) }
                ).then((post) => {
                    if (post && post.UserId === userID) {
                        db.getDb().collection(collection.POST_COLLECTION).updateOne(
                            { _id: new objectId(postId) },
                            {
                                $set: {
                                    description: descriptionInput,
                                    location: locationInput
                                }
                            }
                        ).then(() => {
                            resolve({ edited_post: true });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        resolve({ edited_post: false});
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    


    getAllCommentators: (postId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).findOne(
                    { _id: new objectId(postId) }
                ).then((post) => {
                    if (post) {
                        let allUserIds = new Set(); // Use a Set to store unique user IDs.
    
                        if (post.comments && Array.isArray(post.comments)) {
                            post.comments.forEach(comment => {
                                // Add the comment_owner_id to the Set
                                allUserIds.add(comment.comment_owner_id);
    
                                // Check if there are replies in the comment
                                if (comment.replies && Array.isArray(comment.replies)) {
                                    comment.replies.forEach(reply => {
                                        // Add the Reply_owner_id to the Set
                                        allUserIds.add(reply.Reply_owner_id);
                                    });
                                }
                            });
                        }
    
                        // Convert the Set to an Array and resolve
                        resolve(Array.from(allUserIds));
                    } else {
                        resolve([]); // If no post is found, resolve with an empty array
                    }
                }).catch((error) => {
                    reject(error); // Catch and reject any errors from the database operation
                });
            } catch (error) {
                reject(error); // Catch and reject any other errors
            }
        });
    },   
    

    deletePost: (postId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).findOne(
                    { _id: new objectId(postId) }
                ).then((post) => {
                    if (post && post.UserId === userID) {
                        db.getDb().collection(collection.POST_COLLECTION).deleteOne(
                            { _id: new objectId(postId) }
                        ).then(() => {
                            resolve({ deletePost: true });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        resolve({ deletePost: false});
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },   
    
    
    deleteCommentEntry: (post_id, senders_ids) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const trackerCollection = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER); // DELETE POST 
    
                // Loop through each sender_id in senders_ids array
                for (let sender_id of senders_ids) {
                    // Find the entry where Sender_ID matches sender_id
                    const userEntry = await trackerCollection.findOne({ Sender_ID: sender_id });
    
                    if (userEntry && userEntry[post_id]) {
                        // If an array with the key post_id exists, delete it
                        const updateResult = await trackerCollection.updateOne(
                            { Sender_ID: sender_id },
                            { $unset: { [post_id]: "" } }  // Use $unset to remove the array
                        );
    
                        if (updateResult.modifiedCount > 0) {
                            console.log(`Successfully deleted array ${post_id} for Sender_ID: ${sender_id}`);
                        } else {
                            console.log(`No array ${post_id} found for Sender_ID: ${sender_id}`);
                        }
                    }
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    
    

    addQuestionMentorship: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                const timeStamp = new Date();
                const existReplyCount = parseInt(0);
                const currentReplyCount = parseInt(0);
                const userDataWithTimestamp = { ...userData, existReplyCount, currentReplyCount, timestamp: timeStamp };
                const result = await db.getDb().collection(collection.MENTOR_COLLECTION).insertOne(userDataWithTimestamp);
                const insertedId = result.insertedId;
                resolve(insertedId);
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getMentorDetails: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION)
                .find({})
                .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                .skip(skip)
                .limit(limit)
                .toArray()
                .then((mentors) => {
                    resolve(mentors);
                })
                .catch((err) => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    deleteMentor: (mentorId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne(
                    { _id: new objectId(mentorId) }
                ).then((mentor) => {
                    if (mentor && mentor.userId === userID) {
                        db.getDb().collection(collection.MENTOR_COLLECTION).deleteOne(
                            { _id: new objectId(mentorId) }
                        ).then(() => {
                            resolve({ deleteMentor: true });
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        resolve({ deleteMentor: false, message: "User not authorized to delete this mentor" });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    
    

    addReply: (replyData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let questionId = replyData.questionId;
                replyData._id = new objectId();
                const timestamp = new Date(); // Current timestamp
                replyData.timestamp = timestamp; // Add timestamp to replyData
                const query = { _id: new objectId(questionId) };
                const update = { $push: { replies: replyData } };
                const result = await db.getDb().collection(collection.MENTOR_COLLECTION).updateOne(query, update);
                if (result.modifiedCount === 1) {
                    resolve(replyData._id); // Return the new reply ID
                } else {
                    reject("Failed to add reply. No document updated.");
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    

    deleteMentorReply: (mentorReplyId, questionId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne(
                    { _id: new objectId(questionId) }
                ).then((question) => {
                    if (!question || !Array.isArray(question.replies)) {
                        resolve({ deleteMentorReply: false});
                        return;
                    }
                    const reply = question.replies.find(reply => reply._id.equals(new objectId(mentorReplyId)));
    
                    if (!reply) {
                        resolve({ deleteMentorReply: false});
                        return;
                    }
                    if (reply.userId === userID) {
                        db.getDb().collection(collection.MENTOR_COLLECTION).updateOne(
                            { _id: new objectId(questionId) },
                            { $pull: { replies: { _id: new objectId(mentorReplyId) } } }
                        ).then((response) => {
                            if (response.modifiedCount > 0) {
                                resolve({ deleteMentorReply: true });
                            } else {
                                resolve({ deleteMentorReply: false });
                            }
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        resolve({ deleteMentorReply: false});
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    


    editQuestion: (questionData, questionId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne(
                    { _id: new objectId(questionId) }
                ).then((question) => {
                    if (question && question.userId === userID) {
                        db.getDb().collection(collection.MENTOR_COLLECTION).updateOne(
                            { _id: new objectId(questionId) },
                            { $set: { questionInput: questionData, edit_status: true } }
                        ).then((result) => {
                            if (result.modifiedCount > 0) {
                                resolve({ success: true });
                            } else {
                                resolve({ success: false });
                            }
                        }).catch((err) => {
                            reject(err);
                        });
                    } else {
                        resolve({ success: false});
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    
    

    editReply: (questionData, questionId, replyId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION)
                    .findOne({ _id: new objectId(questionId) })
                    .then((questionDocument) => {
                        if (!questionDocument) {
                            resolve({ success: false});
                            return;
                        }
    
                        const replyToUpdate = questionDocument.replies.find(reply => reply._id.toString() === replyId);
                        if (!replyToUpdate) {
                            resolve({ success: false});
                            return;
                        }
    
                        // Check if the userId of the reply matches the userID parameter
                        if (replyToUpdate.userId !== userID) {
                            resolve({ success: false});
                            return;
                        }
    
                        // Update the reply content
                        replyToUpdate.questionInput = questionData;
                        replyToUpdate.edit_status = true; // Add edit_status as true
    
                        // Update the document in the collection
                        db.getDb().collection(collection.MENTOR_COLLECTION)
                            .updateOne(
                                { _id: new objectId(questionId) },
                                { $set: { replies: questionDocument.replies } }
                            )
                            .then((result) => {
                                if (result.modifiedCount > 0) {
                                    resolve({ success: true });
                                } else {
                                    resolve({ success: false });
                                }
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },     
    

    addRemoveMentorReaction: (mentorId, emoji, user_id, user_Name) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({
                    _id: new objectId (mentorId)
                }).then((mentor) => {
                    if (!mentor) {
                        reject(new Error("Message not found"));
                        return;
                    }
    
                    // Initialize reactions array if not present
                    if (!mentor.reactions) {
                        mentor.reactions = [];
                    }
    
                    // Check if the user already reacted
                    const reactionIndex = mentor.reactions.findIndex(r => r.user_id === user_id);
                    if (reactionIndex > -1) {
                        // If user has already reacted
                        if (mentor.reactions[reactionIndex].emoji === emoji) {
                            // If the emoji is the same, remove the reaction
                            mentor.reactions.splice(reactionIndex, 1);
                        } else {
                            // If the emoji is different, update the emoji
                            mentor.reactions[reactionIndex].emoji = emoji;
                        }
                    } else {
                        // If user has not reacted, add the reaction
                        mentor.reactions.push({ emoji: emoji, user_id: user_id, user_Name: user_Name });
                    }
    
                    // Update the mentor with the new reactions array
                    db.getDb().collection(collection.MENTOR_COLLECTION).updateOne(
                        { _id: new objectId(mentorId) },
                        { $set: { reactions: mentor.reactions } }
                    ).then(() => {
                        resolve({ addedMentorReaction: true });
                    }).catch((error) => {
                        console.error(error);
                        reject(new Error("Error updating mentor reactions"));
                    });
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding mentor"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in addRemoveReaction function"));
            }
        });
    },


    addRemoveMentorReplyReaction: (replyId, mentorId, emoji, user_id, user_Name) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({
                    _id: new objectId(mentorId)
                }).then((mentor) => {
                    if (!mentor) {
                        reject(new Error("Mentor not found"));
                        return;
                    }
    
                    // Find the reply with the id equal to replyId
                    const replyIndex = mentor.replies.findIndex(r => r._id.toString() === replyId);
                    if (replyIndex === -1) {
                        reject(new Error("Reply not found"));
                        return;
                    }
    
                    const reply = mentor.replies[replyIndex];
    
                    // Initialize reactions array if not present
                    if (!reply.reactions) {
                        reply.reactions = [];
                    }
    
                    // Check if the user already reacted
                    const reactionIndex = reply.reactions.findIndex(r => r.user_id === user_id);
                    if (reactionIndex > -1) {
                        // If user has already reacted
                        if (reply.reactions[reactionIndex].emoji === emoji) {
                            // If the emoji is the same, remove the reaction
                            reply.reactions.splice(reactionIndex, 1);
                        } else {
                            // If the emoji is different, update the emoji
                            reply.reactions[reactionIndex].emoji = emoji;
                        }
                    } else {
                        // If user has not reacted, add the reaction
                        reply.reactions.push({ emoji: emoji, user_id: user_id, user_Name: user_Name });
                    }
    
                    // Update the mentor with the new reactions array
                    db.getDb().collection(collection.MENTOR_COLLECTION).updateOne(
                        { _id: new objectId(mentorId), "replies._id": new objectId(replyId) },
                        { $set: { "replies.$.reactions": reply.reactions } }
                    ).then(() => {
                        resolve({ addedMentorReplyReaction: true });
                    }).catch((error) => {
                        console.error(error);
                        reject(new Error("Error updating reply reactions"));
                    });
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding mentor"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in addRemoveMentorReplyReaction function"));
            }
        });
    },    


    getMentorByIdEmoji: (mentorId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({ _id: new objectId(mentorId) })
                    .then((mentor) => {
                        if (!mentor) {
                            reject(new Error("mentor not found"));
                        } else {
                            let result = {
                                reactions: [],
                            };
                        
                            if (mentor.reactions && mentor.reactions.length > 0) {
                                result.reactions = mentor.reactions;
                            }
                        
                            resolve(result);
                        }                
                    })
                    .catch((error) => {
                        console.error(error);
                        reject(new Error("Error finding mentor"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getmentorByIdEmoji function"));
            }
        });
    },


    getMentorByIdText: (mentorId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({ _id: new objectId(mentorId), userId: userID }).then((mentor) => {
                    if (!mentor) {
                        reject(new Error("mentor not found"));
                    } else {
                        let result = {
                            has_mentor: false
                        }
                        if (mentor.questionInput && mentor.questionInput !== '' && mentor.messageContent !== null) {
                            result.has_mentor = true;
                        }
                        resolve(result);
                    }
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding mentor"));
                });
            } catch (error) {
                console.error(error); 
                reject(new Error("Error in getMentorByIdText function"));
            }
        });
    },


    getMentorReplyByIdText: (mentorId, replyId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({ _id: new objectId(mentorId) }).then((mentor) => {
                    if (!mentor) {
                        reject(new Error("Mentor not found"));
                        return;
                    } 
    
                    // Find the reply with the id equal to replyId
                    const reply = mentor.replies.find(r => r._id.toString() === replyId);
                    if (!reply) {
                        reject(new Error("Reply not found"));
                        return;
                    }
    
                    // Check if the userId of the reply matches the userID parameter
                    if (reply.userId !== userID) {
                        reject(new Error("User not authorized to access this reply"));
                        return;
                    }
    
                    let result = {
                        has_mentorReply: false
                    };
                    if (reply.questionInput && reply.questionInput !== '' && reply.messageContent !== null) {
                        result.has_mentorReply = true;
                    }
                    resolve(result);
                }).catch((error) => {
                    console.error(error);
                    reject(new Error("Error finding reply"));
                });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getMentorReplyByIdText function"));
            }
        });
    },    


    getMentorReplyByIdEmoji: (replyId, mentorId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({ _id: new objectId(mentorId) })
                    .then((mentor) => {
                        if (!mentor) {
                            reject(new Error("Mentor not found"));
                            return;
                        }
    
                        // Find the reply with the id equal to replyId
                        const reply = mentor.replies.find(r => r._id.toString() === replyId);
                        if (!reply) {
                            reject(new Error("Reply not found"));
                            return;
                        }
    
                        let result = {
                            reactions: [],
                        };
    
                        if (reply.reactions && reply.reactions.length > 0) {
                            result.reactions = reply.reactions;
                        }
    
                        resolve(result);
                    })
                    .catch((error) => {
                        console.error(error);
                        reject(new Error("Error finding mentor"));
                    });
            } catch (error) {
                console.error(error);
                reject(new Error("Error in getMentorReplyByIdEmoji function"));
            }
        });
    },    
    

    getsendedMessageUIDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne({ Sender_Id: userId })
                    .then((messageUI) => {
                        if (!messageUI) {
                            resolve({}); // Resolve with an empty object if no data is found
                            return;
                        }
                        
                        const senderId = messageUI.Sender_Id;
                        const senderStorage = messageUI[senderId];
            
                        if (!senderStorage) {
                            resolve({}); // Resolve with an empty object if senderStorage is not found
                            return;
                        }
            
                        const result = {};
            
                        Object.keys(senderStorage).forEach(receiverId => {
                            const messages = senderStorage[receiverId];
            
                            if (messages && messages.length > 0) {
                                const lastMessage = messages[messages.length - 1];
            
                                result[receiverId] = {
                                    messageContent: lastMessage.messageContent,
                                    timestamp: lastMessage.timestamp,
                                    status: lastMessage.status,
                                    Reciever_name: lastMessage.Reciever_name,
                                    Sender_name: lastMessage.Sender_name,
                                    deleteStatus: lastMessage.deleteStatus || null,
                                };
                            }
                        });
            
                        resolve(result);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getsendedMessageUIDetailsAdmin: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne({ Sender_Id: userId })
                    .then((messageUI) => {
                        if (!messageUI) {
                            resolve({}); // Resolve with an empty object if no data is found
                            return;
                        }
                        
                        const senderId = messageUI.Sender_Id;
                        const senderStorage = messageUI[senderId];
            
                        if (!senderStorage) {
                            resolve({}); // Resolve with an empty object if senderStorage is not found
                            return;
                        }
            
                        const result = {};
            
                        Object.keys(senderStorage).forEach(receiverId => {
                            const messages = senderStorage[receiverId];
            
                            if (messages && messages.length > 0) {
                                const lastMessage = messages[messages.length - 1];
            
                                result[receiverId] = {
                                    messageContent: lastMessage.messageContent,
                                    timestamp: lastMessage.timestamp,
                                    status: lastMessage.status,
                                    Reciever_name: lastMessage.Reciever_name,
                                    Sender_name: lastMessage.Sender_name,
                                    deleteStatus: lastMessage.deleteStatus || null,
                                };
                            }
                        });
            
                        resolve(result);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getReceivedMessageUIDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION)
                    .find({ "Sender_Id": { $ne: userId } })
                    .toArray()
                    .then((entries) => {
                        const result = [];
                        entries.forEach((entry) => {
                            const senderId = entry.Sender_Id;
                            if (entry[senderId] && entry[senderId][userId]) {
                                const userArray = entry[senderId][userId];
                                if (userArray.length > 0) {
                                    const lastMessage = userArray[userArray.length - 1];
                                    const { messageContent, timestamp, status, Reciever_name, deleteStatus, Sender_name } = lastMessage;
                                    const userEntry = {
                                        Sender_Id: senderId,
                                        messageContent,
                                        timestamp,
                                        status,
                                        Sender_name,
                                        Reciever_name,
                                        deleteStatus
                                    };
                                    result.push(userEntry);
                                }
                            }
                        });
                        resolve(result);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getReceivedMessageUIDetailsAdmin: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN)
                    .find({ "Sender_Id": { $ne: userId } })
                    .toArray()
                    .then((entries) => {
                        const result = [];
                        entries.forEach((entry) => {
                            const senderId = entry.Sender_Id;
                            if (entry[senderId] && entry[senderId][userId]) {
                                const userArray = entry[senderId][userId];
                                if (userArray.length > 0) {
                                    const lastMessage = userArray[userArray.length - 1];
                                    const { messageContent, timestamp, status, Reciever_name, deleteStatus, Sender_name } = lastMessage;
                                    const userEntry = {
                                        Sender_Id: senderId,
                                        messageContent,
                                        timestamp,
                                        status,
                                        Sender_name,
                                        Reciever_name,
                                        deleteStatus
                                    };
                                    result.push(userEntry);
                                }
                            }
                        });
                        resolve(result);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getBroadcastMessageUIDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
                // Find the last entry in the collection
                const lastEntry = await adminBroadcastChatCollection.find({}).sort({ _id: -1 }).limit(1).toArray();
    
                if (lastEntry && lastEntry.length > 0) {
                    resolve(lastEntry[0]); // Resolve with the last entry
                } else {
                    resolve([]); // Resolve with an empty array if no entries found
                }
            } catch (error) {
                console.error(error);
                reject("Error fetching broadcast message details");
            }
        });
    },
    
    
    updateTimeUnread: (Sender_Id, roomId, timeStamp, messageCount) => { 
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION); //  CHECKED
    
                const query = { roomId: roomId, Sender_Id: Sender_Id };
                const update = { $set: { timeStamp: timeStamp, messageCount: messageCount } };
                const options = { upsert: true };
    
                userCollection.updateOne(query, update, options)
                    .then(() => {
                        resolve({ updateTimeUnread: true });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    updateTimeUnreadAdmin: (Sender_Id, roomId, timeStamp, messageCount) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
    
                const query = { roomId: roomId, Sender_Id: Sender_Id };
                const update = { $set: { timeStamp: timeStamp, messageCount: messageCount } };
                const options = { upsert: true };
    
                userCollection.updateOne(query, update, options)
                    .then(() => {
                        resolve({ updateTimeUnread: true });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    updateEnteredTimeUnread: (Sender_Id, Reciever_Id, roomId, time_entered_inchat) => { //  ERRORERRORMARK IN 3RD FUNCTION
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
    
                // Check if there is an entry with Sender_Id and roomId
                userCollection.findOne({ Sender_Id: Sender_Id, Reciever_Id: Reciever_Id, roomId: roomId })
                    .then((result) => {
                        if (result) {
                            // Entry with Sender_Id and roomId exists
                            // Check if time_entered_inchat entry exists
                            if (result.time_entered_inchat) {
                                // Update time_entered_inchat
                                userCollection.updateOne({ Sender_Id: Sender_Id, Reciever_Id: Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
                                    .then(() => {
                                        resolve("Updated time_entered_inchat successfully");
                                    })
                                    .catch((err) => {
                                        reject(err);
                                    });
                            } else {
                                // Insert time_entered_inchat
                                userCollection.updateOne({ Sender_Id: Sender_Id, Reciever_Id: Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
                                    .then(() => {
                                        resolve("Inserted time_entered_inchat successfully");
                                    })
                                    .catch((err) => {
                                        reject(err);
                                    });
                            }
                        } else {
                            // Entry with Sender_Id and roomId doesn't exist, create one
                            const entry = {
                                Sender_Id: Sender_Id,
                                Reciever_Id: Reciever_Id,
                                roomId: roomId,
                                messageCount: 0,
                                timeStamp: time_entered_inchat,
                                time_entered_inchat: time_entered_inchat
                            };
                            userCollection.insertOne(entry)
                                .then(() => {
                                    resolve("Created new entry successfully");
                                })
                                .catch((err) => {
                                    reject(err);
                                });
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
       

    updateEnteredTimeUnreadAdmin: (Sender_Id, Reciever_Id, roomId, time_entered_inchat) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
    
                // Check if there is an entry with Sender_Id and roomId
                userCollection.findOne({ Sender_Id: Sender_Id, Reciever_Id: Reciever_Id, roomId: roomId })
                    .then((result) => {
                        if (result) {
                            // Entry with Sender_Id and roomId exists
                            // Check if time_entered_inchat entry exists
                            if (result.time_entered_inchat) {
                                // Update time_entered_inchat
                                userCollection.updateOne({ Sender_Id: Sender_Id, Reciever_Id: Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
                                    .then(() => {
                                        resolve("Updated time_entered_inchat successfully");
                                    })
                                    .catch((err) => {
                                        reject(err);
                                    });
                            } else {
                                // Insert time_entered_inchat
                                userCollection.updateOne({ Sender_Id: Sender_Id, Reciever_Id: Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
                                    .then(() => {
                                        resolve("Inserted time_entered_inchat successfully");
                                    })
                                    .catch((err) => {
                                        reject(err);
                                    });
                            }
                        } else {
                            // Entry with Sender_Id and roomId doesn't exist, create one
                            const entry = {
                                Sender_Id: Sender_Id,
                                Reciever_Id: Reciever_Id,
                                roomId: roomId,
                                messageCount: 0,
                                timeStamp: time_entered_inchat,
                                time_entered_inchat: time_entered_inchat
                            };
                            userCollection.insertOne(entry)
                                .then(() => {
                                    resolve("Created new entry successfully");
                                })
                                .catch((err) => {
                                    reject(err);
                                });
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },


    getArrayCountAdmin: (Sender_Id, Receiver_Id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK_ADMIN)
                    .findOne({ Sender_Id: Sender_Id })       
                    .then((result) => {
                        if (result && result.inverse_chat && result.inverse_chat.length > 0) {
                            const receiverEntry = result.inverse_chat.find(entry => entry.Reciever_Id === Receiver_Id);
                            if (receiverEntry && receiverEntry.count) {
                                resolve(receiverEntry.count);
                            } else {
                                resolve(0);
                            }
                        } else {
                            resolve(0);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getArrayCount: (Sender_Id, Receiver_Id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK)
                    .findOne({ Sender_Id: Sender_Id })                        
                    .then((result) => {
                        if (result && result.inverse_chat && result.inverse_chat.length > 0) {
                            const receiverEntry = result.inverse_chat.find(entry => entry.Reciever_Id === Receiver_Id);
                            if (receiverEntry && receiverEntry.count) {
                                resolve(receiverEntry.count);
                            } else {
                                resolve(0);
                            }
                        } else {
                            resolve(0);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getExistMessageCountOneChat: (userId, Reciever_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);  // CHECKED
                // Find the entry where Sender_Id matches userId and Reciever_Id matches Reciever_Id
                const result = await userCollection.findOne({ Sender_Id: userId, Reciever_Id: Reciever_Id });
                
                if (result) {
                    resolve(result.messageCount);
                } else {
                    resolve(0);
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    
    
    chatCOUNT: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne({ Sender_Id: userId }).then((messageUI) => {
                    if (!messageUI) {
                        resolve([]);
                        return;
                    }
        
                    const senderId = messageUI.Sender_Id;
                    const senderStorage = messageUI[senderId];
        
                    if (!senderStorage) {
                        resolve([]);
                        return;
                    }
        
                    const result = [];
        
                    Object.keys(senderStorage).forEach(receiverId => {
                        const messages = senderStorage[receiverId];
                        result.push(receiverId);
                    });
        
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    chatCOUNTAdmin: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne({ Sender_Id: userId }).then((messageUI) => {
                    if (!messageUI) {
                        resolve([]);
                        return;
                    }
        
                    const senderId = messageUI.Sender_Id;
                    const senderStorage = messageUI[senderId];
        
                    if (!senderStorage) {
                        resolve([]);
                        return;
                    }
        
                    const result = [];
        
                    Object.keys(senderStorage).forEach(receiverId => {
                        const messages = senderStorage[receiverId];
                        result.push(receiverId);
                    });
        
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getReceivedMessageSendDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK)
                    .findOne({ Sender_Id: userId })                          // ADVANCED
                    .then((result) => {
                        if (result && result.inverse_chat && result.inverse_chat.length > 0) {
                            const receivers = result.inverse_chat.map(item => item.Reciever_Id);
                            resolve(receivers);
                        } else {
                            resolve([]);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },    
    

    getReceivedMessageSendDetailsAdmin: (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK_ADMIN)
                    .findOne({ Sender_Id: userId })                          // ADVANCED
                    .then((result) => {
                        if (result && result.inverse_chat && result.inverse_chat.length > 0) {
                            const receivers = result.inverse_chat.map(item => item.Reciever_Id);
                            resolve(receivers);
                        } else {
                            resolve([]);
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    LastEnteredChatWith: (last_entered_time, Sender_Id) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS);
                userCollection.findOne({ Sender_Id })
                    .then(existingEntry => {
                        if (existingEntry) {
                            if (!existingEntry.last_entered_time) {
                                existingEntry.last_entered_time = last_entered_time;
                            } else {
                                existingEntry.last_entered_time = last_entered_time;
                            }
                            userCollection.updateOne({ Sender_Id }, { $set: { last_entered_time: existingEntry.last_entered_time } })
                                .then(() => resolve(existingEntry))
                                .catch(error => reject(error));
                        } else {
                            const timestamp = last_entered_time;
                            const Send_List = [];
                            const Reciever_List = [];
                            const Send_List_count = 0;
                            const Recieve_List_count = 0;
                            const newEntry = {
                                Sender_Id,
                                timestamp,
                                last_entered_time,
                                Send_List,
                                Reciever_List,
                                Send_List_count,
                                Recieve_List_count
                            };
                            userCollection.insertOne(newEntry)
                                .then(result => resolve(result))
                                .catch(error => reject(error));
                        }
                    })
                    .catch(error => reject(error));
            } catch (error) {
                reject(error);
            }
        });
    },
      

    ChatRoomUpdateOnProfileReturns: (Sender_Id, timestamp, sender_entry) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS);
                userCollection.findOne({ Sender_Id })
                    .then(existingEntry => {
                        if (existingEntry) {
                            const updateFields = { timestamp };
    
                            // Check if Send_List exists
                            if (!existingEntry.Send_List) {
                                updateFields.Send_List = [sender_entry];
                            } else if (!existingEntry.Send_List.includes(sender_entry)) {
                                // Check if sender_entry is not already present in Send_List, then insert it
                                updateFields.Send_List = [...existingEntry.Send_List, sender_entry];
                            }
    
                            // Check if Send_List_count exists, if not, set it to zero
                            if (!existingEntry.Send_List_count) {
                                updateFields.Send_List_count = 0;
                            } else if (!existingEntry.Send_List.includes(sender_entry)) {
                                // Increment Send_List_count by one if sender_entry is included in Send_List
                                updateFields.Send_List_count = existingEntry.Send_List_count + 1;
                            }
    
                            // Check if Reciever_List exists, if not, create an empty array
                            if (!existingEntry.Reciever_List) {
                                updateFields.Reciever_List = [];
                            }
    
                            // Check if Recieve_List_count exists, if not, set it to zero
                            if (!existingEntry.Recieve_List_count) {
                                updateFields.Recieve_List_count = 0;
                            }
    
                            return userCollection.updateOne(
                                { Sender_Id },
                                { $set: updateFields }
                            );
                        } else {
                            // Entry doesn't exist, insert a new one with sender_entry in Send_List
                            const newEntry = {
                                Sender_Id,
                                timestamp,
                                Send_List: [sender_entry],
                                Reciever_List: [],
                                Send_List_count: 1, // Set Send_List_count to one for the new entry
                                Recieve_List_count: 0
                            };
                            return userCollection.insertOne(newEntry);
                        }
                    })
                    .then(result => {
                        // Additional check to ensure Send_List_count matches the number of entries in Send_List
                        return userCollection.findOne({ Sender_Id });
                    })
                    .then(updatedEntry => {
                        if (updatedEntry) {
                            if (updatedEntry.Send_List && updatedEntry.Send_List_count !== updatedEntry.Send_List.length) {
                                // If Send_List_count does not match the number of entries in Send_List, update it
                                return userCollection.updateOne(
                                    { Sender_Id },
                                    { $set: { Send_List_count: updatedEntry.Send_List.length } }
                                );
                            }
                        }
                        return Promise.resolve(); // Resolve if no update needed
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    ChatRoomUpdateOnProfileReturnsAdmin: (Sender_Id, timestamp, sender_entry) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN);
                userCollection.findOne({ Sender_Id })
                    .then(existingEntry => {
                        if (existingEntry) {
                            const updateFields = { timestamp };
    
                            // Check if Send_List exists
                            if (!existingEntry.Send_List) {
                                updateFields.Send_List = [sender_entry];
                            } else if (!existingEntry.Send_List.includes(sender_entry)) {
                                // Check if sender_entry is not already present in Send_List, then insert it
                                updateFields.Send_List = [...existingEntry.Send_List, sender_entry];
                            }
    
                            // Check if Send_List_count exists, if not, set it to zero
                            if (!existingEntry.Send_List_count) {
                                updateFields.Send_List_count = 0;
                            } else if (!existingEntry.Send_List.includes(sender_entry)) {
                                // Increment Send_List_count by one if sender_entry is included in Send_List
                                updateFields.Send_List_count = existingEntry.Send_List_count + 1;
                            }
    
                            // Check if Reciever_List exists, if not, create an empty array
                            if (!existingEntry.Reciever_List) {
                                updateFields.Reciever_List = [];
                            }
    
                            // Check if Recieve_List_count exists, if not, set it to zero
                            if (!existingEntry.Recieve_List_count) {
                                updateFields.Recieve_List_count = 0;
                            }
    
                            return userCollection.updateOne(
                                { Sender_Id },
                                { $set: updateFields }
                            );
                        } else {
                            // Entry doesn't exist, insert a new one with sender_entry in Send_List
                            const newEntry = {
                                Sender_Id,
                                timestamp,
                                Send_List: [sender_entry],
                                Reciever_List: [],
                                Send_List_count: 1, // Set Send_List_count to one for the new entry
                                Recieve_List_count: 0
                            };
                            return userCollection.insertOne(newEntry);
                        }
                    })
                    .then(result => {
                        // Additional check to ensure Send_List_count matches the number of entries in Send_List
                        return userCollection.findOne({ Sender_Id });
                    }) // manually checking whether sender_list_count has same value as number of entries inside sender_list
                    // this manual check is done because there is an error occurring, that is sender_list count is not getting 
                    // incremented when we first enter chat with and then go for direct profile messaging
                    // when entering chatwith first, then a similar entry is generated with empty arrays and entered time to chatwith is marked
                    // after that, increment won't work when we enter individual chat using direct profile
                    .then(updatedEntry => {
                        if (updatedEntry) {
                            if (updatedEntry.Send_List && updatedEntry.Send_List_count !== updatedEntry.Send_List.length) {
                                // If Send_List_count does not match the number of entries in Send_List, update it
                                return userCollection.updateOne(
                                    { Sender_Id },
                                    { $set: { Send_List_count: updatedEntry.Send_List.length } }
                                );
                            }
                        }
                        return Promise.resolve(); // Resolve if no update needed
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
           

    ChatRoomUpdate: (Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS);
                userCollection.findOne({ Sender_Id })
                    .then(existingEntry => {
                        if (existingEntry) {
                            return userCollection.updateOne(
                                { Sender_Id },
                                {
                                    $set: {
                                        timestamp,
                                        Send_List,
                                        Reciever_List,
                                        Send_List_count,
                                        Recieve_List_count
                                    }
                                }
                            );
                        } else {
                            return userCollection.insertOne({
                                Sender_Id,
                                timestamp,
                                Send_List,
                                Reciever_List,
                                Send_List_count,
                                Recieve_List_count
                            });
                        }
                    })
                    .then(result => {
                        resolve(result);
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    ChatRoomUpdateAdmin: (Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN);
                userCollection.findOne({ Sender_Id })
                    .then(existingEntry => {
                        if (existingEntry) {
                            return userCollection.updateOne(
                                { Sender_Id },
                                {
                                    $set: {
                                        timestamp,
                                        Send_List,
                                        Reciever_List,
                                        Send_List_count,
                                        Recieve_List_count
                                    }
                                }
                            );
                        } else {
                            return userCollection.insertOne({
                                Sender_Id,
                                timestamp,
                                Send_List,
                                Reciever_List,
                                Send_List_count,
                                Recieve_List_count
                            });
                        }
                    })
                    .then(result => {
                        resolve(result);
                    })
                    .catch(error => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },    
    

    FetchChatRoomUpdate: async (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
          try {
            const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS);
            const chatDetails = await userCollection.findOne({ Sender_Id });
      
            if (chatDetails) {
              resolve(chatDetails);
            } else {
              const emptyDocument = {
                Send_List: [],
                Reciever_List: [],
                timestamp: new Date() // Current time
              };
              resolve(emptyDocument);
            }
          } catch (error) {
            reject(error);
          }
        });
      },


      FetchChatRoomUpdateAdmin: async (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
          try {
            const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN);
            const chatDetails = await userCollection.findOne({ Sender_Id });
      
            if (chatDetails) {
              resolve(chatDetails);
            } else {
              const emptyDocument = {
                Send_List: [],
                Reciever_List: [],
                timestamp: new Date() // Current time
              };
              resolve(emptyDocument);
            }
          } catch (error) {
            reject(error);
          }
        });
      },


      FetchupdateTimeUnread: (Reciever_Id, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION); // CHECKED
                // TIME_UNREAD_COLLECTION is used to store details when leaving individual
                const result = await userCollection.find({ Reciever_Id: { $in: Reciever_Id }, Sender_Id: userId }).toArray();
    
                if (result.length === 0) {
                    resolve([]);
                } else {
                    const matchedEntries = result.map(entry => ({
                        _id: entry.roomId,
                        timeStamp: entry.timeStamp,
                        messageCount: entry.messageCount
                    }));
    
                    resolve(matchedEntries);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    FetchupdateTimeUnreadAdmin: (Existing_Reciever_List, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
                // TIME_UNREAD_COLLECTION is used to store details when leaving individual
                const result = await userCollection.find({ Reciever_Id: { $in: Existing_Reciever_List }, Sender_Id: userId }).toArray();
    
                if (result.length === 0) {
                    resolve([]);
                } else {
                    const matchedEntries = result.map(entry => ({
                        _id: entry.roomId,
                        timeStamp: entry.timeStamp,
                        messageCount: entry.messageCount
                    }));
    
                    resolve(matchedEntries);
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    

    GetExistingAdminIndiMessCount: (Sender_ID, Reciever_ID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
                // TIME_UNREAD_COLLECTION_ADMIN is used to store details when leaving admin chat
                const result = await userCollection.findOne({ Sender_Id: Sender_ID, Reciever_Id: Reciever_ID });
                if (result) {
                    resolve(result.messageCount);
                } else {
                    resolve(0);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    FetchupdateTimeUnreadSeen: (roomIdCollection, Send_List) => {
        return new Promise(async (resolve, reject) => {
            try {
                let lastSeen = [];
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);  // CHECKED
                const result = await userCollection.find({ roomId: { $in: roomIdCollection }, Sender_Id: { $in: Send_List } }).toArray();
    
                if (result.length === 0) {
                    resolve(lastSeen);
                } else {
                    roomIdCollection.forEach(roomId => {
                        const matchedEntries = result.filter(entry => entry.roomId === roomId && Send_List.includes(entry.Sender_Id));
                        matchedEntries.forEach(entry => {
                            lastSeen.push({
                                _id: entry.roomId,
                                timeStamp: entry.timeStamp,
                                messageCount: entry.messageCount,
                                time_entered_inchat: entry.time_entered_inchat
                            });
                        });
                    });
                    resolve(lastSeen);
                }
            } catch (error) {
                reject(error);
            }
        });
    },
        

    FetchupdateTimeLastSeen: (roomId, SenderId) => { // USED IN ONE ON ONE CHAT. RESOLVE LAST SEEN IN A CHAT
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);  // CHECKED
    
                const query = { roomId: roomId, Sender_Id: SenderId };
                const result = await userCollection.findOne(query);
    
                if (result && result.timeStamp) {
                    resolve(result.timeStamp);
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    }, 


    fetchDoubleTickTime: (Send_List) => {
        return new Promise(async (resolve, reject) => {
            let resultArray = []
            try {
                const userCollection = db.getDb().collection(collection.ONE_CHAT_FIRST_CHAT_DETAILS);    
                // ONE_CHAT_FIRST_CHAT_DETAILS is used when leaving chatwith
                const matchingEntries = await userCollection.find({
                    "Sender_Id": { $in: Send_List },
                }).toArray();
                resultArray = matchingEntries.map(entry => ({
                    Sender_Id: entry.Sender_Id,
                    timestamp: entry.timestamp,
                    last_entered_time: entry.last_entered_time
                }));
                resolve(resultArray);
            } catch (error) {
                reject(error);
            }
        });
    },


    EnterAdminMessageOne: (myID, entered_timeStamp) => {
        return new Promise((resolve, reject) => {
            try {
                const adminMessageEntryCollection = db.getDb().collection(collection.ADMIN_CHAT_ENTRY_HISTORY);

                // Check if there's an entry with Sender_Id same as myID
                adminMessageEntryCollection.findOne({ Sender_Id: myID })
                    .then((entry) => {
                        if (entry) {
                            // If entry exists, check if entered_timeStamp field is present
                            if (!entry.entered_timeStamp) {
                                // If entered_timeStamp not present, create and set the value
                                adminMessageEntryCollection.updateOne({ _id: entry._id }, { $set: { entered_timeStamp } })
                                    .then(() => resolve("entered_timeStamp field created and set"))
                                    .catch((error) => reject(error));
                            } else {
                                // If entered_timeStamp already present, update the value
                                adminMessageEntryCollection.updateOne({ _id: entry._id }, { $set: { entered_timeStamp } })
                                    .then(() => resolve("entered_timeStamp field updated"))
                                    .catch((error) => reject(error));
                            }
                        } else {
                            // If entry with Sender_Id same as myID is not present, create one
                            adminMessageEntryCollection.insertOne({ Sender_Id: myID, entered_timeStamp })
                                .then(() => resolve("New entry created with entered_timeStamp"))
                                .catch((error) => reject(error));
                        }
                    })
                    .catch((error) => reject(error));
            } catch (error) {
                reject(error);
            }
        });
    },
    

    LeaveAdminMessageOne: (myID, leaved_timeStamp,LeavedCount) => {
        return new Promise((resolve, reject) => {
            try {
                const adminMessageEntryCollection = db.getDb().collection(collection.ADMIN_CHAT_ENTRY_HISTORY);
    
                // Check if there's an entry with Sender_Id same as myID
                adminMessageEntryCollection.findOne({ Sender_Id: myID })
                    .then((entry) => {
                        if (entry) {
                            // If entry exists, check if leaved_timeStamp field is present
                            if (!entry.leaved_timeStamp || !entry.LeavedCount) {
                                // If leaved_timeStamp not present, create and set the value
                                adminMessageEntryCollection.updateOne({ _id: entry._id }, { $set: { leaved_timeStamp, LeavedCount} })
                                    .then(() => resolve())
                                    .catch((error) => reject(error));
                            } else {
                                // If leaved_timeStamp already present, update the value
                                adminMessageEntryCollection.updateOne({ _id: entry._id }, { $set: { leaved_timeStamp, LeavedCount} })
                                    .then(() => resolve())
                                    .catch((error) => reject(error));
                            }
                        } else {
                            // If entry with Sender_Id same as myID is not present, create one
                            adminMessageEntryCollection.insertOne({ Sender_Id: myID, leaved_timeStamp,LeavedCount })
                                .then(() => resolve())
                                .catch((error) => reject(error));
                        }
                    })
                    .catch((error) => reject(error));
            } catch (error) {
                reject(error);
            }
        });
    },
        
    
    fetchAdminBroadcastEntryDetailsBySenderID: (Sender_Id) => {
        return new Promise((resolve, reject) => {
            try {
                const adminMessageEntryCollection = db.getDb().collection(collection.ADMIN_CHAT_ENTRY_HISTORY);
    
                adminMessageEntryCollection.findOne({ Sender_Id })
                    .then((entry) => {
                        if (entry) {
                            resolve(entry);
                        } else {
                            resolve([]); // Return empty array if no entry found
                        }
                    })
                    .catch((error) => reject(error));
            } catch (error) {
                reject(error);
            }
        });
    },
    

    GetUserThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                // Escape special characters in the Name string
                const escapeRegExp = (string) => {
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
                const escapedName = escapeRegExp(Name);
                const regexPattern = new RegExp(escapedName, 'i');
    
                const cursor = userCollection.find({ Name: { $regex: regexPattern } });
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        employementStatus: user.employmentStatus
                    });
                });
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },
    

    GetUserPassoutThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                // Function to escape special characters in the Name string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
    
                // Escape the Name string
                const escapedName = escapeRegExp(Name);
                // Create a case-insensitive regex pattern with the escaped Name
                const regexPattern = new RegExp(escapedName, 'i');
    
                // Find users where passoutYear matches the regex pattern
                const cursor = userCollection.find({ passoutYear: { $regex: regexPattern } });
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        passoutYear: user.passoutYear,
                        employementStatus: user.employmentStatus
                    });
                });
    
                // Resolve the promise with the user details
                resolve(userNamesDetails);
            } catch (error) {
                // Reject the promise if there's an error
                reject(error);
            }
        });
    },    


    GetUserLocationThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
        
                // Function to escape special characters in the Name string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
        
                // Escape the Name string
                const escapedName = escapeRegExp(Name);
                // Create a case-insensitive regex pattern with the escaped Name
                const regexPattern = new RegExp(escapedName, 'i');
                const modifiedRegexPattern = new RegExp(escapedName.replace(/\s+/g, '\\s*'), 'i');
        
                // Use $or operator to search using both regex patterns
                const cursor = userCollection.find({ $or: [
                    { currentLocation: { $regex: regexPattern } },
                    { currentLocation: { $regex: modifiedRegexPattern } }
                ]});
        
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        currentLocation: user.currentLocation,
                        employementStatus: user.employmentStatus
                    });
                });
        
                // Resolve the promise with the user details
                resolve(userNamesDetails);
            } catch (error) {
                // Reject the promise if there's an error
                reject(error);
            }
        });
    },
    
    

    GetUserDomainThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
        
                // Function to escape special characters in the Name string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
        
                // Escape the Name string
                const escapedName = escapeRegExp(Name);
                // Create a case-insensitive regex pattern with the escaped Name
                const regexPattern = new RegExp(escapedName, 'i');
        
                // Find users where workDomains matches the regex pattern
                const cursor = userCollection.find({ workDomains: { $regex: regexPattern } });
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();                   
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        employementStatus: user.employmentStatus
                    });
                });
        
                // Resolve the promise with the user details
                resolve(userNamesDetails);
            } catch (error) {
                // Reject the promise if there's an error
                reject(error);
            }
        });
    },
        
    
    GetFilteredUsersThroughSearch: (filter) => {
        return new Promise(async (resolve, reject) => {
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                let query = {
                    Status: { $in: ["Student", "Alumni"] }
                };
    
                // Function to escape special characters in a string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
    
                if (filter.searchPassout && filter.searchPassout !== '') {
                    query.passoutYear = filter.searchPassout;
                }
    
                if (filter.searchAdmissionYear && filter.searchAdmissionYear !== '') {
                    query.AdmissionYear = filter.searchAdmissionYear;
                }
    
                if (filter.Branch && filter.Branch !== '') {
                    query.Branch = filter.Branch;
                }
    
                if (filter.searchLocation && filter.searchLocation !== '') {
                    // Escape the searchLocation string
                    const escapedLocation = escapeRegExp(filter.searchLocation);
                    // Construct a regex pattern with the escaped searchLocation
                    const regexLocation = new RegExp(escapedLocation, 'i');
                    query.currentLocation = { $regex: regexLocation };
                }
    
                if (filter.searchDomain && filter.searchDomain !== '') {
                    // Escape the searchDomain string
                    const escapedDomain = escapeRegExp(filter.searchDomain);
                    // Construct a regex pattern with the escaped searchDomain
                    const regexDomain = new RegExp(escapedDomain, 'i');
                    query.workDomains = { $regex: regexDomain };
                }
    
                const cursor = userCollection.find(query);
    
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        currentLocation: user.currentLocation,
                        passoutYear: user.passoutYear,
                        Status: user.Status,
                        Branch: user.Branch,
                        AdmissionYear: user.AdmissionYear,
                        employementStatus: user.employmentStatus
                    });
                });
    
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },


    putJobRecomendationRequest: (user, job) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobId = new objectId(job);
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
        
                // Find the job by ID
                const existingJob = await jobCollection.findOne({ _id: jobId });
                if (!existingJob) {
                    reject("Job not found");
                    return;
                }
        
                let userAdded = false;
                let userRemoved = false;
        
                // Check if the job already has a requests array
                if (!existingJob.requests) {
                    // If no requests array, create a new one and insert the user
                    existingJob.requests = [user];
                    userAdded = true;
                } else {
                    const userIndex = existingJob.requests.indexOf(user);
                    if (userIndex === -1) {
                        // User is not in the requests array, insert the user
                        existingJob.requests.push(user);
                        userAdded = true;
                    } else {
                        // User is already in the requests array, remove the user
                        existingJob.requests.splice(userIndex, 1);
                        userRemoved = true;
                    }
                }
    
                // Handle the request_count_unviewed logic
                if (userAdded) {
                    if (!existingJob.request_count_unviewed) {
                        // If request_count_unviewed does not exist, create it and set to 1
                        existingJob.request_count_unviewed = 1;
                    } else {
                        // If it exists, increment its value by 1
                        existingJob.request_count_unviewed += 1;
                    }
                } else if (userRemoved) {
                    if (existingJob.request_count_unviewed) {
                        // If request_count_unviewed exists, decrement its value
                        existingJob.request_count_unviewed -= 1;
                    }
                }
    
                // Update the job document in the collection
                await jobCollection.updateOne(
                    { _id: jobId },
                    {
                        $set: {
                            requests: existingJob.requests,
                            request_count_unviewed: existingJob.request_count_unviewed
                        }
                    }
                );
    
                // Resolve the promise with the userAdded value
                resolve({ userAdded });
            } catch (error) {
                reject(error);
            }
        });
    },    


    getJobOwnerFromJob: async (jobId) => {
        try {
            const dbInstance = db.getDb();
            const result = await dbInstance.collection(collection.JOB_COLLECTION).findOne(
                { _id: new objectId(jobId) }
            );
            if (result) {
                return result.UserId; 
            } else {
                throw new Error('Job not found');
            }
        } catch (error) {
            throw new Error(error);
        }
    },
    

    putJobRecomendationScore: (jobId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobIdObj = new objectId(jobId);
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
        
                // Find the job by ID
                const existingJob = await jobCollection.findOne({ _id: jobIdObj });
                if (!existingJob) {
                    reject("Job not found");
                    return;
                }
        
                // Check if the job has a requests array
                if (!existingJob.requests || existingJob.requests.length === 0) {
                    // No users have requested this job, resolve with an empty array
                    resolve([]);
                    return;
                }
        
                // Fetch job details
                const jobDescription = existingJob.jobDescription || '';
                const eligibility = existingJob.Eligibility || '';
                const jobRole = existingJob.Jobrole || '';
        
                // Fetch users who have requested this job
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const requestedUsers = await userCollection.find({ _id: { $in: existingJob.requests.map(req => new objectId(req)) } }).toArray();
        
                // Calculate scores for each user based on detailed word comparison
                const scoredUsers = requestedUsers.map(user => {
                    const userScore = {
                        _id: user._id,
                        score: 0
                    };
        
                    // Combine all words from workDomains and experience descriptions into a single array
                    const userWords = [];
                    if (user.workDomains && Array.isArray(user.workDomains)) {
                        user.workDomains.forEach(domain => {
                            userWords.push(...domain.split(' '));
                        });
                    }
                    if (user.experience && Array.isArray(user.experience)) {
                        user.experience.forEach(exp => {
                            if (exp.description) {
                                userWords.push(...exp.description.split(' '));
                            }
                        });
                    }    
    
                    // Remove empty strings from userWords
                    const cleanedUserWords = userWords.filter(word => word.trim() !== '');
    
                    // Compare cleanedUserWords array with job details (case-insensitive)
                    cleanedUserWords.forEach(word => {
                        const cleanedWord = word.toLowerCase();
                        if (jobDescription.toLowerCase().includes(cleanedWord) || 
                            eligibility.toLowerCase().includes(cleanedWord) || 
                            jobRole.toLowerCase().includes(cleanedWord)) {
                            userScore.score += 1;
                        }
                    });
        
                    return userScore;
                });
        
                // Sort users based on scores in descending order
                scoredUsers.sort((a, b) => b.score - a.score);    
                resolve(scoredUsers);
            } catch (error) {
                reject(error);
            }
        });
    },    


    getuserDetailsForrequest: (users) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                
                const userIds = users.map(user => user._id);
        
                userCollection.find({ _id: { $in: userIds } }, { projection: { Name: 1, Status: 1 } }).toArray()
                    .then(userDetails => {
                        const usersWithDetails = users.map(user => {
                            const foundUser = userDetails.find(detail => detail._id.equals(user._id));
                            if (foundUser) {
                                return {
                                    _id: user._id,
                                    score: user.score,
                                    Name: foundUser.Name,
                                    Status: foundUser.Status
                                };
                            }
                            return null;
                        });
        
                        const filteredUsers = usersWithDetails.filter(user => user !== null);
                        resolve(filteredUsers);
                    })
                    .catch(err => {
                        reject("Error fetching user details");
                    });
            } catch (error) {
                reject("Internal server error");
            }
        });
    },


    setRequestViewForNotificationToNull: (job) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobId = new objectId(job);
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
                // Find the job by ID
                const existingJob = await jobCollection.findOne({ _id: jobId });
                if (!existingJob) {
                    reject("Job not found");
                    return;
                }
    
                // Check for the request_count_unviewed variable
                if (existingJob.request_count_unviewed !== undefined) {
                    // Set request_count_unviewed to zero
                    await jobCollection.updateOne({ _id: jobId }, { $set: { request_count_unviewed: 0 } });
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },  
    
    
    setlastRequestNotificationSended: (job) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobId = new objectId(job);
                const current_time = new Date();
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
                // Find the job by ID
                const existingJob = await jobCollection.findOne({ _id: jobId });
                if (!existingJob) {
                    reject("Job not found");
                    return;
                }
    
                // Set or create the last_job_request_view_notification_send variable
                await jobCollection.updateOne(
                    { _id: jobId },
                    { $set: { last_job_request_view_notification_send: current_time } }
                );
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }, 
    
    
    getlastRequestNotificationSended: (job) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobId = new objectId(job);
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
                // Find the job by ID
                const existingJob = await jobCollection.findOne({ _id: jobId });
                if (!existingJob) {
                    reject("Job not found");
                    return;
                }
    
                // Check for the last_job_request_view_notification_send variable
                if (existingJob.last_job_request_view_notification_send !== undefined) {
                    // Resolve with the value of last_job_request_view_notification_send
                    resolve(existingJob.last_job_request_view_notification_send);
                } else {
                    // If not found, resolve with null
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },    

    getRequestViewForNotification: (job) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobId = new objectId(job);
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
                // Find the job by ID
                const existingJob = await jobCollection.findOne({ _id: jobId });
                if (!existingJob) {
                    reject("Job not found");
                    return;
                }
    
                // Check for the request_count_unviewed variable
                if (existingJob.request_count_unviewed !== undefined) {
                    // Resolve with the value of request_count_unviewed
                    resolve(existingJob.request_count_unviewed);
                } else {
                    // If not found, resolve with 0
                    resolve(0);
                }
            } catch (error) {
                reject(error);
            }
        });
    },    


    searchMentor: (mentorkeyword) => {
        function convertToString(value) {
            if (typeof value === 'string') {
                return value;
            } else if (typeof value === 'object' && value !== null) {
                const searchString = value.searchName || '';
                return searchString.toString();
            } else if (value !== undefined && value !== null) {
                return value.toString();
            } else {
                return '';
            }
        }
    
        return new Promise((resolve, reject) => {
            try {
                mentorkeyword = convertToString(mentorkeyword);
    
                const escapeRegExp = (string) => {
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                };
    
                const escapedMentorkeyword = escapeRegExp(mentorkeyword);
                const keywords = escapedMentorkeyword.split(/\s+/);
    
                const pipeline = [
                    {
                        $addFields: {
                            matchedWords: {
                                $size: {
                                    $setIntersection: [
                                        keywords,
                                        { $split: [{ $toString: { $ifNull: ["$questionInput", ""] } }, ' '] },
                                        {
                                            $reduce: {
                                                input: { $ifNull: ["$replies", []] },
                                                initialValue: [],
                                                in: {
                                                    $concatArrays: [
                                                        '$$value',
                                                        { $split: [{ $toString: { $ifNull: ["$$this.questionInput", ""] } }, ' '] }
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $match: {
                            $or: [
                                { questionInput: { $regex: new RegExp(keywords.join('|'), 'i') } },
                                { 'replies.questionInput': { $regex: new RegExp(keywords.join('|'), 'i') } }
                            ]
                        }
                    },
                    { $sort: { matchedWords: -1 } }
                ];
    
                db.getDb().collection(collection.MENTOR_COLLECTION).aggregate(pipeline).toArray()
                    .then((mentors) => {
                        resolve(mentors);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                reject("Internal server error");
            }
        });
    },    
    

    InsertDeletionIdReasonAccountUser: (user_id, reason) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date();
                const deletionEntry = { reason: reason, time: currentTime };
    
                db.getDb().collection(collection.ACCOUNT_DISABLE_USER_LOGS).findOne(
                    { user_id: user_id }
                ).then((existingEntry) => {
                    if (existingEntry) {
                        // User entry already exists, update the delete_log array
                        db.getDb().collection(collection.ACCOUNT_DISABLE_USER_LOGS).updateOne(
                            { user_id: user_id },
                            { $push: { delete_log: deletionEntry } }
                        ).then(() => {
                            resolve(existingEntry); // Return the existing entry
                        }).catch((error) => {
                            reject(error);
                        });
                    } else {
                        // User entry doesn't exist, create a new entry
                        const newEntry = { user_id: user_id, delete_log: [deletionEntry] };
                        db.getDb().collection(collection.ACCOUNT_DISABLE_USER_LOGS).insertOne(newEntry).then(() => {
                            resolve(newEntry); // Return the newly created entry
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject("Internal server error");
            }
        });
    },


    markDeletion: (user_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOneAndUpdate(
                    { _id: new objectId(user_id) }, // Find the entry with matching user_id
                    { $set: { activeStatus: 'inactive' } }, // Set activeStatus as 'inactive'
                    { upsert: true, returnOriginal: false }
                ).then((result) => {
                    // Check if the activeStatus is set to 'inactive' in the updated or newly created entry
                    const inactivityStatus = result.value && result.value.activeStatus === 'inactive';
                    resolve(inactivityStatus); // Resolve with the inactivity status
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject("Internal server error");
            }
        });
    },
    

    ReactivateUserAccount: (user_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOneAndUpdate(
                    { _id: new objectId(user_id) },
                    { $set: { activeStatus: 'active' } },
                    { returnOriginal: false }
                ).then(() => {
                    resolve({ status_change_activated: true });
                }).catch((error) => {
                    console.error("Error updating user account:", error);
                    reject(error);
                });
            } catch (error) {
                console.error("Internal server error:", error);
                reject("Internal server error");
            }
        });
    },
    


    GetUserThroughSearchID: (userId) => {                             // FUTUREMARK   STARMARK
        return new Promise(async (resolve, reject) => {
            try {
                let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
                resolve(profile);
            } catch (error) {
                console.error("Error fetching user profile:", error);
                reject("Error fetching user profile");
            }
        });
    },
    

    sendReportData: (user_id, reported_id, report_reason, user_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                const reportcollection = db.getDb().collection(collection.USER_REPORTS_REPORTED);
                const formattedTimestamp = new Date().toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });                    // Update admin_opened_time with current time if entry found

                const reportEntry = {
                    reporter_id: user_id,  
                    Name_IN: user_name,          // renamed from user_id to reporter_id
                    reported_id: reported_id,        // reported_id remains the same
                    report_reason: report_reason,    // report_reason remains the same
                    timeStamp: new Date(),     // current time
                    reported_time: formattedTimestamp,
                    admin_opened_time: ""
                };
    
                const result = await reportcollection.insertOne(reportEntry); // Insert as a new document
    
                resolve({ sended_report: true });
            } catch (error) {
                console.error("Error sending report data:", error);
                reject("Error sending report data");
            }
        });
    },    
    

    sendBlockData: (user_id, blocked_id, block_reason) => {
        return new Promise(async (resolve, reject) => {
            try {
                const blockcollection = db.getDb().collection(collection.USER_BLOCKS_LOGS);
                let profile = await blockcollection.findOne({ user_id: user_id });
    
                if (!profile) {
                    profile = {
                        user_id: user_id,
                        blocks: []
                    };
                }
    
                if (!profile.blocks) {
                    profile.blocks = [];
                }
    
                profile.blocks.push({
                    blocked_id: blocked_id,
                    block_reason: block_reason,
                    blocked_time: new Date()
                });
    
                const result = await blockcollection.updateOne({ user_id: user_id }, { $set: profile }, { upsert: true });
                resolve(result);
            } catch (error) {
                console.error("Error sending block data:", error);
                reject("Error sending block data");
            }
        });
    },
    

    getindiBlockLogData: (user_id) => {
        return new Promise(async (resolve, reject) => {
            const blockcollection = db.getDb().collection(collection.USER_BLOCKS_LOGS);
            
            try {
                const result = await blockcollection.findOne({ user_id: user_id });
                if (result) {
                    const blockedIds = result.blocks.map(block => block.blocked_id);
                    resolve(blockedIds);
                } else {
                    resolve([]);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getBlockedByUsers: (user_id) => {
        return new Promise(async (resolve, reject) => {
            const blockcollection = db.getDb().collection(collection.USER_BLOCKS_LOGS);
            
            try {
                const result = await blockcollection.find({ "blocks.blocked_id": user_id }).toArray();
                if (result.length > 0) {
                    const blockedByUsers = result.map(entry => entry.user_id);
                    resolve(blockedByUsers);
                } else {
                    resolve([]);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getUserDetailsFromBlockArray: (usersAll) => {
        return new Promise(async (resolve, reject) => {
            try {
                const blockcollection = db.getDb().collection(collection.USER_COLLECTION);
                const userObjects = await blockcollection.find({ _id: { $in: usersAll.map(id => new objectId(id)) } }).toArray();
                
                const userDetails = userObjects.map(user => ({
                    id: user._id.toString(),
                    Name: user.Name,
                    Status: user.Status
                }));

                resolve(userDetails);
            } catch (error) {
                reject(error);
            }
        });
    },


    RemoveBlock: (view, user_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const blockCollection = db.getDb().collection(collection.USER_BLOCKS_LOGS);
                const unblockCollection = db.getDb().collection(collection.UNBLOCK_BLOCK_LOG);

                // Check if there is an entry with user_id in USER_BLOCKS_LOGS
                const userBlocks = await blockCollection.findOne({ user_id });
                if (!userBlocks || !userBlocks.blocks || userBlocks.blocks.length === 0) {
                    // If no entry with user_id or no blocks array, do nothing
                    resolve();
                    return;
                }
                // Find the block entry with blocked_id same as view parameter
                const blockIndex = userBlocks.blocks.findIndex(block => block.blocked_id === view);
                if (blockIndex === -1) {
                    // If no block entry found with view as blocked_id, do nothing
                    resolve();
                    return;
                }
                // Copy the block entry before removing
                const unblockData = userBlocks.blocks[blockIndex];
                // Remove the block entry from the blocks array
                userBlocks.blocks.splice(blockIndex, 1);
                // Update USER_BLOCKS_LOGS collection with the modified blocks array
                await blockCollection.updateOne({ user_id }, { $set: { blocks: userBlocks.blocks } });
                // Prepare data for UNBLOCK_BLOCK_LOG collection
                const unblockEntry = {
                    blocked_id: unblockData.blocked_id,
                    block_reason: unblockData.block_reason,
                    blocked_time: unblockData.blocked_time,
                    unblocked_time: new Date() // Current time
                };
                // Check if there is an entry in UNBLOCK_BLOCK_LOG with the same user_id
                const existingUnblockEntry = await unblockCollection.findOne({ user_id: user_id });
                if (existingUnblockEntry && existingUnblockEntry.unblocks) {
                    // If there is an existing entry with unblocks array, push the unblock entry
                    await unblockCollection.updateOne(
                        { user_id: user_id },
                        { $push: { unblocks: unblockEntry } }
                    );
                } else {
                    // If no existing entry, create a new one with unblocks array
                    await unblockCollection.insertOne({ user_id: user_id, unblocks: [unblockEntry] });
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    addaskImages: (insertedAskId, askNames) => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await db.getDb().collection(collection.ADMIN_ASK_QUESTION).updateOne(
                    { _id: new objectId(insertedAskId) },
                    { $set: { ImageNames: askNames } }
                );
                resolve();
            } catch (error) {
                console.error("Error adding ask images:", error);
                reject("Error adding ask images");
            }
        });
    },    


    addaskVideos: (insertedAskId, askNames) => {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await db.getDb().collection(collection.ADMIN_ASK_QUESTION).updateOne(
                    { _id: new objectId(insertedAskId) },
                    { $set: { VideoNames: askNames } }
                );
                resolve();
            } catch (error) {
                console.error("Error adding ask videos:", error);
                reject("Error adding ask videos");
            }
        });
    },    


    addAskedAdmin: (askData,Name_IN,user_id, timestamp, timeStamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postDocument = {
                    ...askData,
                    Name_IN,
                    user_id,
                    timestamp: timestamp,
                    timeStamp: timeStamp
                };

                const result = await db.getDb().collection(collection.ADMIN_ASK_QUESTION).insertOne(postDocument);
                const insertedAskId = result.insertedId;
                resolve(insertedAskId);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAdminID: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const admin = await db.getDb().collection(collection.ADMIN_COLLECTION).findOne();
                if (admin) {
                    resolve(admin._id);
                } else {
                    reject(new Error("Admin not found"));
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getBaseAdmin: () => {
        return new Promise((resolve, reject) => {
            try {
                const adminCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
                adminCollection.findOne({}, { projection: { Name: 1, _id: 1 } }).then((admin) => {
                    if (admin) {
                        resolve({ Name: admin.Name, id: admin._id });
                    } else {
                        reject(new Error("Admin not found"));
                    }
                }).catch((err) => {
                    reject(err); // Catch MongoDB errors
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },


    getBaseAdminMail: () => {
        return new Promise((resolve, reject) => {
            try {
                const adminCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
                adminCollection.findOne({}, { projection: { Email: 1} }).then((admin) => {
                    if (admin) {
                        resolve({ Email: admin.Email});
                    } else {
                        reject(new Error("Admin not found"));
                    }
                }).catch((err) => {
                    reject(err); // Catch MongoDB errors
                });
            } catch (error) {
                console.error("Error:", error);
                reject(error); // Catch synchronous errors
            }
        });
    },
    




//     NOTIFICATION  


    updateTimeOnleaveGroupchat: (Sender_Id, timestamp,messageCount) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                const query = { _id: new objectId(Sender_Id) };
                const update = { $set: { last_groupchat_visited: timestamp,last_groupchat_count: messageCount } };
                const options = { upsert: true };

                await userCollection.updateOne(query, update, options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    updateTimeOnleaveJobPortal: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                const query = { _id: new objectId(Sender_Id) };
                const update = { $set: { last_jobportal_visited: timestamp } };
                const options = { upsert: true };

                await userCollection.updateOne(query, update, options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    updateTimeOnleaveInternshipPortal: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                //const ObjectId = require('mongodb').ObjectId;
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                const query = { _id: new objectId(Sender_Id) };
                const update = { $set: { last_internshipportal_visited: timestamp } };
                const options = { upsert: true };

                await userCollection.updateOne(query, update, options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    updateTimeOnleaveOwnPosts: (Sender_Id, timestamp, postsData) => { 
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                
                // Update last_ownposts_visited in USER_COLLECTION
                const userQuery = { _id: new objectId(Sender_Id) };
                const userUpdate = { $set: { last_ownposts_visited: timestamp } };
                const userOptions = { upsert: true };
                await userCollection.updateOne(userQuery, userUpdate, userOptions);

                // Update LastLeavedLikeCount in POST_COLLECTION for each post in postsData
                for (const postData of postsData) {
                    const postId = new objectId(postData.postId);
                    const likeCount = postData.likeCount;
                    const commentCount = postData.commentCount

                    const postQuery = { _id: postId };
                    const postUpdate = { $set: { LastLeavedLikeCount: likeCount, LastLeavedCommentCount: commentCount} };
                    const postOptions = { upsert: true };
                    await postCollection.updateOne(postQuery, postUpdate, postOptions);
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    updateTimeOnleaveOtherPosts: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                //const ObjectId = require('mongodb').ObjectId;
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                const query = { _id: new objectId(Sender_Id) };
                const update = { $set: { last_otherposts_visited: timestamp } };
                const options = { upsert: true };

                await userCollection.updateOne(query, update, options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    updateTimeOnleaveMentorshipPortal: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                //const ObjectId = require('mongodb').ObjectId;
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                const query = { _id: new objectId(Sender_Id) };
                const update = { $set: { last_mentorportal_visited: timestamp } };
                const options = { upsert: true };

                await userCollection.updateOne(query, update, options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    updateTimeOnleaveViewProfileviewers: (Sender_Id, timestamp,existing_view_count) => {
        return new Promise(async (resolve, reject) => {
            try {
                //const ObjectId = require('mongodb').ObjectId;
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                const query = { _id: new objectId(Sender_Id) };
                const update = { $set: { last_viewProfileViewers_visited: timestamp,
                                last_viewProfileViewers_visited_count : parseInt(existing_view_count) } };
                const options = { upsert: true };

                await userCollection.updateOne(query, update, options);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewJobNotification: (Sender_Id, timeStamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);

                // Find the user based on Sender_Id
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });
                if (!user) {
                    throw new Error('User not found');
                }

                let job_count = 0;
                // Check if the user has last_jobportal_visited field
                if (user.last_jobportal_visited) {
                    const lastVisitedTime = new Date(user.last_jobportal_visited);
                    // Find jobs newer than last visited time and less than or equal to timeStamp
                    job_count = await jobCollection.countDocuments({
                        timestamp: { $gt: lastVisitedTime, $lte: new Date(timeStamp) }
                    });
                } else {
                    // If last_jobportal_visited field is not present, count all jobs in JOB_COLLECTION
                    job_count = await jobCollection.countDocuments();
                }

                resolve(job_count);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewInternsNotification: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const internCollection = db.getDb().collection(collection.INTERN_COLLECTION);

                // Find the user based on Sender_Id
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });
                if (!user) {
                    throw new Error('User not found');
                }

                let intern_count = 0;
                // Check if the user has last_internshipportal_visited field
                if (user.last_internshipportal_visited) {
                    const lastVisitedTime = new Date(user.last_internshipportal_visited);
                    // Find interns newer than last visited time and less than or equal to timestamp
                    intern_count = await internCollection.countDocuments({
                        timestamp: { $gt: lastVisitedTime, $lte: new Date(timestamp) }
                    });
                } else {
                    // If last_internshipportal_visited field is not present, count all interns in INTERN_COLLECTION
                    intern_count = await internCollection.countDocuments();
                }

                resolve(intern_count);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewGroupchatNotification: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const groupCollection = db.getDb().collection(collection.GROUP_CHAT_COLLECTION);
                const totalEntries = await groupCollection.countDocuments();

                resolve(totalEntries);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewOwnpostLikeNotification: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const posts = await postCollection.find({ UserId: Sender_Id }).toArray();
                const notifications = posts.map(post => {
                    const notification = {
                        _id: (post._id).toString(),
                        likeCount: post.LastLeavedLikeCount || 0, // If LastLeavedLikeCount is not present, default to 0
                        commentCount: post.LastLeavedCommentCount || 0
                    };
                    return notification;
                });
                resolve(notifications);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewCurrentOwnpostLikeNotification: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                const posts = await postCollection.find({ UserId: Sender_Id }).toArray();
                const notifications = posts.map(post => {
                    let likeCount = 0; // Initialize likeCount to 0
                    let commentCount = 0;
                    if (post.likes && Array.isArray(post.likes)) {
                        likeCount = post.likes.length; // Get the count of likes if likes array is present
                    }
                    if (post.comments && Array.isArray(post.comments)) {
                        commentCount = post.comments.length; 
                    }
                    const notification = {
                        _id: (post._id).toString(),
                        likeCount: likeCount, // Return the likeCount in the notification
                        commentCount: commentCount
                    };
                    return notification;
                });
                resolve(notifications);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewOtherpostUpdateNotification: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);

                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });
                if (!user) {
                    throw new Error('User not found');
                }

                let post_count = 0;
                // Check if the user has last_otherposts_visited field
                if (user.last_otherposts_visited) {
                    const lastVisitedTime = new Date(user.last_otherposts_visited);
                    // Find mentors newer than last visited time and less than or equal to timestamp
                    post_count = await postCollection.countDocuments({
                        timestamp: { $gt: lastVisitedTime, $lte: new Date(timestamp) }
                    });
                } else {
                    // If last_otherposts_visited field is not present, count all mentors in POST_COLLECTION
                    post_count = await postCollection.countDocuments();
                }

                resolve(post_count);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllNewMentorNotification: (Sender_Id, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);

                // Find the user based on Sender_Id
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });
                if (!user) {
                    throw new Error('User not found');
                }

                let mentor_count = 0;
                // Check if the user has last_mentorportal_visited field
                if (user.last_mentorportal_visited) {
                    const lastVisitedTime = new Date(user.last_mentorportal_visited);
                    // Find mentors newer than last visited time and less than or equal to timestamp
                    mentor_count = await mentorCollection.countDocuments({
                        timestamp: { $gt: lastVisitedTime, $lte: new Date(timestamp) }
                    });
                } else {
                    // If last_mentorportal_visited field is not present, count all mentors in MENTOR_COLLECTION
                    mentor_count = await mentorCollection.countDocuments();
                }

                resolve(mentor_count);
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllReceivedMessage: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const rec_chat = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK);
                const chatEntry = await rec_chat.findOne({ Sender_Id });

                if (!chatEntry || !chatEntry.inverse_chat) {
                    resolve([]); // Return empty array if entry or inverse_chat array is not found
                } else {
                    const receivers = chatEntry.inverse_chat.map(entry => ({
                        Reciever_Id: entry.Reciever_Id,
                        count: entry.count
                    }));
                    resolve(receivers); // Return array of receivers with count
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllReceivedExistingMessage: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const EX_rec_chat = db.getDb().collection(collection.TIME_UNREAD_COLLECTION); // CHECKED
                const chatEntries = await EX_rec_chat.find({ Sender_Id }).toArray();

                if (chatEntries.length === 0) {
                    resolve([]); // Return empty array if no entries found
                } else {
                    const receivers = chatEntries.map(entry => ({
                        Reciever_Id: entry.Reciever_Id,
                        count: entry.messageCount
                    }));
                    resolve(receivers); // Return array of receivers with message count
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllAdminReceivedMessage: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const rec_chat = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK_ADMIN);
                const chatEntry = await rec_chat.findOne({ Sender_Id });

                if (!chatEntry || !chatEntry.inverse_chat) {
                    resolve([]); // Return empty array if entry or inverse_chat array is not found
                } else {
                    const receivers = chatEntry.inverse_chat.map(entry => ({
                        Reciever_Id: entry.Reciever_Id,
                        count: entry.count
                    }));
                    resolve(receivers); // Return array of receivers with count
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllAdminReceivedExistingMessage: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const EX_rec_chat = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
                const chatEntries = await EX_rec_chat.find({ Sender_Id }).toArray();

                if (chatEntries.length === 0) {
                    resolve([]); // Return empty array if no entries found
                } else {
                    const receivers = chatEntries.map(entry => ({
                        Reciever_Id: entry.Reciever_Id,
                        count: entry.messageCount
                    }));
                    resolve(receivers); // Return array of receivers with message count
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getLastBroadTime: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const broadlasttimeCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
                const lastBroadcast = await broadlasttimeCollection.find().sort({ timestamp: -1 }).limit(1).toArray();
                if (lastBroadcast.length > 0) {
                    resolve(lastBroadcast[0].timestamp);
                } else {
                    resolve(null); // Return null if no broadcasts found
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getExistingGroupChatCount: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                // Find the user based on Sender_Id
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });
                if (!user) {
                    throw new Error('User not found');
                }

                // Check if last_groupchat_count exists, if not, resolve 0
                const lastGroupChatCount = user.last_groupchat_count || 0;
                resolve(lastGroupChatCount);
            } catch (error) {
                reject(error);
            }
        });
    },


    getExistingViewViewerCount: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);

                // Find the user based on Sender_Id
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });
                if (!user) {
                    throw new Error('User not found');
                }

                // Check if last_groupchat_count exists, if not, resolve 0
                const lastviewviewerCount = user.last_viewProfileViewers_visited_count || 0;
                resolve(lastviewviewerCount);
            } catch (error) {
                reject(error);
            }
        });
    },


    getCurrentViewViewerCount: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER);

                const user = await userCollection.findOne({ user_id: Sender_Id });
                if (!user) {
                    resolve(0);
                    return;
                }

                const existingViewCount = user.existing_view_count || 0;
                resolve(existingViewCount);
            } catch (error) {
                reject(error);
            }
        });
    },


    getLastBroadEntryTime: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const broadlastentrytimeCollection = db.getDb().collection(collection.ADMIN_CHAT_ENTRY_HISTORY);
                const entry = await broadlastentrytimeCollection.findOne({ Sender_Id });

                if (entry) {
                    if (entry.entered_timeStamp) {
                        resolve(entry.entered_timeStamp);
                    } else {
                        resolve(null); // Entry found but no entered_timeStamp
                    }
                } else {
                    resolve(null); // No entry found
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    storeNotification1228: (
        userId, post_notif, postcount, like_notif, increasedIds, 
        like_notify_number, groupchat_notif, groupchatcount, 
        interncount, intern_notif, mentorcount, mentor_notif, 
        jobcount, job_notif, total_new_mess, new_mess_notif, 
        newmessages, mess_count_notify_number, new_messenger_count_notif, 
        total_new_Admin_mess, new_admin_mess_notif, admin_broadcast,
        new_admin_broad_notif, new_view_user_count, new_view_notif,upass_diff,
        adminViewCheckStat,adminViewCheckStatLength,adminViewConsentPending,
        newReplieObtainedQuestions,mentorQuestionNumbers,new_mentor_reply_notif,
        Comment_notify_number, Comment_notif, increasedCommenterIds, DIFFERENCE, 
        ONE_REPLY, MANY_REPLY, MANY_LIKE
    ) => { return new Promise(async (resolve, reject) => {
            try {
                const broadlastentrytimeCollection = db.getDb().collection(collection.NOTIFICATION_COLLECTION);
                //const fullNotificationCollection = db.getDb().collection(collection.FULL_NOTIFICATION_COLLECTION);

                const entry = await broadlastentrytimeCollection.findOne({ Sender_Id: userId });

                if (entry) {
                    const latestNotification = entry.notification[entry.notification.length - 1];
                    let isChanged = false;

                    // Compare incoming parameters with latest entry in notification array
                    if (
                        latestNotification.post_notif !== post_notif ||
                        latestNotification.postcount !== postcount ||
                        latestNotification.like_notif !== like_notif ||
                        latestNotification.like_notify_number !== like_notify_number ||
                        latestNotification.groupchat_notif !== groupchat_notif ||
                        latestNotification.groupchatcount !== groupchatcount ||
                        latestNotification.interncount !== interncount ||
                        latestNotification.intern_notif !== intern_notif ||
                        latestNotification.mentorcount !== mentorcount ||
                        latestNotification.mentor_notif !== mentor_notif ||
                        latestNotification.jobcount !== jobcount ||
                        latestNotification.job_notif !== job_notif ||
                        latestNotification.total_new_mess !== total_new_mess ||
                        latestNotification.new_mess_notif !== new_mess_notif ||
                        latestNotification.mess_count_notify_number !== mess_count_notify_number ||
                        latestNotification.new_messenger_count_notif !== new_messenger_count_notif ||
                        latestNotification.total_new_Admin_mess !== total_new_Admin_mess ||
                        latestNotification.new_admin_mess_notif !== new_admin_mess_notif ||
                        latestNotification.admin_broadcast !== admin_broadcast ||
                        latestNotification.new_admin_broad_notif !== new_admin_broad_notif ||
                        latestNotification.new_view_user_count !== new_view_user_count ||
                        latestNotification.new_view_notif !== new_view_notif || 
                        latestNotification.upass_diff !== upass_diff || 
                        latestNotification.adminViewCheckStatLength !== adminViewCheckStatLength || 
                        latestNotification.adminViewConsentPending !== adminViewConsentPending ||
                        latestNotification.mentorQuestionNumbers !== mentorQuestionNumbers ||
                        latestNotification.new_mentor_reply_notif !== new_mentor_reply_notif  ||
                        latestNotification.Comment_notify_number !== Comment_notify_number ||
                        latestNotification.Comment_notif !== Comment_notif || 
                        latestNotification.ONE_REPLY !== ONE_REPLY ||
                        latestNotification.MANY_REPLY !== MANY_REPLY ||
                        latestNotification.MANY_LIKE !== MANY_LIKE
                    ) {
                        isChanged = true;
                    }

                    if (isChanged) {
                        // Create a new entry with current time and set all incoming parameters
                        const newNotification = {
                            entered_timeStamp: new Date(),
                            post_notif,
                            postcount,
                            like_notif,
                            increasedIds,
                            like_notify_number,
                            groupchat_notif,
                            groupchatcount,
                            interncount,
                            intern_notif,
                            mentorcount,
                            mentor_notif,
                            jobcount,
                            job_notif,
                            total_new_mess,
                            new_mess_notif,
                            newmessages,
                            mess_count_notify_number,
                            new_messenger_count_notif,
                            total_new_Admin_mess,
                            new_admin_mess_notif,
                            admin_broadcast,
                            new_admin_broad_notif,
                            new_view_user_count,
                            new_view_notif,
                            upass_diff,
                            adminViewCheckStat,
                            adminViewCheckStatLength,
                            adminViewConsentPending,
                            newReplieObtainedQuestions,
                            mentorQuestionNumbers,
                            new_mentor_reply_notif,
                            Comment_notify_number,
                            Comment_notif,
                            increasedCommenterIds,
                            DIFFERENCE,
                            ONE_REPLY,
                            MANY_REPLY,
                            MANY_LIKE
                        };

                        // Set non-changed values in previous entry to null
                        // Object.keys(latestNotification).forEach((key) => {
                        //     if (!(key in newNotification)) {
                        //         latestNotification[key] = null;
                        //     }
                        // });

                        entry.notification.push(newNotification);

                        // Discard last entry if more than 7 entries
                        if (entry.notification.length > 7) {
                            const discardedEntry = entry.notification.shift();
                            //await fullNotificationCollection.insertOne({ Sender_Id: userId, notification: [discardedEntry] });
                        }

                        await broadlastentrytimeCollection.updateOne({ Sender_Id: userId }, { $set: { notification: entry.notification } });
                    } else {
                        // If no changes, update the timestamp of the latest entry
                        latestNotification.entered_timeStamp = new Date();
                        await broadlastentrytimeCollection.updateOne({ Sender_Id: userId }, { $set: { notification: entry.notification } });
                    }

                    resolve(entry.notification[entry.notification.length - 1].entered_timeStamp);
                } else {
                    // If no entry found, create a new entry
                    const newNotification = {
                        entered_timeStamp: new Date(),
                        post_notif,
                        postcount,
                        like_notif,
                        increasedIds,
                        like_notify_number,
                        groupchat_notif,
                        groupchatcount,
                        interncount,
                        intern_notif,
                        mentorcount,
                        mentor_notif,
                        jobcount,
                        job_notif,
                        total_new_mess,
                        new_mess_notif,
                        newmessages,
                        mess_count_notify_number,
                        new_messenger_count_notif,
                        total_new_Admin_mess,
                        new_admin_mess_notif,
                        admin_broadcast,
                        new_admin_broad_notif,
                        new_view_user_count,
                        new_view_notif,
                        upass_diff,
                        adminViewCheckStat,
                        adminViewCheckStatLength,
                        adminViewConsentPending,
                        newReplieObtainedQuestions,
                        mentorQuestionNumbers,
                        new_mentor_reply_notif,
                        Comment_notify_number,
                        Comment_notif,
                        increasedCommenterIds,
                        DIFFERENCE,
                        ONE_REPLY,
                        MANY_REPLY,
                        MANY_LIKE
                    };

                    const newEntry = {
                        Sender_Id: userId,
                        notification: [newNotification],
                    };

                    await broadlastentrytimeCollection.insertOne(newEntry);
                    resolve(newNotification.entered_timeStamp);
                }
            } catch (error) {
                reject(error);
            }
        });
    },



    updatePassCount: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });

                if (user) {
                    if (user.upassCurrentCount !== undefined) {
                        await userCollection.updateOne(
                            { _id: new objectId(Sender_Id) },
                            { $inc: { upassCurrentCount: 1 }, $set: { upassConfirm: false } }
                        );
                    } else {
                        await userCollection.updateOne(
                            { _id: new objectId(Sender_Id) },
                            { $set: { upassCurrentCount: 1, upassConfirm: false } }
                        );
                    }
                }

                resolve(); // Resolve the promise as there's no need to return anything
            } catch (error) {
                reject(error);
            }
        });
    },


    getUpassDiffCount: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const user = await userCollection.findOne({ _id: new objectId(Sender_Id) });

                if (!user) {
                    reject(new Error('User not found'));
                    return;
                }

                const { upassCurrentCount, upassExistingCount, upassConfirm } = user;
                const difference = upassCurrentCount - upassExistingCount;
                resolve({ difference, upassConfirm });
            } catch (error) {
                reject(error);
            }
        });
    },


    setRequestUpdatePassOtp: (userID) => {
        return new Promise((resolve, reject) => {
            const usercollection = db.getDb().collection(collection.USER_COLLECTION)
            
            usercollection.findOne({ _id: new objectId(userID) }).then((user) => {
                if (!user) {
                    // No user found with the given email
                    resolve();
                    return;
                }
    
                const updateFields = {};
                const currentTime = new Date();
    
                if (!user.UpdatePassOtpRequestCount && !user.update_passopt_lock_time) {
                    updateFields.UpdatePassOtpRequestCount = 1;
                    updateFields.update_passopt_lock_time = null;
                } else if (user.UpdatePassOtpRequestCount === 2) {
                    updateFields.UpdatePassOtpRequestCount = 3;
                    updateFields.update_passopt_lock_time = currentTime;
                } else if (user.UpdatePassOtpRequestCount) {
                    if (user.UpdatePassOtpRequestCount < 3) {
                        updateFields.UpdatePassOtpRequestCount = user.UpdatePassOtpRequestCount + 1;
                    }
                } else {
                    updateFields.UpdatePassOtpRequestCount = 1;
                }
    
                usercollection.updateOne(
                    { _id: new objectId(userID) },
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
    
    
    getUpdatePassOtpRequest: (userID) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
                { _id: new objectId(userID) },
                { projection: { UpdatePassOtpRequestCount: 1, update_passopt_lock_time: 1 } }
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


    getUpdatePassOtpRequestTime: (userID) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
                { _id: new objectId(userID) },
                { projection: { update_passopt_lock_time: 1 } }
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
    

    UpdatePassupdateOtpRequest: (userID) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).updateOne(
                { _id: new objectId(userID) },
                {
                    $set: {
                        UpdatePassOtpRequestCount: 0,
                        update_passopt_lock_time: null
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


    addAdminViewDelMesStat: (User_1, User_2) => {
        return new Promise(async (resolve, reject) => {
            try {
                const USER_ID = User_1; // Set USER_ID to User_1
                const adminCollection = db.getDb().collection(collection.ADMIN_PRIVATECHAT_VIEW_USER_NOTIFY);
                const adminUser = await adminCollection.findOne({ USER_ID });

                let adminViewDelMes = [];

                if (adminUser) {
                    adminViewDelMes = adminUser.adminViewDelMes || [];
                } else {
                    // Create a new user entry if User_1 is not found
                    await adminCollection.insertOne({ USER_ID, adminViewDelMes: [] });
                }

                const newEntry = {
                    user: User_2,
                    time_viewed: new Date(),
                    userConfirm: false
                };

                adminViewDelMes.push(newEntry);

                await adminCollection.updateOne(
                    { USER_ID },
                    { $set: { adminViewDelMes: adminViewDelMes } }
                );

                resolve('Entry added successfully');
            } catch (error) {
                reject(error);
            }
        });
    },


    getAdminViewDelMessStatCount: (Sender_Id) => {
        function formatDate(date) {
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
            return new Date(date).toLocaleDateString('en-US', options);
        }

        return new Promise(async (resolve, reject) => {
            try {
                const adminuserviewdelmessCollection = db.getDb().collection(collection.ADMIN_PRIVATECHAT_VIEW_USER_NOTIFY);
                const adminUser = await adminuserviewdelmessCollection.findOne({ USER_ID: Sender_Id });

                if (!adminUser || !adminUser.adminViewDelMes || adminUser.adminViewDelMes.length === 0) {
                    resolve([]); // No user entry found or no adminViewDelMes array found
                    return;
                }

                const filteredEntries = adminUser.adminViewDelMes.filter(entry => !entry.userConfirm);

                const formattedEntries = filteredEntries.map(entry => {
                    return {
                        user: entry.user,
                        time_viewed: formatDate(entry.time_viewed)
                    };
                });

                resolve(formattedEntries);
            } catch (error) {
                reject(error);
            }
        });
    },


    incrementReplyCount: (question_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);
                const question = await mentorCollection.findOne({ _id: new objectId(question_id) });
                if (question) {
                    if (question.currentReplyCount) {
                        await mentorCollection.updateOne(
                            { _id: new objectId(question_id) },
                            { $inc: { currentReplyCount: 1 } }
                        );
                    } else {
                        await mentorCollection.updateOne(
                            { _id: new objectId(question_id) },
                            { $set: { currentReplyCount: 1 } }
                        );
                    }
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    getUserMailFromMentorId : (question_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                
                // Find the mentor entry by question_id
                const mentorEntry = await mentorCollection.findOne({ _id: new objectId(question_id) });
                if (!mentorEntry) {
                    return resolve(null);
                }
                
                // Retrieve the userId from the mentor entry
                const userId = mentorEntry.userId;
                if (!userId) {
                    return resolve(null);
                }
    
                // Find the user entry by userId
                const userEntry = await userCollection.findOne({ _id: new objectId(userId) });
                if (!userEntry || !userEntry.Email) {
                    return resolve(null);
                }
    
                // Return email and questionInput
                resolve({
                    email: userEntry.Email,
                    questionInput: mentorEntry.questionInput
                });
    
            } catch (error) {
                reject(error);
            }
        });
    },    


    addQuestionEntry: (Sender_Id, question_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const usermentorCollection = db.getDb().collection(collection.USER_MENTOR_COLLECTION);
                const existingEntry = await usermentorCollection.findOne({ Sender_Id });
                if (existingEntry) {
                    if (existingEntry.questions && Array.isArray(existingEntry.questions)) {
                        existingEntry.questions.push(question_id);
                    } else {
                        existingEntry.questions = [question_id];
                    }
                    await usermentorCollection.updateOne({ Sender_Id }, { $set: existingEntry });
                } else {
                    const newEntry = { Sender_Id, questions: [question_id] };
                    await usermentorCollection.insertOne(newEntry);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    getSenderMentors: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const usermentorCollection = db.getDb().collection(collection.USER_MENTOR_COLLECTION);
                const existingEntry = await usermentorCollection.findOne({ Sender_Id });
                if (existingEntry && existingEntry.questions && Array.isArray(existingEntry.questions)) {
                    const questionsArray = existingEntry.questions;
                    resolve(questionsArray);
                } else {
                    resolve([]);
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    equalizeExistingCurrentReplyCount: (Questions) => {
        return new Promise(async (resolve, reject) => {
            try {
                const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);
                for (const questionId of Questions) {
                    const question = await mentorCollection.findOne({ _id: new objectId(questionId) });
                    if (question) {
                        if ('existReplyCount' in question && 'currentReplyCount' in question) {
                            question.existReplyCount = question.currentReplyCount;
                            await mentorCollection.updateOne({ _id: new objectId(questionId) }, { $set: { existReplyCount: question.currentReplyCount } });
                        }
                    }
                    else {
                        console.log(`Question with ID ${questionId} not found.`);
                    }
                }
                resolve("Operation completed successfully.");
            } catch (error) {
                reject(error);
            }
        });
    },


    getdifferenceMentorQuestionReply: (Questions) => {
        return new Promise(async (resolve, reject) => {
            try {
                const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);
                const result = [];
                let differentSum = 0;

                for (const questionId of Questions) {
                    const question = await mentorCollection.findOne({ _id: new objectId(questionId) });
                    if (question) {
                        if ('existReplyCount' in question && 'currentReplyCount' in question) {
                            const difference = question.currentReplyCount - question.existReplyCount;
                            if (difference !== 0) {
                                result.push({ questionId: questionId, difference: difference });
                                differentSum += difference
                            }
                        }
                    } else {
                        console.log(`Question with ID ${questionId} not found.`);
                    }
                }
                resolve({ result: result, differentSum: differentSum });
            } catch (error) {
                reject(error);
            }
        });
    },


    fetchViewAdminTransferState: (userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userID) },
                    { viewEnabledForAdmin: 1 }
                ).then((result) => {
                    if (result && result.viewEnabledForAdmin !== undefined) {
                        resolve({ viewEnabledForAdmin: result.viewEnabledForAdmin });
                    } else {
                        resolve({ viewEnabledForAdmin: false });
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    
   
    EnableVisitTransfer: (userID) => {
        return new Promise((resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                userCollection.findOne({ _id: new objectId(userID) }).then((user) => {
                    if (!user) {
                        resolve({ message: "No user found." });
                        return;
                    }
    
                    let viewEnabledForAdmin = user.viewEnabledForAdmin;
                    let viewEnabledForAdminTime = user.viewEnabledForAdminTime;
    
                    // If the fields are present, toggle the value and update the time
                    if (viewEnabledForAdmin !== undefined && viewEnabledForAdminTime !== undefined) {
                        viewEnabledForAdmin = !viewEnabledForAdmin;
                        viewEnabledForAdminTime = new Date();
                    } else {
                        // If the fields are not present, create and initialize them
                        viewEnabledForAdmin = true;
                        viewEnabledForAdminTime = new Date();
                    }
    
                    const updateObject = {
                        $set: {
                            viewEnabledForAdmin: viewEnabledForAdmin,
                            viewEnabledForAdminTime: viewEnabledForAdminTime
                        }
                    };
    
                    // Update the user document
                    userCollection.updateOne({ _id: new objectId(userID) }, updateObject).then(() => {
                        resolve({ userID: userID, viewEnabledForAdmin: viewEnabledForAdmin, viewEnabledForAdminTime: viewEnabledForAdminTime });
    
                        // If viewEnabledForAdmin is true, set a timeout to turn it off after 24 hours
                        if (viewEnabledForAdmin) {
                            const twentyFourHoursLater = new Date(viewEnabledForAdminTime.getTime() + 24 * 60 * 60 * 1000);
                            const timeUntilExpiration = twentyFourHoursLater - new Date();
    
                            setTimeout(() => {
                                userCollection.updateOne({ _id: new objectId(userID) }, { $set: { viewEnabledForAdmin: false } })
                                    .then(() => console.log("View access disabled after 24 hours."))
                                    .catch(err => console.error("Error disabling view access after 24 hours:", err));
                            }, timeUntilExpiration);
                        }
                    }).catch((err) => {
                        reject(err);
                    });
                }).catch((err) => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
       

    confirmUpdatePass: (userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userID) });
                if (user) {
                    if (user.upassConfirm !== undefined && user.upassCurrentCount !== undefined && user.upassExistingCount !== undefined) {
                        user.upassConfirm = true;
                        user.upassExistingCount = user.upassCurrentCount;
                        await db.getDb().collection(collection.USER_COLLECTION).updateOne(
                            { _id: new objectId(userID) },
                            { $set: { upassConfirm: true, upassExistingCount: user.upassCurrentCount } }
                        );
                    }
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    confirmAdminPassPrivateChat: (userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await db.getDb().collection(collection.ADMIN_PRIVATECHAT_VIEW_USER_NOTIFY).findOne({ USER_ID: userID });
                if (user && user.adminViewDelMes && Array.isArray(user.adminViewDelMes)) {
                    user.adminViewDelMes.forEach(async (entry) => {
                        entry.userConfirm = true;
                    });
                    await db.getDb().collection(collection.ADMIN_PRIVATECHAT_VIEW_USER_NOTIFY).updateOne(
                        { USER_ID: userID },
                        { $set: { adminViewDelMes: user.adminViewDelMes } }
                    );
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },


    getAdminViewDataOneChat: (userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userEntry = await db.getDb().collection(collection.ADMIN_PRIVATECHAT_VIEW_USER_NOTIFY).findOne({ USER_ID: userID });

                if (userEntry && userEntry.adminViewDelMes && userEntry.adminViewDelMes.length > 0) {
                    const formattedData = userEntry.adminViewDelMes.map(entry => {
                        const timestamp = new Date(entry.time_viewed).toLocaleString('en-US', {
                            timeZone: 'UTC',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                        });
                        return { viewId: entry.user, timestamp, userConfirm: entry.userConfirm };
                    });
                    resolve(formattedData);
                } else {
                    resolve([]); // No data found or invalid structure
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    addCommentTrackerEntry: (comment_owner_id, post_Id, comment_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const trackercollection = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER);
                let status = "TYPE1";
                // Check if there's an entry with the same Sender_ID
                const userEntry = await trackercollection.findOne({ Sender_ID: comment_owner_id });
    
                if (!userEntry) {
                    // If no entry found, create a new entry
                    const newEntry = {
                        Sender_ID: comment_owner_id,
                        [post_Id]: [{
                            comment_id: comment_id,
                            existing_comment_reply_count: 0,
                            current_comment_reply_count: 0,
                            existing_comment_like_count: 0,
                            current_comment_like_count: 0,
                            status: status
                        }]
                    };
                    await trackercollection.insertOne(newEntry);
                } else {
                    // If entry is found, check for the post_Id array
                    let postArray = userEntry[post_Id];
                    
                    if (!postArray) {
                        // If no array found, create one
                        postArray = [{
                            comment_id: comment_id,
                            existing_comment_reply_count: 0,
                            current_comment_reply_count: 0,
                            existing_comment_like_count: 0,
                            current_comment_like_count: 0,
                            status: status
                        }];
                    } else {
                        // If array exists, push the new comment entry
                        postArray.push({
                            comment_id: comment_id,
                            existing_comment_reply_count: 0,
                            current_comment_reply_count: 0,
                            existing_comment_like_count: 0,
                            current_comment_like_count: 0,
                            status: status
                        });
                    }
                    
                    // Update the entry with the new post array
                    await trackercollection.updateOne(
                        { Sender_ID: comment_owner_id },
                        { $set: { [post_Id]: postArray } }
                    );
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }, 


    addCommentAndReplyLikeTrackerEntry: (comment_owner_id, post_Id, comment_id, add_remove_status) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const trackercollection = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER);
    
                // Check if there's an entry with the same Sender_ID
                const userEntry = await trackercollection.findOne({ Sender_ID: comment_owner_id });
    
                if (!userEntry) {
                    // If no entry found, return from the function
                    return resolve();
                }
    
                // If entry is found, check if there's an array with the same post_Id
                if (!userEntry[post_Id]) {
                    // If no array with post_Id found, return from the function
                    return resolve();
                }
    
                // Check for an entry with the same comment_id
                let commentFound = false;
                userEntry[post_Id] = userEntry[post_Id].map(comment => {
                    if (comment.comment_id === comment_id) {
                        commentFound = true;
                        comment.current_comment_like_count += add_remove_status ? 1 : -1;
                    }
                    return comment;
                });
    
                // If comment_id entry is found, update the existing entry
                if (commentFound) {
                    await trackercollection.updateOne({ Sender_ID: comment_owner_id }, { $set: { [post_Id]: userEntry[post_Id] } });
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    


    addCommentReplyTrackerEntry: (comment_owner_id, post_Id, comment_id, actual_comment_id, actual_comment_owner_id) => {   
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const trackercollection = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER);
                let status = "TYPE2";
    
                // Check if there's an entry with the same Sender_ID (comment_owner_id)
                let userEntry = await trackercollection.findOne({ Sender_ID: comment_owner_id });
    
                if (!userEntry) {
                    // If no entry found, create a new entry
                    userEntry = {
                        Sender_ID: comment_owner_id,
                        [post_Id]: [{
                            comment_id: comment_id,
                            existing_comment_reply_count: 0,
                            current_comment_reply_count: 0,
                            existing_comment_like_count: 0,
                            current_comment_like_count: 0,
                            status: status,
                            actual_comment_owner_id: actual_comment_owner_id,
                            actual_comment_id: actual_comment_id
                        }]
                    };
                    await trackercollection.insertOne(userEntry);
                } else {
                    // If entry is found, check for the post_Id array
                    let postArray = userEntry[post_Id];
                    
                    if (!postArray) {
                        // If no array found, create one
                        postArray = [{
                            comment_id: comment_id,
                            existing_comment_reply_count: 0,
                            current_comment_reply_count: 0,
                            existing_comment_like_count: 0,
                            current_comment_like_count: 0,
                            status: status,
                            actual_comment_owner_id: actual_comment_owner_id,
                            actual_comment_id: actual_comment_id
                        }];
                    } else {
                        // If array exists, push the new comment entry
                        postArray.push({
                            comment_id: comment_id,
                            existing_comment_reply_count: 0,
                            current_comment_reply_count: 0,
                            existing_comment_like_count: 0,
                            current_comment_like_count: 0,
                            status: status,
                            actual_comment_owner_id: actual_comment_owner_id,
                            actual_comment_id: actual_comment_id
                        });
                    }
                    
                    // Update the entry with the new post array
                    await trackercollection.updateOne(
                        { Sender_ID: comment_owner_id },
                        { $set: { [post_Id]: postArray } }
                    );
                }
    
                // Check for the entry with the actual_comment_owner_id
                const actualOwnerEntry = await trackercollection.findOne({ Sender_ID: actual_comment_owner_id });
    
                if (actualOwnerEntry) {
                    // Check for the array with post_Id inside the actual comment owner's entry
                    let actualOwnerPostArray = actualOwnerEntry[post_Id];
    
                    if (actualOwnerPostArray) {
                        // Find the entry with the same actual_comment_id
                        let actualCommentEntry = actualOwnerPostArray.find(entry => entry.comment_id === actual_comment_id);
    
                        if (actualCommentEntry) {
                            // If entry found, update the current_comment_reply_count and link_page
                            actualCommentEntry.current_comment_reply_count += 1;
    
                            if (!actualCommentEntry.link_page) {
                                actualCommentEntry.link_page = [];
                            }
    
                            actualCommentEntry.link_page.push({
                                sub_sender_id: comment_owner_id,
                                post_Id: post_Id,
                                sub_comment_id: comment_id
                            });
    
                            await trackercollection.updateOne(
                                { Sender_ID: actual_comment_owner_id },
                                { $set: { [post_Id]: actualOwnerPostArray } }
                            );
                        }
                    }
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    


    removeCommentTrackerEntry : (comment_owner_id, post_Id, comment_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const trackercollection = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER); // DELETE COMMENT OF POST
    
                // Function to remove a comment and its linked comments recursively
                const removeCommentAndLinks = async (ownerId, postId, commentId) => {
                    const userEntry = await trackercollection.findOne({ Sender_ID: ownerId });
    
                    if (userEntry && userEntry[postId]) {
                        const commentIndex = userEntry[postId].findIndex(comment => comment.comment_id === commentId);
    
                        if (commentIndex !== -1) {
                            const commentEntry = userEntry[postId][commentIndex];
                            let linksToRemove = [];
    
                            // Collect link_page entries for recursive deletion
                            if (commentEntry.link_page && commentEntry.link_page.length > 0) {
                                linksToRemove = commentEntry.link_page.slice();
                            }
    
                            // Remove the original comment entry
                            userEntry[postId].splice(commentIndex, 1);
    
                            // Update the user entry
                            await trackercollection.updateOne(
                                { Sender_ID: ownerId },
                                { $set: { [postId]: userEntry[postId] } }
                            );
    
                            // Process each link in link_page recursively
                            for (const link of linksToRemove) {
                                await removeCommentAndLinks(link.sub_sender_id, link.post_Id, link.sub_comment_id);
                            }
                        }
                    }
                };
    
                // Start the removal process from the original comment
                await removeCommentAndLinks(comment_owner_id, post_Id, comment_id);
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },        


    removeCommentReplyTrackerEntry: (Sender_ID, post_Id, comment_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const trackerCollection = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER); // DELETING REPLY OF COMMENT
    
                // Find the entry in COMMENT_REPLY_LIKE_ACTIVITY_TRACKER whose Sender_ID matches
                const senderEntry = await trackerCollection.findOne({ Sender_ID: Sender_ID });
                if (!senderEntry || !senderEntry[post_Id]) {
                    return resolve(false);
                }
    
                // Find the comment entry in the post_Id array
                const commentIndex = senderEntry[post_Id].findIndex(comment => comment.comment_id === comment_id);
                if (commentIndex === -1) {
                    return resolve(false);
                }
    
                const commentEntry = senderEntry[post_Id][commentIndex];
                const { actual_comment_owner_id, actual_comment_id } = commentEntry;
    
                // If actual_comment_owner_id and actual_comment_id are present, perform additional checks
                if (actual_comment_owner_id && actual_comment_id) {
                    const actualOwnerEntry = await trackerCollection.findOne({ Sender_ID: actual_comment_owner_id });
                    if (actualOwnerEntry && actualOwnerEntry[post_Id]) {
                        const actualCommentIndex = actualOwnerEntry[post_Id].findIndex(comment => comment.comment_id === actual_comment_id);
                        if (actualCommentIndex !== -1) {
                            const actualCommentEntry = actualOwnerEntry[post_Id][actualCommentIndex];
    
                            if (actualCommentEntry.current_comment_reply_count !== undefined) {
                                // Decrement the current_comment_reply_count by 1
                                actualCommentEntry.current_comment_reply_count -= 1;
    
                                // Check and remove entry from link_page if present
                                if (actualCommentEntry.link_page) {
                                    const linkPageIndex = actualCommentEntry.link_page.findIndex(link => link.sub_comment_id === comment_id);
                                    if (linkPageIndex !== -1) {
                                        actualCommentEntry.link_page.splice(linkPageIndex, 1);
                                    }
                                }
    
                                // Update the actual owner's entry
                                await trackerCollection.updateOne(
                                    { Sender_ID: actual_comment_owner_id, [`${post_Id}.comment_id`]: actual_comment_id },
                                    { $set: { [`${post_Id}.$`]: actualCommentEntry } }
                                );
                            }
                        }
                    }
                }
    
                // Remove the comment entry from the Sender_ID's post_Id array
                senderEntry[post_Id].splice(commentIndex, 1);
    
                // Update the Sender_ID's entry
                await trackerCollection.updateOne(
                    { Sender_ID: Sender_ID },
                    { $set: { [post_Id]: senderEntry[post_Id] } }
                );
    
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    },


    getDifferenceInCommentLikeReply: (userID) => {  
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const collectionName = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER); // USED IN NOTIFICATION TO GET DIFFERENCE OF REPLY, LIKE 
                const userEntry = await collectionName.findOne({ Sender_ID: userID });
    
                if (userEntry) {
                    let onereply = false;
                    let manyreply = false;
                    let manylike = false;
                    let differences = [];
    
                    for (let arrayName in userEntry) {
                        if (arrayName !== '_id' && arrayName !== 'Sender_ID') {
                            let totalReplyDiff = 0;
                            let totalLikeDiff = 0;
                            let arrayData = userEntry[arrayName];
    
                            for (let entry of arrayData) {
                                const likeDiff = entry.current_comment_like_count - entry.existing_comment_like_count;
                                const replyDiff = entry.current_comment_reply_count - entry.existing_comment_reply_count;
    
                                totalLikeDiff += likeDiff;
                                totalReplyDiff += replyDiff;
                            }
    
                            if (totalReplyDiff === 1) {
                                onereply = true;
                            }
                            if (totalReplyDiff > 1) {
                                manyreply = true;
                            }
                            if (totalLikeDiff >= 10) {
                                manylike = true;
                            }
    
                            if (totalReplyDiff !== 0 || totalLikeDiff !== 0) {
                                differences.push({
                                    arrayName,
                                    totalReplyDiff,
                                    totalLikeDiff
                                });
                            }
                        }
                    }
    
                    resolve({ onereply, manyreply, manylike, differences });
                } else {
                    resolve({ onereply: false, manyreply: false, manylike: false, differences: [] });
                }
            } catch (error) {
                reject(error);
            }
        });
    },    
    
    
    clearPostLikeNotif: (userID, postID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const collectionName = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER); // CLEAR POST COMMENT LIKE BY MAKING EXISTING SAME TO CURRENT
                
                // Find the entry with the given userID
                const userEntry = await collectionName.findOne({ Sender_ID: userID });
                
                if (userEntry && userEntry[postID]) {
                    // Update the array where the postID matches
                    const postArray = userEntry[postID];
                    
                    postArray.forEach(entry => {
                        entry.existing_comment_like_count = entry.current_comment_like_count;
                    });
    
                    // Update the document in the database
                    await collectionName.updateOne(
                        { Sender_ID: userID },
                        { $set: { [postID]: postArray } }
                    );
                }
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    


    clearPostReplyNotif: (userID, postID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = await db.getDb();
                const collectionName = dbInstance.collection(collection.COMMENT_REPLY_LIKE_ACTIVITY_TRACKER); // CLEAR POST COMMENT REPLY BY MAKING EXISTING SAME TO CURRENT
                
                // Find the entry with the given userID
                const userEntry = await collectionName.findOne({ Sender_ID: userID });
                
                if (userEntry && userEntry[postID]) {
                    // Update the array where the postID matches
                    const postArray = userEntry[postID];
                    
                    postArray.forEach(entry => {
                        entry.existing_comment_reply_count = entry.current_comment_reply_count;
                    });
    
                    // Update the document in the database
                    await collectionName.updateOne(
                        { Sender_ID: userID },
                        { $set: { [postID]: postArray } }
                    );
                }
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },   


    getallMail: () => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).find(
                {},
                { projection: { Email: 1, _id: 0 } }
            ).batchSize(1000).toArray().then((response) => {
                if (response) {
                    const emails = response.map(user => user.Email);
                    resolve(emails);
                } else {
                    resolve([]);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },


    getEmailFromUserId : (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: { Email: 1, _id: 0} }
                )
                .then((user) => {
                    resolve(user);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    },
    
    
    getAllMailOfAlumni: () => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).find(
                { Status: "Alumni" },
                { projection: { Email: 1, _id: 0 } }
            ).batchSize(1000).toArray().then((response) => {
                if (response) {
                    const emails = response.map(user => user.Email);
                    resolve(emails);
                } else {
                    resolve([]);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },


    getUserMailFromJobId : (job_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                
                // Find the mentor entry by job_id
                const jobEntry = await jobCollection.findOne({ _id: new objectId(job_id) });
                if (!jobEntry) {
                    return resolve(null);
                }
                
                // Retrieve the UserId from the job entry
                const userId = jobEntry.UserId;
                if (!userId) {
                    return resolve(null);
                }
    
                // Find the user entry by userId
                const userEntry = await userCollection.findOne({ _id: new objectId(userId) });
                if (!userEntry || !userEntry.Email) {
                    return resolve(null);
                }
    
                // Return email 
                resolve({
                    email: userEntry.Email,
                });
    
            } catch (error) {
                reject(error);
            }
        });
    },    


    getAllMailOfAlumniJobMorethanThirty: async () => {
        try {
            // Get the current date
            const currentDate = new Date();
            
            // Calculate the cutoff date (30 days ago)
            const cutoffDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            // Find jobs older than 30 days
            const jobs = await db.getDb().collection(collection.JOB_COLLECTION).find({
                timestamp: { $lt: cutoffDate }
            }).toArray();
            
            // Extract UserIds from jobs
            const userIds = jobs.map(job => new objectId(job.UserId));
            
            // Fetch all users in a single query
            const users = await db.getDb().collection(collection.USER_COLLECTION).find({
                _id: { $in: userIds }
            }).toArray();
            
            // Map user IDs to emails
            const userEmails = users.map(user => user.Email);
            
            // Access SYSTEM_GENERAL collection
            const systemGeneralCollection = db.getDb().collection(collection.SYSTEM_GENERAL);
            
            // Fetch the SYSTEM_GENERAL document
            const systemGeneral = await systemGeneralCollection.findOne({});
            
            if (systemGeneral) {
                // If the SYSTEM_GENERAL document exists
                const lastJTime = systemGeneral.j_time || new Date(0); // Default to a very old date if not set
                const lastJTimeDate = new Date(lastJTime);
    
                // Calculate the cutoff date for the 9-day difference
                const nineDaysAgo = new Date(currentDate.getTime() - 9 * 24 * 60 * 60 * 1000);
    
                // Check if j_time is older than 9 days
                if (lastJTimeDate < nineDaysAgo) {
                    // Update the emails and timestamp
                    await systemGeneralCollection.updateOne(
                        {},
                        {
                            $set: {
                                j_mail: userEmails.length > 0 ? userEmails : [], // Ensure it's an array
                                j_time: currentDate
                            }
                        }
                    );
                }
            } else {
                // If the SYSTEM_GENERAL document does not exist
                await systemGeneralCollection.insertOne({
                    j_mail: userEmails.length > 0 ? userEmails : [], // Ensure it's an array
                    j_time: currentDate
                });
            }
            
            return userEmails;
        } catch (error) {
            throw new Error(`Error in getAllMailOfAlumniJobMorethanThirty: ${error.message}`);
        }
    },       


    getAllMailOfAlumniCheckAccessButton: () => {
        return new Promise((resolve, reject) => {
            try {
                const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        
                db.getDb().collection(collection.USER_COLLECTION).find({
                    viewEnabledForAdmin: true
                }).batchSize(1000).toArray()
                .then((response) => {
                    const emails = [];
                    const updateOperations = [];
        
                    response.forEach(user => {
                        if (user.viewEnabledForAdminTime && user.viewEnabledForAdminTime < oneDayAgo) {
                            emails.push(user.Email);
                            updateOperations.push({
                                updateOne: {
                                    filter: { _id: user._id },
                                    update: { $set: { viewEnabledForAdmin: false } }
                                }
                            });
                        }
                    });
        
                    // Perform the bulk update to set viewEnabledForAdmin to false
                    const bulkWritePromise = updateOperations.length > 0 
                        ? db.getDb().collection(collection.USER_COLLECTION).bulkWrite(updateOperations)
                        : Promise.resolve();
        
                    bulkWritePromise
                        .then(() => {
                            const currentTime = new Date();
        
                            // Access SYSTEM_GENERAL collection
                            return db.getDb().collection(collection.SYSTEM_GENERAL).findOne({})
                                .then(systemGeneral => {
                                    if (!systemGeneral) {
                                        // If SYSTEM_GENERAL has no entry, insert a new entry with emails and timestamp
                                        return db.getDb().collection(collection.SYSTEM_GENERAL).insertOne({
                                            a_mail: emails,
                                            a_time: currentTime
                                        });
                                    } else {
                                        // Check if a_mail or a_time is present
                                        if (!systemGeneral.a_mail || !systemGeneral.a_time) {
                                            // If a_mail or a_time is not present, update the document with new emails and timestamp
                                            return db.getDb().collection(collection.SYSTEM_GENERAL).updateOne({}, {
                                                $set: {
                                                    a_mail: emails,
                                                    a_time: currentTime
                                                }
                                            });
                                        } else {
                                            // Calculate the time difference in days
                                            const lastATime = new Date(systemGeneral.a_time);
                                            const timeDifference = (currentTime - lastATime) / (1000 * 60 * 60 * 24);
        
                                            // Update even if emails array is empty, but more than 9 days have passed
                                            if (timeDifference > 9) {
                                                return db.getDb().collection(collection.SYSTEM_GENERAL).updateOne({}, {
                                                    $set: {
                                                        a_mail: emails, // This could be an empty array
                                                        a_time: currentTime
                                                    }
                                                });
                                            }
                                        }
                                    }
                                });
                        })
                        .then(() => resolve(emails))
                        .catch(error => reject(error));
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    


    getAllMailOfAlumniCheckProfileLong: async () => {
        try {
            // Calculate the date 28 days ago
            const twentyEightDaysAgo = new Date(new Date().getTime() - 28 * 24 * 60 * 60 * 1000);
            
            // Find users who haven't logged in for more than 28 days
            const users = await db.getDb().collection(collection.USER_COLLECTION).find({
                lastlogged_In: { $exists: true, $lt: twentyEightDaysAgo }
            }).toArray();
            
            // Extract emails
            const emails = users.map(user => user.Email);
            const currentTime = new Date();
            
            // Access SYSTEM_GENERAL collection
            const systemGeneralCollection = db.getDb().collection(collection.SYSTEM_GENERAL);
            
            // Check if SYSTEM_GENERAL document exists
            const systemGeneral = await systemGeneralCollection.findOne({});
            
            if (!systemGeneral) {
                // If SYSTEM_GENERAL has no entry, insert a new entry with emails and timestamp
                await systemGeneralCollection.insertOne({
                    u_mail: emails.length > 0 ? emails : [], // Ensure it's an array
                    u_time: currentTime
                });
            } else {
                // Check if u_mail or u_time is not present
                if (!systemGeneral.u_mail || !systemGeneral.u_time) {
                    // Update the document with emails and timestamp
                    await systemGeneralCollection.updateOne({}, {
                        $set: {
                            u_mail: emails.length > 0 ? emails : [], // Ensure it's an array
                            u_time: currentTime
                        }
                    });
                } else {
                    // Calculate the time difference in days
                    const lastUTimeDate = new Date(systemGeneral.u_time);
                    const timeDifference = (currentTime - lastUTimeDate) / (1000 * 60 * 60 * 24);
                    
                    // If more than 9 days have passed, update the emails and timestamp
                    if (timeDifference > 9) {
                        await systemGeneralCollection.updateOne({}, {
                            $set: {
                                u_mail: emails.length > 0 ? emails : [], // Ensure it's an array
                                u_time: currentTime
                            }
                        });
                    }
                }
            }
            
            return { success: true, message: 'Operation completed successfully' };
        } catch (error) {
            console.error('Error during DB operation:', error);
            throw new Error(`Error in getAllMailOfAlumniCheckProfileLong: ${error.message}`);
        }
    },
    
    
    getAllKindOfMail: () => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.SYSTEM_GENERAL).findOne(
            ).then((response) => {
                if (response) {
                    // Extract u_mail, j_mail, and a_mail if they exist
                    const emails = {
                        u_mail: response.u_mail || [],
                        j_mail: response.j_mail || [],
                        a_mail: response.a_mail || []
                    };
                    resolve(emails);
                } else {
                    resolve({
                        u_mail: [],
                        j_mail: [],
                        a_mail: []
                    });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },


    getMessageTimeIntervalAdmin: (receiver, sender) => {
        return new Promise(async (resolve, reject) => {
            try {
                const chatCollection = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK_ADMIN);
        
                // Find if there's an entry with Sender_Id same as sender parameter
                const existingEntry = await chatCollection.findOne({ Sender_Id: sender });
        
                if (existingEntry && existingEntry.inverse_chat) {
                    // Find the chat with the matching Reciever_Id
                    const chat = existingEntry.inverse_chat.find(chat => chat.Reciever_Id === receiver);
                    
                    if (chat && chat.time_stamp) {
                        // Resolve with the time_stamp
                        resolve(chat.time_stamp);
                    } else {
                        // Resolve null if no matching Reciever_Id or time_stamp is found
                        resolve(null);
                    }
                } else {
                    // Resolve null if no existingEntry or inverse_chat is found
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },     


    getAllGallery: () => {
        return new Promise(async (resolve, reject) => {
            try {
                // Get the SUPER_ADMIN_COLLECTION
                const superAdminCollection = db.getDb().collection(collection.SUPER_ADMIN_COLLECTION);
    
                // Fetch the document and project only the Gallery_posts field
                const result = await superAdminCollection.findOne(
                    {}, // Assuming no filtering is needed since the collection has a single document
                    { projection: { Gallery_posts: 1 } }
                );
    
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
    
    
    view_your_enquiries : (userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                    .find({ user_id: userID })  // Find only entries where user_id matches the userID parameter
                    .toArray()
                    .then((entries) => {
                        resolve(entries);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },  


    GetindiEnquiries: (ask_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                    .findOne({ _id: new objectId(ask_id) }) // Use findOne and match _id with ObjectId
                    .then((entry) => {
                        if (!entry) {
                            reject(new Error("Enquiry not found"));
                            return;
                        }
                        entry._id = entry._id.toString();
                        resolve(entry); // Resolve with the matched entry
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }, 
    
    
    view_your_reports: (userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_REPORTS_REPORTED)
                    .find({reporter_id: userID})
                    .toArray()
                    .then((entries) => {
                    resolve(entries);
                })
                .catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },   


    GetindiReports: (report_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_REPORTS_REPORTED)
                    .findOne({ _id: new objectId(report_id) }) // Use findOne and match _id with ObjectId
                    .then((entry) => {
                        if (!entry) {
                            reject(new Error("Enquiry not found"));
                            return;
                        }
                        entry._id = entry._id.toString();
                        resolve(entry); // Resolve with the matched entry
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                reject(error);
            }
        });
    },    


    AddAdminEnquiryView: (ask_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const entry = await db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                    .findOne({ _id: new objectId(ask_id) });
                if (entry) {
                    resolve(entry); // Resolve with the matched entry
                } else {
                    resolve(null); // Resolve with null if entry not found
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    
    
    
    
}
