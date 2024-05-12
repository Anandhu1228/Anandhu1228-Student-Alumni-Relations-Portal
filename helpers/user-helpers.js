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
            if (userData.Password == userData.Cpass) {
                userData.upassExistingCount = parseInt(userData.upassExistingCount);
                userData.upassCurrentCount = parseInt(userData.upassCurrentCount);
                userData.upassConfirm = Boolean(userData.upassConfirm);

                // Add await for the above lines
                await Promise.all([
                    userData.upassExist,
                    userData.upassCurrentCount,
                    userData.upassConfirm
                ]);
    
                userData.Password = await bcrypt.hash(userData.Password, 10);
                userData.Cpass = await bcrypt.hash(userData.Cpass, 10);
                db.getDb().collection(collection.USER_COLLECTION).insertOne(userData).then((response) => {
                    resolve(response);
                });
            } else {
                reject(new Error("Passwords do not match"));
            }
        });
    },
    

    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus = false
            let response = {}
            let user = await db.getDb().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        response.user=user
                        response.status=true

                        const loginTimestamp = new Date();
                        db.getDb().collection(collection.LOG_DETAILS_COLLECTION).updateOne({ _id: user._id }, {
                            $set: {
                                lastLogin: loginTimestamp
                            }
                        });

                        resolve(response)
                    }else{
                        resolve({status:false})
                    }
                })
            }else{
                console.log("login failed");
                resolve({status:false})
            }
        })
    } ,

    // lastEnteredMainPage:(userId)=>{
    //     return new Promise((resolve,reject)=>{
    //         db.getDb().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(userId)},{
                
    //         }).then((response)=>{
    //             resolve()
    //         })
    //     })
    // },


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
    

    getProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
            resolve(profile);
        });
    },

    getProfileDetails:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.USER_COLLECTION).findOne({_id:new objectId(userId)}).then((user)=>{
                resolve(user)
            })
        })
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

    getBasicUserProfileDetails: (userId) => {
        return new Promise((resolve, reject) => {
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
            }).catch(err => reject(err));
        });
    },
    


    getProfileViewers: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER).findOne({ user_id: userId }).then((user) => {
                if (!user || !user.viewerDetails || user.viewerDetails.length === 0) {
                    resolve([]); // Return empty array if no entry found or no viewerDetails array
                } else {
                    const viewers = user.viewerDetails.map(viewer => ({ viewId: viewer.viewId, timestamp: viewer.timestamp }));
                    resolve(viewers); // Return array of viewId and timestamp objects
                }
            }).catch(err => reject(err));
        });
    },
    
    
    updateProfile:(userId,userDetails)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(userId)},{
                $set:{
                    Name:userDetails.Name,
                    Email:userDetails.Email,
                    Contact:userDetails.Contact,
                }
            }).then((response)=>{
                resolve()
            })
        })
    },


    getUpdateProfilePushSettings: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne({_id: new objectId(userId)}).then(( user) => {               
                let location = user.currentLocation ? true : false;
                let passoutYear = user.passoutYear ? true : false;
                let empStatus = user.employmentStatus ? true : false;
                resolve({ location, passoutYear, empStatus });                
            })
        })
    },


    getUpdateProfilePushInProfileExperienceSettings: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne({_id: new objectId(userId)}).then((user) => {
                let experience = user.experience ? true : false;
                resolve({experience});
            })
        })
    },

    
    getUpdateProfilePushInProfileDomainSettings: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne({_id: new objectId(userId)}).then((user) => {
                let domain = user.workDomains ? true : false;
                resolve({domain});
            })
        })
    },

    
    insertloggedINTime: (userId) => {
        return new Promise((resolve, reject) => {
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
                        { userId: userId},
                        { $set: { lastlogged_In: currentTime } }
                    );
                })
                .then(() => {
                    resolve();
                })
            .catch((error) => {
                reject(error);
            });
        });
    },
    
    

    
    insertloggedOUTTime: (userId) => {
        return new Promise((resolve, reject) => {
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
                            { _id: new objectId(userId)},
                            { $set: { lastlogged_OUT: currentTime } }
                        );
                })
                .then(() => {
                    resolve();
                })
            .catch((error) => {
                reject(error);
            });
        });
    }, 


    countLogins: (userId) => {
        return new Promise((resolve, reject) => {
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
                reject(error);
            });
        });
    },


    addViewProfile: (userId, viewId) => {
        return new Promise((resolve, reject) => {
            const userCollection = db.getDb().collection(collection.USER_PROFILE_VIEW_OTHERUSER);
            userCollection.findOne({ user_id: userId })
                .then(user => {
                    if (!user) {
                        // User not found, create a new entry
                        const newUserEntry = {
                            user_id: userId,
                            viewerDetails: [{ viewId: viewId, timestamp: new Date() }],
                            existing_view_count: 1 // Initialize existing_view_count to 1
                        };
                        return userCollection.insertOne(newUserEntry);
                    } else {
                        // User found, update the viewerDetails array and increment existing_view_count
                        const viewDetail = { viewId: viewId, timestamp: new Date() };
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
                    reject(error);
                });
        });
    },    
    



    getViewNotifications: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.NOTIFICATION_COLLECTION).findOne({ Sender_Id: userId }).then((user) => {
                if (user && user.notification && user.notification.length > 0) {
                    resolve(user.notification);
                } else {
                    resolve([]);
                }
            }).catch((err) => {
                reject(err);
            });
        });
    },
    
    
    
    

    updateNote:(userId,userNote)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(userId)},{
                $set:{
                    Note:userNote.Note
                }
            }).then((response)=>{
                resolve()
            })
        })
    },


    updateskillProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
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
                        reject(error);
                    });
            } else {
                resolve();
            }
        });
    },      

    editskillProfile:(userId, userDetails) => {
        return new Promise((resolve, reject) => {
            const updateObject = {};
    
            if (userDetails.workDomains) {
                let filteredWorkDomains;
    
                if (Array.isArray(userDetails.workDomains)) {
                    filteredWorkDomains = userDetails.workDomains.filter(domain => domain !== null && domain.trim() !== "");
                } else {
                    if (userDetails.workDomains === null || userDetails.workDomains.trim() === "") {
                        resolve();
                        return;
                    }
    
                    filteredWorkDomains = [userDetails.workDomains];
                }
    
                // Use $set to replace existing values with the filtered values
                updateObject.$set = { workDomains: filteredWorkDomains };
            }
    
            // Check if there's anything to update
            if (updateObject.$set && updateObject.$set.workDomains.length > 0) {
                db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) }, updateObject)
                    .then((response) => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } else {
                // Nothing to update, resolve immediately
                resolve();
            }
        });
    },    

    updateexperienceProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
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
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }, 
    
    getExperienceDetails: (userId, experienceId) => {
        return new Promise((resolve, reject) => {
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
                reject(err);
            });
        });
    },

    updateExperience: (userId, experienceId, experienceBody) => {
        return new Promise((resolve, reject) => {
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
                reject(err);
            });
        });
    },    

    deleteExperience: (userId,experienceId) => {
        return new Promise((resolve, reject) => {
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
                reject(error);
            });
        });
    },
    
    getBaseAdmin: () => {
        return new Promise((resolve, reject) => {
            const adminCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            adminCollection.findOne({}, { projection: { Name: 1, _id: 0 } }).then((admin) => {
                if (admin) {
                    resolve(admin.Name);
                } else {
                    reject(new Error("Admin not found"));
                }
            }).catch((err) => {
                reject(err);
            });
        });
    },
    
    

    updateUPass: (User, userDetails) => {
        let OldP = User.Password;
        let NewP = userDetails.OldPass;
        let NewPW = userDetails.NewPass;
        let UserId = User._id;
        let response = {}
        return new Promise ((resolve, reject) => {
          bcrypt.compare(NewP,OldP).then(async(status) => {
            if (status){
              NewPW = await bcrypt.hash(NewPW, 10);
              db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(UserId)},
              {
                  $set: {
                    Password: NewPW,
                  },
                });
                response.status=true
              resolve(response)
            } else {
              resolve({status: false });
            }
          });
        });
      },

    doRecoveruserpass:(userDetails)=>{
        return new Promise(async(resolve,reject)=>{
            let response = {}
            let user = await db.getDb().collection(collection.USER_COLLECTION).findOne({Email:userDetails.Email})
            let OldP = userDetails.oldpassword;
            let NewP = user.Cpass;
            let NewPW = userDetails.newpassword;
            let userId = user._id

            if(user){
                bcrypt.compare(OldP,NewP).then(async(status)=>{
                    if(status){
                        NewPW = await bcrypt.hash(NewPW, 10);
                        db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId)},
                        {
                            $set: {
                                Password: NewPW,
                                Cpass:NewPW
                            },
                        });
                        response.status=true
                    resolve(response)
                    }else{
                        resolve({status:false})
                    }
                })
            }else{
                resolve({status:false})
            }
        })
    },

    userPassUpdateDetailLog: (userId) => {
        return new Promise((resolve, reject) => {
            let currentTime = new Date(); // Get current timestamp
            let UpdatePasslogEntry = {
                userId: userId,
                updatePasslogs: [{ Last_Updated: currentTime }] // Create an array with current timestamp
            };
            db.getDb().collection(collection.LOG_DETAILS_COLLECTION).findOne({ userId: userId })
                .then((existingEntry) => {
                    if (existingEntry) {
                        return db.getDb().collection(collection.LOG_DETAILS_COLLECTION)
                            .updateOne(
                                { userId: userId },
                                { $push: { updatePasslogs: { Last_Updated: currentTime } } }
                            );
                    } else {
                        return db.getDb().collection(collection.LOG_DETAILS_COLLECTION).insertOne(UpdatePasslogEntry);
                    }
                })
                .then(() => {
                    return db.getDb().collection(collection.USER_COLLECTION)
                    .updateOne(
                        { _id: new objectId(userId)},
                        { $set: { lastPasswordUpdated: currentTime } }
                    );
                })
                .then(() => {
                    resolve();
                })
            .catch((error) => {
                reject(error);
            });
        });
    },


    updateuserProfile: (userId, userDetails) => {
        return new Promise(async (resolve, reject) => {
            const userCollection = db.getDb().collection(collection.USER_COLLECTION);
            const user = await userCollection.findOne({ _id: new objectId(userId) });
            const currentTime = new Date();
    
            let updatedData = {
                $set: {
                    passoutYear: userDetails.passoutYear,
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
        });
    },

    handleGroupChatMessage: async (MessageId,userId,Name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY) => {
        try {
            // Insert the group chat message into the database
            await db.getDb().collection(collection.GROUP_CHAT_COLLECTION).insertOne({
                MessageId,
                userId,
                Name,
                messageContent,
                actualMessageId,
                actualMessageUsername,
                actualMessageContent,
                timestamp,
                status,
                SENDBY
            });
        } catch (error) {
            console.error(error);
            throw new Error("Error handling group chat message");
        }
    },

    handleOneChatMessage: async (MessageId, messageContent, actualMessageId, actualMessageContent, timestamp, status, Reciever_name, Reciever_Id, Sender_name, Sender_Id) => {
        try {
            const oneOnOneChatCollection = db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION);
    
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
                status
            });
    
            await oneOnOneChatCollection.updateOne({ Sender_Id }, { $set: { [Sender_Id]: senderChatDocument[Sender_Id] } });
    
        } catch (error) {
            console.error(error);
            throw new Error("Error handling one-on-one chat message");
        }
    },




    handleOneChatMessageAdmin: async (MessageId, messageContent, actualMessageId, actualMessageContent, timestamp, status, Reciever_name, Reciever_Id, Sender_name, Sender_Id) => {
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
                status
            });
    
            await oneOnOneChatCollection.updateOne({ Sender_Id }, { $set: { [Sender_Id]: senderChatDocument[Sender_Id] } });
    
        } catch (error) {
            console.error(error);
            throw new Error("Error handling one-on-one chat message");
        }
    },

    
    
    AddInverseChat: (receiver, sender) => {
        return new Promise(async (resolve, reject) => {
            try {
                const chatCollection = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK);
    
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
                    } else {
                        // Create a new entry with Reciever_Id and set count value to 1
                        existingEntry.inverse_chat.push({ Reciever_Id: receiver, count: 1 });
                    }
    
                    // Update the existing entry in the database
                    await chatCollection.updateOne({ Sender_Id: sender }, { $set: existingEntry });
                } else {
                    // Create a new entry if Sender_Id not present
                    const newEntry = {
                        Sender_Id: sender,
                        inverse_chat: [{ Reciever_Id: receiver, count: 1 }]
                    };
                    await chatCollection.insertOne(newEntry);
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    


    AddInverseChatAdmin: (receiver, sender) => {
        return new Promise(async (resolve, reject) => {
            try {
                const chatCollection = db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK_ADMIN);
    
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
                    } else {
                        // Create a new entry with Reciever_Id and set count value to 1
                        existingEntry.inverse_chat.push({ Reciever_Id: receiver, count: 1 });
                    }
    
                    // Update the existing entry in the database
                    await chatCollection.updateOne({ Sender_Id: sender }, { $set: existingEntry });
                } else {
                    // Create a new entry if Sender_Id not present
                    const newEntry = {
                        Sender_Id: sender,
                        inverse_chat: [{ Reciever_Id: receiver, count: 1 }]
                    };
                    await chatCollection.insertOne(newEntry);
                }
    
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },    


    getAllMessage:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.GROUP_CHAT_COLLECTION).find({}).toArray().then((messages) => {
                resolve(messages);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    deleteMessage: (messageId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({
                MessageId: messageId
            }).then((deletedMessage) => {
                // If the message exists, update its content and insert into DELETED_GROUP_CHAT_COLLECTION
                if (deletedMessage) {
                    // Save ImageNames and VideoNames arrays before deleting
                    const deletedImageNames = deletedMessage.ImageNames || [];
                    const deletedVideoNames = deletedMessage.VideoNames || [];
    
                    const updatedMessage = {
                        $set: {
                            messageContent: "This message was deleted",
                            deleteStatus: "deletedMessage",
                            ImageNames: [],
                            VideoNames: [],
                            deleted_time :new Date()
                        }
                    };
    
                    // Update the message in GROUP_CHAT_COLLECTION
                    db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({
                        MessageId: messageId
                    }, updatedMessage).then(() => {
                        // Insert the deleted message into DELETED_GROUP_CHAT_COLLECTION
                        deletedMessage.deletedtime = new Date();
                        db.getDb().collection(collection.DELETED_GROUP_CHAT_COLLECTION).insertOne(deletedMessage).then(() => {
                            // Add the deleted ImageNames and VideoNames arrays to DELETED_GROUP_CHAT_COLLECTION
                            deletedMessage.ImageNames = deletedImageNames;
                            deletedMessage.VideoNames = deletedVideoNames;
    
                            resolve({ deleteMessage: true });
                        }).catch((error) => {
                            reject(error);
                        });
                    }).catch((error) => {
                        reject(error);
                    });
                } else {
                    resolve({ deleteMessage: false, message: "Message not found" });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },


    deleteOneMessage: (messageId, Sender_Id, Reciever_Id) => {
        return new Promise((resolve, reject) => {
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
                                    [Sender_Id + '.' + Reciever_Id + '.' + deletedMessageIndex + '.deleted_time']: new Date(),
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
                        resolve({ deleteMessage: false, message: "Message not found" });
                    }
                } else {
                    resolve({ deleteMessage: false, message: "Sender or Receiver not found" });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },
    
    
    

    addPostGroup: (postData, timestamp,status) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postDocument = {
                    ...postData,
                    timestamp: timestamp,
                    status:status
                };
    
                const result = await db.getDb().collection(collection.GROUP_CHAT_COLLECTION).insertOne(postDocument);
                const insertedPostId = result.insertedId;
                resolve(insertedPostId);
            } catch (error) {
                reject(error);
            }
        });
    },


    addPostGroupImages:(postId,postNames)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({MessageId:postId},{
                $set:{
                    ImageNames:postNames
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    addPostGroupVideos:(postId,postNames)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({MessageId:postId},{
                $set:{
                    VideoNames:postNames
                }
            }).then((response)=>{
                resolve()
            })
        })
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
        });
    },



    addPostOneImagesAdmin: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    
    
    addPostOneVideos: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    


    addPostOneVideosAdmin: (Sender_Id, Reciever_Id, postId, postNames) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    
    

    oneONoneCHAT: (Sender_Id, Reciever_Id) => {
        return new Promise((resolve, reject) => {
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
        });
    },


    oneONoneCHATAdmin: (Sender_Id, Reciever_Id) => {
        return new Promise((resolve, reject) => {
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
                    if (err.message === "User not found in ONE_ON_ONE_CHAT_COLLECTION") {
                        // Handle the case when the document is not found
                        resolve([]);
                    } else {
                        console.error(err);
                        reject(err);
                    }
                });
        });
    },
    
    
    GetAllAdminBroadcastMessage: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
                const broadcastMessages = await adminBroadcastChatCollection.find({}).toArray();
                resolve(broadcastMessages);
            } catch (error) {
                console.error(error);
                reject("Error fetching broadcast message details");
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
        
    

    getJobDetails:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.JOB_COLLECTION).find({}).toArray().then((jobs) => {
                resolve(jobs);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    getDoc2VecJobModel: async () => {
        try {
            var jobs = await db.getDb().collection(collection.JOB_COLLECTION).find().toArray();
            const trainingData = [];
            jobs.forEach(jobs => {
                const jobInterests = {
                    CompanyName: jobs.CompanyName ? jobs.CompanyName : "",
                    CompanyDescription: jobs.CompanyDescription ? jobs.CompanyDescription : "",
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
    },    


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
            let job = await db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) });
            resolve(job);
        });
    },

    findUserIdFromJobId: (jobId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let job = await db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) });
                if (job) {
                    resolve({
                        job,
                        userId: job.UserId
                    });
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    },    

    getEditJobDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.JOB_COLLECTION)
                .find({ UserId: userId })
                .toArray()
                .then((jobs) => {
                    resolve(jobs);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },

    updateJob:(jobId,jobDetails)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.JOB_COLLECTION).updateOne({_id:new objectId(jobId)},{
                $set:{
                    CompanyName:jobDetails.CompanyName,
                    CompanyDescription:jobDetails.CompanyDescription,
                    Jobrole:jobDetails.Jobrole,
                    jobDescription:jobDetails.jobDescription,
                    Eligibility:jobDetails.Eligibility,
                    JobLink:jobDetails.JobLink
                }
            }).then((response)=>{
                resolve()
            })
        })
    },

    deleteJob: (jobId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.JOB_COLLECTION).deleteOne({
                _id: new objectId(jobId)
            }).then((response) => {
                resolve({ deleteJob: true });
            }).catch((error) => {
                reject(error);
            });
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
    

    updateInternResume:(internshipId,resumename)=>{
        return new Promise(async (resolve, reject) => {
            db.getDb().collection(collection.INTERN_COLLECTION).updateOne({_id:new objectId(internshipId)},{
                $set:{
                    resume:resumename
                }
            }).then((response)=>{
                resolve()
            })
        });
    },
    updateInternProfilePicture:(internshipId,picturename)=>{
        return new Promise(async (resolve, reject) => {
            db.getDb().collection(collection.INTERN_COLLECTION).updateOne({_id:new objectId(internshipId)},{
                $set:{
                    ProfilePicture:picturename
                }
            }).then((response)=>{
                resolve()
            })
        });
    },

    getDoc2VecInternModel: async () => {
        try {
            var internships = await db.getDb().collection(collection.INTERN_COLLECTION).find().toArray();
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
    },    
    

    getProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
            resolve(profile);
        });
    },


    getInternDetails:()=> {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.INTERN_COLLECTION).find({}).toArray().then((interns) => {
                resolve(interns);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    getIndividualInternshipDetails:(internshipId)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.INTERN_COLLECTION).findOne({_id:new objectId(internshipId)}).then((indintern)=>{
                resolve(indintern)
            })
        })
    },

    getEditInternshipDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.INTERN_COLLECTION)
                .find({ UserId: userId })
                .toArray()
                .then((interns) => {
                    resolve(interns);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },
     
    deleteInternship: (internshipId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.INTERN_COLLECTION).deleteOne({
                _id: new objectId(internshipId)
            }).then((internship) => {
                resolve({ deleteIntern: true });
            }).catch((error) => {
                reject(error);
            });
        });
    },

    getIndividualInternshipDetail: (internshipId) => {
        return new Promise(async (resolve, reject) => {
            let intern = await db.getDb().collection(collection.INTERN_COLLECTION).findOne({ _id: new objectId(internshipId) });
            resolve(intern);
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

    updateInternship: (internId, internshipDetails) => {
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
    
            db.getDb().collection(collection.INTERN_COLLECTION).updateOne(
                { _id: new objectId(internId) },
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
            ).then((response) => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    },
    

    addPost: (postData, timestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postDocument = {
                    ...postData,
                    timestamp: timestamp
                };
    
                const result = await db.getDb().collection(collection.POST_COLLECTION).insertOne(postDocument);
                const insertedPostId = result.insertedId;
                resolve(insertedPostId);
            } catch (error) {
                reject(error);
            }
        });
    },


    getOwnPostDetails:(userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.POST_COLLECTION)
                .find({ UserId: userId })
                .toArray()
                .then((posts) => {
                    resolve(posts);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },

    getOtherPostDetails: (userOwnId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.POST_COLLECTION)
                .find({ UserId: { $ne: userOwnId } })
                .toArray()
                .then((otherPosts) => {
                    //console.log("OTHER POSTS USER-HELPERS :",otherPosts)
                    resolve(otherPosts);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },


    addLike: (user_id, post_id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.POST_COLLECTION).updateOne(
                { _id: new objectId(post_id), likes: { $ne: user_id } }, // Check if user_id is not already present in likes array
                { 
                    $addToSet: { // Add user_id to likes array if it doesn't already exist
                        likes: user_id 
                    }
                }
            ).then((response) => {
                if (response.modifiedCount === 0) { // If modifiedCount is 0, it means user_id already existed in likes array, so remove it
                    return db.getDb().collection(collection.POST_COLLECTION).updateOne(
                        { _id: new objectId(post_id) },
                        { 
                            $pull: { // Remove user_id from likes array
                                likes: user_id
                            }
                        }
                    );
                } else {
                    resolve({ likesUpdated: true });
                }
            }).then(() => {
                resolve({ likesUpdated: true });
            }).catch((error) => {
                reject(error);
            });
        });
    },

    addComment: (postId, data, time, status) => {
        return new Promise((resolve, reject) => {
            const postCollection = db.getDb().collection(collection.POST_COLLECTION);
            const postIdQuery = { _id: new objectId(postId) };
            postCollection.findOne(postIdQuery)
                .then((post) => {
                    if (!post) {
                        reject("Post not found");
                        return;
                    }  
                    if (!post.comments) {
                        post.comments = [];
                    }   
                    const comment = {
                        comment_owner_id: data.comment_owner_id,
                        actual_post_id : data.post_id,
                        comment_owner_name: data.comment_owner_name,
                        messageContent: data.messageContent,
                        time: time,
                        status: status
                    };   
                    post.comments.push(comment);
                    // Update the post with the matching post_id
                    postCollection.updateOne({ _id: post._id }, { $set: { comments: post.comments } })
                        .then(() => {
                            resolve("Comment added successfully");
                        })
                        .catch((err) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },

    

    fetchCommentsByPostId: (postId) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    
    
    
    addPostImages:(postId,postNames)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.POST_COLLECTION).updateOne({_id:new objectId(postId)},{
                $set:{
                    ImageNames:postNames
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    addPostVideos:(postId,postNames)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.POST_COLLECTION).updateOne({_id:new objectId(postId)},{
                $set:{
                    VideoNames:postNames
                }
            }).then((response)=>{
                resolve()
            })
        })
    },


    getPostDetails:(postId)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.POST_COLLECTION).findOne({_id:new objectId(postId)}).then((indpost)=>{
                resolve(indpost)
            })
        })
    },

    editPost:(postId,postDetails)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.POST_COLLECTION).updateOne({_id:new objectId(postId)},{
                $set:{
                    description:postDetails.description,
                    location:postDetails.location
                }
            }).then((response)=>{
                resolve()
            })
        })
    },

    deletePost: (postId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.POST_COLLECTION).deleteOne({
                _id: new objectId(postId)
            }).then(() => {
                resolve({ deletePost: true });
            }).catch((error) => {
                reject(error);
            });
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
    

    getMentorDetails:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.MENTOR_COLLECTION).find({}).toArray().then((mentors) => {
                resolve(mentors);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    deleteMentor: (mentorId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.MENTOR_COLLECTION).deleteOne({
                _id: new objectId(mentorId)
            }).then((response) => {
                resolve({ deleteMentor: true });
            }).catch((error) => {
                reject(error);
            });
        });
    },

    addReply: (replyData, questionId) => {
        return new Promise(async (resolve, reject) => {
            try {
                replyData._id = new objectId();
                const timestamp = new Date(); // Current timestamp
                replyData.timestamp = timestamp; // Add timestamp to replyData
                const query = { _id: new objectId(questionId) };
                const update = { $push: { replies: replyData } };
                const result = await db.getDb().collection(collection.MENTOR_COLLECTION).updateOne(query, update);
    
                if (result.modifiedCount === 1) {
                    resolve(result);
                } else {
                    reject("Failed to add reply. No document updated.");
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    

    deleteMentorReply: (mentorReplyId, questionId) => {
        return new Promise((resolve, reject) => {
            const mentorId = { "replies._id": new objectId(mentorReplyId) };
    
            db.getDb().collection(collection.MENTOR_COLLECTION)
                .updateOne(
                    { _id: new objectId(questionId) },
                    { $pull: { replies: { _id: new objectId(mentorReplyId) } } }
                )
                .then((response) => {
                    if (response.modifiedCount > 0) {
                        resolve({ deleteMentor: true });
                    } else {
                        resolve({ deleteMentor: false, message: "Mentor reply not found" });
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },

    editQuestion: (questionData, questionId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.MENTOR_COLLECTION)
                .updateOne(
                    { _id: new objectId(questionId) },
                    { $set: { questionInput: questionData } }
                )
                .then((result) => {
                    if (result.modifiedCount > 0) {
                        resolve({ success: true, message: 'Question updated successfully' });
                    } else {
                        resolve({ success: false, message: 'Question not found' });
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },

    editReply: (questionData, questionId, replyId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.MENTOR_COLLECTION)
                .findOne({ _id: new objectId(questionId) })
                .then((questionDocument) => {
                    if (!questionDocument) {
                        resolve({ success: false, message: 'Question not found' });
                        return;
                    }
    
                    const replyToUpdate = questionDocument.replies.find(reply => reply._id.toString() === replyId);
                    if (!replyToUpdate) {
                        resolve({ success: false, message: 'Reply not found' });
                        return;
                    }
    
                    // Update the questionInput with questionData
                    replyToUpdate.questionInput = questionData;
    
                    // Check if replyInput exists and update it
                    if ('replyInput' in replyToUpdate) {
                        replyToUpdate.replyInput = questionData;
                    }
    
                    // Update the document in the collection
                    db.getDb().collection(collection.MENTOR_COLLECTION)
                        .updateOne(
                            { _id: new objectId(questionId) },
                            { $set: { replies: questionDocument.replies } }
                        )
                        .then((result) => {
                            if (result.modifiedCount > 0) {
                                resolve({ success: true, message: 'Reply updated successfully' });
                            } else {
                                resolve({ success: false, message: 'Reply not found' });
                            }
                        })
                        .catch((err) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },


    getsendedMessageUIDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION).findOne({ Sender_Id: userId }).then((messageUI) => {
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
            }).catch((err) => {
                reject(err);
            });
        });
    },



    getsendedMessageUIDetailsAdmin: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION_ADMIN).findOne({ Sender_Id: userId }).then((messageUI) => {
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
            }).catch((err) => {
                reject(err);
            });
        });
    },
    



    getReceivedMessageUIDetails: (userId) => {
        return new Promise((resolve, reject) => {
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
        });
    },




    getReceivedMessageUIDetailsAdmin: (userId) => {
        return new Promise((resolve, reject) => {
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
            const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
    
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
        });
    },



    updateTimeUnreadAdmin: (Sender_Id, roomId, timeStamp, messageCount) => {
        return new Promise((resolve, reject) => {
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
        });
    },


    UpdateLastMessage: (Sender_Id, roomId, last_message_id) => {
        return new Promise((resolve, reject) => {
            const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
    
            const query = { roomId: roomId, Sender_Id: Sender_Id };
            const update = { $set: { last_message_id: last_message_id } };
            const options = { upsert: true };
    
            userCollection.updateOne(query, update, options)
                .then(() => {
                    resolve({ updateTimeUnread: true });
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },


    FetchLastMessageId: (Sender_Id, roomId) => {
        return new Promise((resolve, reject) => {
            const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
    
            const query = { roomId: roomId, Sender_Id: Sender_Id };
            userCollection.findOne(query, { projection: { last_message_id: 1 } })
                .then((result) => {
                    if (result) {
                        resolve(result.last_message_id);
                    } else {
                        resolve(null); // Handle case where last_message_id is not found
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    


    updateEnteredTimeUnread: (Sender_Id,Reciever_Id, roomId, time_entered_inchat) => {
        return new Promise((resolve, reject) => {
            const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
    
            // Check if there is an entry with Sender_Id and roomId
            userCollection.findOne({ Sender_Id: Sender_Id,Reciever_Id:Reciever_Id, roomId: roomId })
                .then((result) => {
                    if (result) {
                        // Entry with Sender_Id and roomId exists
                        // Check if time_entered_inchat entry exists
                        if (result.time_entered_inchat) {
                            // Update time_entered_inchat
                            userCollection.updateOne({ Sender_Id: Sender_Id,Reciever_Id:Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
                                .then(() => {
                                    resolve("Updated time_entered_inchat successfully");
                                })
                                .catch((err) => {
                                    reject(err);
                                });
                        } else {
                            // Insert time_entered_inchat
                            userCollection.updateOne({ Sender_Id: Sender_Id,Reciever_Id:Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
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
                            Reciever_Id:Reciever_Id,
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
        });
    },    



    updateEnteredTimeUnreadAdmin: (Sender_Id,Reciever_Id, roomId, time_entered_inchat) => {
        return new Promise((resolve, reject) => {
            const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
    
            // Check if there is an entry with Sender_Id and roomId
            userCollection.findOne({ Sender_Id: Sender_Id,Reciever_Id:Reciever_Id, roomId: roomId })
                .then((result) => {
                    if (result) {
                        // Entry with Sender_Id and roomId exists
                        // Check if time_entered_inchat entry exists
                        if (result.time_entered_inchat) {
                            // Update time_entered_inchat
                            userCollection.updateOne({ Sender_Id: Sender_Id,Reciever_Id:Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
                                .then(() => {
                                    resolve("Updated time_entered_inchat successfully");
                                })
                                .catch((err) => {
                                    reject(err);
                                });
                        } else {
                            // Insert time_entered_inchat
                            userCollection.updateOne({ Sender_Id: Sender_Id,Reciever_Id:Reciever_Id, roomId: roomId }, { $set: { time_entered_inchat: time_entered_inchat } })
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
                            Reciever_Id:Reciever_Id,
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
        });
    },    
    
    
    
    /*getArrayCount: (Receiver_Id, Sender_Id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION)
                .find({ "Sender_Id": Sender_Id })
                .toArray()
                .then((entries) => {
                    let result = [];                      // PRIMITIVE
                    entries.forEach((entry) => {
                        let senderId = entry.Sender_Id;
                        if (entry[senderId] && entry[senderId][Receiver_Id]) {
                            let userArray = entry[senderId][Receiver_Id];
                            if (userArray && userArray.length > 0) {
                                let userEntry = {
                                    userArrayLength: userArray.length
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
        });
    },*/


    getArrayCountAdmin: (Sender_Id, Receiver_Id) => {
        return new Promise((resolve, reject) => {
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
        });
    },


    getArrayCount: (Sender_Id, Receiver_Id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.CHAT_BACK_AND_FORTH_BOOK)
                .findOne({ Sender_Id: Sender_Id })                        // ADVANCED
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
        });
    },
    
      
    
    
    chatCOUNT: (userId) => {
        return new Promise((resolve, reject) => {
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
        });
    },




    chatCOUNTAdmin: (userId) => {
        return new Promise((resolve, reject) => {
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
        });
    },



    
    // getReceivedMessageSendDetails: (userId) => {
    //     return new Promise((resolve, reject) => {
    //         db.getDb().collection(collection.ONE_ON_ONE_CHAT_COLLECTION)
    //             .find({ "Sender_Id": { $ne: userId } })
    //             .toArray()
    //             .then((entries) => {              // PRIMITIVE
    //                 const result = [];
    //                 entries.forEach((entry) => {
    //                     const senderId = entry.Sender_Id;
    //                     if (entry[senderId] && entry[senderId][userId]) {
    //                         const userArray = entry[senderId][userId];
    //                         if (userArray.length > 0) {
    //                             result.push(senderId); // Push the senderId directly
    //                         }
    //                     }
    //                 });
    //                 resolve(result);
    //             })
    //             .catch((error) => {
    //                 reject(error);
    //             });
    //     });
    // },

    getReceivedMessageSendDetails: (userId) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    


    getReceivedMessageSendDetailsAdmin: (userId) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    




    LastEnteredChatWith: (last_entered_time, Sender_Id) => {
        return new Promise((resolve, reject) => {
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
        });
    },    


    ChatRoomUpdateOnProfileReturns: (Sender_Id, timestamp, sender_entry) => {
        return new Promise((resolve, reject) => {
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
                })// manually checking weather sender_list_count has same value as number of entries inside sender_list
                // this manual check is done because there is an error occuring, that is sender_list count is not getting 
                // incremented when we first enter chat with and then go for direct profrle messaging
                // when entering chatwith first, then a similar entry is genetrated with empty arrays and entered time to chatwith is marked
                // after that, increment wont work when we enter individual chat using direct profile
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
        });
    },




    ChatRoomUpdateOnProfileReturnsAdmin: (Sender_Id, timestamp, sender_entry) => {
        return new Promise((resolve, reject) => {
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
                })// manually checking weather sender_list_count has same value as number of entries inside sender_list
                // this manual check is done because there is an error occuring, that is sender_list count is not getting 
                // incremented when we first enter chat with and then go for direct profrle messaging
                // when entering chatwith first, then a similar entry is genetrated with empty arrays and entered time to chatwith is marked
                // after that, increment wont work when we enter individual chat using direct profile
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
        });
    },
    
       


    ChatRoomUpdate: (Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count) => {
        return new Promise((resolve, reject) => {
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
        });
    },



    ChatRoomUpdateAdmin: (Sender_Id, timestamp, Send_List, Reciever_List, Send_List_count, Recieve_List_count) => {
        return new Promise((resolve, reject) => {
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



      FetchupdateTimeUnread: (roomIdCollection, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
                // TIME_UNREAD_COLLECTION is used to store details when leaving individual
                const result = await userCollection.find({ roomId: { $in: roomIdCollection }, Sender_Id: userId }).toArray();
    
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



    FetchupdateTimeUnreadAdmin: (roomIdCollection, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION_ADMIN);
                // TIME_UNREAD_COLLECTION is used to store details when leaving individual
                const result = await userCollection.find({ roomId: { $in: roomIdCollection }, Sender_Id: userId }).toArray();
    
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


    FetchupdateTimeUnreadSeen: (roomIdCollection, Send_List) => {
        return new Promise(async (resolve, reject) => {
            try {
                let lastSeen = [];
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
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
                const userCollection = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
    
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
        });
    },    


    LeaveAdminMessageOne: (myID, leaved_timeStamp) => {
        return new Promise((resolve, reject) => {
            const adminMessageEntryCollection = db.getDb().collection(collection.ADMIN_CHAT_ENTRY_HISTORY);
            
            // Check if there's an entry with Sender_Id same as myID
            adminMessageEntryCollection.findOne({ Sender_Id: myID })
                .then((entry) => {
                    if (entry) {
                        // If entry exists, check if leaved_timeStamp field is present
                        if (!entry.leaved_timeStamp) {
                            // If leaved_timeStamp not present, create and set the value
                            adminMessageEntryCollection.updateOne({ _id: entry._id }, { $set: { leaved_timeStamp } })
                                .then(() => resolve("leaved_timeStamp field created and set"))
                                .catch((error) => reject(error));
                        } else {
                            // If leaved_timeStamp already present, update the value
                            adminMessageEntryCollection.updateOne({ _id: entry._id }, { $set: { leaved_timeStamp } })
                                .then(() => resolve("leaved_timeStamp field updated"))
                                .catch((error) => reject(error));
                        }
                    } else {
                        // If entry with Sender_Id same as myID is not present, create one
                        adminMessageEntryCollection.insertOne({ Sender_Id: myID, leaved_timeStamp })
                            .then(() => resolve("New entry created with leaved_timeStamp"))
                            .catch((error) => reject(error));
                    }
                })
                .catch((error) => reject(error));
        });
    },  
    
    
    fetchAdminBroadcastEntryDetailsBySenderID: (Sender_Id) => {
        return new Promise((resolve, reject) => {
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
                const regexPattern = new RegExp(Name, 'i');   
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
                const regexPattern = new RegExp(Name, 'i');   
                const cursor = userCollection.find({ passoutYear: { $regex: regexPattern } });                    
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();                   
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        passoutYear:user.passoutYear,
                        employementStatus: user.employmentStatus
                    });
                });    
                resolve(userNamesDetails);
            } catch (error) {
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
    
                // Construct a regex pattern that allows for optional spaces between characters in the location name
                const regexPattern = new RegExp(Name.split('').join('\\s*'), 'i');   
    
                // Construct a modified regex pattern to allow optional spaces before each character
                const modifiedRegexPattern = new RegExp(Name.replace(/\s+/g, '\\s*'), 'i');
    
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
                resolve(userNamesDetails);
            } catch (error) {
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
    
                // Construct a regex pattern that allows for optional spaces between characters in the domain name
                const regexPattern = new RegExp(Name.split('').join('\\s*'), 'i');   
    
                // Construct a modified regex pattern to allow optional spaces before each character
                const modifiedRegexPattern = new RegExp(Name.replace(/\s+/g, '\\s*'), 'i');
    
                // Use $or operator to search using both regex patterns
                const cursor = userCollection.find({ $or: [
                    { workDomains: { $regex: regexPattern } },
                    { workDomains: { $regex: modifiedRegexPattern } }
                ]});
    
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
    
    
    
    GetFilteredUsersThroughSearch: (filter) => {
        return new Promise(async (resolve, reject) => {
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);    
                let query = { 
                    Status: { $in: ["Student", "Alumni"] }
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
                    // Construct a regex pattern that allows for optional spaces between characters in the location name
                    const regexLocation = new RegExp(filter.searchLocation.split('').join('\\s*'), 'i');
                    query.currentLocation = { $regex: regexLocation };
                }
                
                if (filter.Branch && filter.Branch !== '') {
                    query.Branch = filter.Branch;
                }
                
                if (filter.searchDomain && filter.searchDomain !== '') {
                    // Construct a regex pattern that allows for optional spaces between characters in the domain name
                    const regexDomain = new RegExp(filter.searchDomain.split('').join('\\s*'), 'i');
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
            const jobId = new objectId(job);
            const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
    
            // Find the job by ID
            const existingJob = await jobCollection.findOne({ _id: jobId });
            if (!existingJob) {
                reject("Job not found");
                return;
            }
    
            // Check if the job already has a requests array
            if (!existingJob.requests) {
                // If no requests array, create a new one and insert the user
                existingJob.requests = [user];
            } else {
                const userIndex = existingJob.requests.indexOf(user);
                if (userIndex === -1) {
                    // User is not in the requests array, insert the user
                    existingJob.requests.push(user);
                } else {
                    // User is already in the requests array, remove the user
                    existingJob.requests.splice(userIndex, 1);
                }
            }
    
            // Update the job document in the collection
            jobCollection.updateOne({ _id: jobId }, { $set: { requests: existingJob.requests } })
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },


    putJobRecomendationScore: (jobId) => {
        return new Promise(async (resolve, reject) => {
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
        });
    },


    getuserDetailsForrequest: (users) => {
        return new Promise((resolve, reject) => {
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
        });
    },

    searchMentor: (mentorkeyword) => {
        function convertToString(value) {
            if (typeof value === 'string') {
                // If the value is already a string, return it as is
                return value;
            } else if (typeof value === 'object' && value !== null) {
                // If the value is an object and not null, extract the string value from the 'searchName' property
                const searchString = value.searchName || '';
                return searchString.toString();
            } else if (value !== undefined && value !== null) {
                // For other non-null and non-undefined values, convert to string using toString()
                return value.toString();
            } else {
                // For undefined, null, and other falsy values, return an empty string
                return '';
            }
        }
    
        return new Promise((resolve, reject) => {
            // Convert mentorkeyword to string using convertToString function
            mentorkeyword = convertToString(mentorkeyword);
    
            // Split the mentorkeyword into individual words
            const keywords = mentorkeyword.split(/\s+/);
    
            // Build an aggregation pipeline to perform the search and sorting
            const pipeline = [
                {
                    $addFields: {
                        matchedWords: {
                            $size: {
                                $setIntersection: [
                                    keywords,
                                    { $split: [{ $toString: '$questionInput' }, ' '] }, // Split the questionInput into words using space as delimiter
                                    {
                                        $reduce: {
                                            input: '$replies',
                                            initialValue: [],
                                            in: {
                                                $concatArrays: [
                                                    '$$value',
                                                    { $split: [{ $toString: '$$this.questionInput' }, ' '] } // Split the questionInput inside replies into words using space as delimiter
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
                            { questionInput: { $regex: new RegExp(keywords.join('|'), 'i') } }, // Match any keyword in questionInput
                            { 'replies.questionInput': { $regex: new RegExp(keywords.join('|'), 'i') } } // Match any keyword in replies.questionInput
                        ]
                    }
                },
                { $sort: { matchedWords: -1 } } // Sort by matchedWords in descending order
            ];
    
            db.getDb().collection(collection.MENTOR_COLLECTION).aggregate(pipeline).toArray()
                .then((mentors) => {
                    resolve(mentors);
                }).catch((err) => {
                    reject(err);
                });
        });
    },
    

    InsertDeletionIdReasonAccountUser: (user_id, reason) => {
        return new Promise((resolve, reject) => {
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
        });
    },
    


// markDeletion: (user_id) => {
//     return new Promise((resolve, reject) => {
//         db.getDb().collection(collection.USER_COLLECTION).findOneAndUpdate(
//             { _id: new objectId(user_id) }, // Find the entry with matching user_id
//             { $set: { activeStatus: 'inactive' } }, // Set activeStatus as 'inactive'
//             { upsert: true, returnOriginal: false }
//         ).then((result) => {
//             resolve(result.value); // Return the updated or newly created entry
//         }).catch((error) => {
//             reject(error);
//         });
//     });
// },


markDeletion: (user_id) => {
    return new Promise((resolve, reject) => {
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
    });
},

ReactivateUserAccount: (user_id) => {
    return new Promise((resolve, reject) => {
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
    });
},


GetUserThroughSearchID: (userId) => {
    return new Promise(async (resolve, reject) => {
        let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
        resolve(profile);
    });
},

sendReportData: (user_id, reporter_id, report_reason) => {
    return new Promise(async (resolve, reject) => {
        const reportcollection = db.getDb().collection(collection.USER_REPORTS_REPORTED);
        let profile = await reportcollection.findOne({ user_id: user_id });
        if (!profile) {
            profile = {
                user_id: user_id,
                reports: []
            };
        }
        if (!profile.reports) {
            profile.reports = [];
        }
        profile.reports.push({
            reporter_id: reporter_id,
            report_reason: report_reason,
            reported_time: new Date()
        });
        const result = await reportcollection.updateOne({ user_id: user_id }, { $set: profile }, { upsert: true });
        resolve(result);
    });
},
    

sendBlockData: (user_id, blocked_id, block_reason) => {
    return new Promise(async (resolve, reject) => {
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


addaskImages:(insertedAskId,askNames)=>{
    return new Promise((resolve,reject)=>{
        db.getDb().collection(collection.ADMIN_ASK_QUESTION).updateOne({_id:new objectId(insertedAskId)},{
            $set:{
                ImageNames:askNames
            }
        }).then((response)=>{
            resolve()
        })
    })
},


addaskVideos:(insertedAskId,askNames)=>{
    return new Promise((resolve,reject)=>{
        db.getDb().collection(collection.ADMIN_ASK_QUESTION).updateOne({_id:new objectId(insertedAskId)},{
            $set:{
                VideoNames:askNames
            }
        }).then((response)=>{
            resolve()
        })
    })
},


addAskedAdmin: (askData,Name_IN,user_id, timestamp) => {
    return new Promise(async (resolve, reject) => {
        try {
            const postDocument = {
                ...askData,
                Name_IN,
                user_id,
                timestamp: timestamp
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

                const postQuery = { _id: postId };
                const postUpdate = { $set: { LastLeavedLikeCount: likeCount } };
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
                    likeCount: post.LastLeavedLikeCount || 0 // If LastLeavedLikeCount is not present, default to 0
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
                if (post.likes && Array.isArray(post.likes)) {
                    likeCount = post.likes.length; // Get the count of likes if likes array is present
                }
                const notification = {
                    _id: (post._id).toString(),
                    likeCount: likeCount // Return the likeCount in the notification
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
            const EX_rec_chat = db.getDb().collection(collection.TIME_UNREAD_COLLECTION);
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


// storeNotification: 
// (
//     userId, post_notif, postcount, like_notif, increasedIds, 
//     like_notify_number, groupchat_notif, groupchatcount, 
//     interncount, intern_notif, mentorcount, mentor_notif, 
//     jobcount, job_notif, total_new_mess, new_mess_notif, 
//     newmessages, mess_count_notify_number, new_messenger_count_notif, 
//     total_new_Admin_mess, new_admin_mess_notif, admin_broadcast,
//     new_admin_broad_notif, new_view_user_count, new_view_notif,upass_diff,
//     adminViewCheckStat,adminViewCheckStatLength,adminViewConsentPending,
//     newReplieObtainedQuestions,mentorQuestionNumbers,new_mentor_reply_notif
// ) => { return new Promise(async (resolve, reject) => {
//         try {
//             const broadlastentrytimeCollection = db.getDb().collection(collection.NOTIFICATION_COLLECTION);
//             const entry = await broadlastentrytimeCollection.findOne({ Sender_Id: userId });

//             if (entry) {
//                 const latestNotification = entry.notification[entry.notification.length - 1];
//                 let isChanged = false;

//                 // Compare incoming parameters with latest entry in notification array
//                 if (
//                     latestNotification.post_notif !== post_notif ||
//                     latestNotification.postcount !== postcount ||
//                     latestNotification.like_notif !== like_notif ||
//                     latestNotification.like_notify_number !== like_notify_number ||
//                     latestNotification.groupchat_notif !== groupchat_notif ||
//                     latestNotification.groupchatcount !== groupchatcount ||
//                     latestNotification.interncount !== interncount ||
//                     latestNotification.intern_notif !== intern_notif ||
//                     latestNotification.mentorcount !== mentorcount ||
//                     latestNotification.mentor_notif !== mentor_notif ||
//                     latestNotification.jobcount !== jobcount ||
//                     latestNotification.job_notif !== job_notif ||
//                     latestNotification.total_new_mess !== total_new_mess ||
//                     latestNotification.new_mess_notif !== new_mess_notif ||
//                     latestNotification.mess_count_notify_number !== mess_count_notify_number ||
//                     latestNotification.new_messenger_count_notif !== new_messenger_count_notif ||
//                     latestNotification.total_new_Admin_mess !== total_new_Admin_mess ||
//                     latestNotification.new_admin_mess_notif !== new_admin_mess_notif ||
//                     latestNotification.admin_broadcast !== admin_broadcast ||
//                     latestNotification.new_admin_broad_notif !== new_admin_broad_notif ||
//                     latestNotification.new_view_user_count !== new_view_user_count ||
//                     latestNotification.new_view_notif !== new_view_notif || 
//                     latestNotification.adminViewCheckStatLength !== adminViewCheckStatLength || 
//                     latestNotification.adminViewConsentPending !== adminViewConsentPending ||
//                     latestNotification.mentorQuestionNumbers !== mentorQuestionNumbers ||
//                     latestNotification.new_mentor_reply_notif !== new_mentor_reply_notif 
//                 ) {
//                     isChanged = true;
//                 }

//                 if (isChanged) {
//                     // Create a new entry with current time and set all incoming parameters
//                     const newNotification = {
//                         entered_timeStamp: new Date(),
//                         post_notif,
//                         postcount,
//                         like_notif,
//                         increasedIds,
//                         like_notify_number,
//                         groupchat_notif,
//                         groupchatcount,
//                         interncount,
//                         intern_notif,
//                         mentorcount,
//                         mentor_notif,
//                         jobcount,
//                         job_notif,
//                         total_new_mess,
//                         new_mess_notif,
//                         newmessages,
//                         mess_count_notify_number,
//                         new_messenger_count_notif,
//                         total_new_Admin_mess,
//                         new_admin_mess_notif,
//                         admin_broadcast,
//                         new_admin_broad_notif,
//                         new_view_user_count,
//                         new_view_notif,
//                         upass_diff,
//                         adminViewCheckStat,
//                         adminViewCheckStatLength,
//                         adminViewConsentPending,
//                         newReplieObtainedQuestions,
//                         mentorQuestionNumbers,
//                         new_mentor_reply_notif
//                     };

//                     // Set non-changed values in previous entry to null
//                     // Object.keys(latestNotification).forEach((key) => {
//                     //     if (!(key in newNotification)) {
//                     //         latestNotification[key] = null;
//                     //     }
//                     // });

//                     entry.notification.push(newNotification);

//                     // Discard last entry if more than 7 entries
//                     if (entry.notification.length > 7) {
//                         entry.notification.shift();
//                     }

//                     await broadlastentrytimeCollection.updateOne({ Sender_Id: userId }, { $set: { notification: entry.notification } });
//                 } else {
//                     // If no changes, update the timestamp of the latest entry
//                     latestNotification.entered_timeStamp = new Date();
//                     await broadlastentrytimeCollection.updateOne({ Sender_Id: userId }, { $set: { notification: entry.notification } });
//                 }

//                 resolve(entry.notification[entry.notification.length - 1].entered_timeStamp);
//             } else {
//                 // If no entry found, create a new entry
//                 const newNotification = {
//                     entered_timeStamp: new Date(),
//                     post_notif,
//                     postcount,
//                     like_notif,
//                     increasedIds,
//                     like_notify_number,
//                     groupchat_notif,
//                     groupchatcount,
//                     interncount,
//                     intern_notif,
//                     mentorcount,
//                     mentor_notif,
//                     jobcount,
//                     job_notif,
//                     total_new_mess,
//                     new_mess_notif,
//                     newmessages,
//                     mess_count_notify_number,
//                     new_messenger_count_notif,
//                     total_new_Admin_mess,
//                     new_admin_mess_notif,
//                     admin_broadcast,
//                     new_admin_broad_notif,
//                     new_view_user_count,
//                     new_view_notif,
//                     upass_diff,
//                     adminViewCheckStat,
//                     adminViewCheckStatLength,
//                     adminViewConsentPending,
//                     newReplieObtainedQuestions,
//                     mentorQuestionNumbers,
//                     new_mentor_reply_notif
//                 };

//                 const newEntry = {
//                     Sender_Id: userId,
//                     notification: [newNotification],
//                 };

//                 await broadlastentrytimeCollection.insertOne(newEntry);
//                 resolve(newNotification.entered_timeStamp);
//             }
//         } catch (error) {
//             reject(error);
//         }
//     });
// },



storeNotification: (
    userId, post_notif, postcount, like_notif, increasedIds, 
    like_notify_number, groupchat_notif, groupchatcount, 
    interncount, intern_notif, mentorcount, mentor_notif, 
    jobcount, job_notif, total_new_mess, new_mess_notif, 
    newmessages, mess_count_notify_number, new_messenger_count_notif, 
    total_new_Admin_mess, new_admin_mess_notif, admin_broadcast,
    new_admin_broad_notif, new_view_user_count, new_view_notif,upass_diff,
    adminViewCheckStat,adminViewCheckStatLength,adminViewConsentPending,
    newReplieObtainedQuestions,mentorQuestionNumbers,new_mentor_reply_notif
) => { return new Promise(async (resolve, reject) => {
        try {
            const broadlastentrytimeCollection = db.getDb().collection(collection.NOTIFICATION_COLLECTION);
            const fullNotificationCollection = db.getDb().collection(collection.FULL_NOTIFICATION_COLLECTION);

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
                    latestNotification.new_mentor_reply_notif !== new_mentor_reply_notif 
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
                        new_mentor_reply_notif
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
                        await fullNotificationCollection.insertOne({ Sender_Id: userId, notification: [discardedEntry] });
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
                    new_mentor_reply_notif
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
    });
},
   


EnableVisitTransfer: (userID) => {
    return new Promise((resolve, reject) => {
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



}
