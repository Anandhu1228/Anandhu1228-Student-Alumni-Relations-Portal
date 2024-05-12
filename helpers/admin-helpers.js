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

    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {};
            let admin = await db.getDb().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email });
            if (admin) {
                if(admin.access == true)
                {
                    bcrypt.compare(adminData.key_1, admin.key1).then((status1) => {
                        bcrypt.compare(adminData.key_2, admin.key2).then((status2) => {
                            if (status1 && status2) {
                                console.log("login success");
                                response.admin = admin;
                                response.status = true;
        
                                //const loginTimestamp = new Date();
                                //db.getDb().collection(collection.LOG_DETAILS_COLLECTION).updateOne({ _id: admin._id }, {
                                //    $set: {
                                //        lastLogin: loginTimestamp
                                //    }
                                //});
        
                                resolve(response);
                            } else {
                                console.log("login failed");
                                resolve({ status: false });
                            }
                        });
                    });
                }
                else{resolve({ accesssfail: true });}
            } else {
                console.log("login failed");
                resolve({ status: false });
            }
        });
    },

    insertloggedINTime: (adminId) => {
        return new Promise((resolve, reject) => {
            let currentTime = new Date(); // Get current timestamp
            let logEntry = {
                adminId: adminId,
                logs: [{ loggedIN: currentTime }] // Create an array with current timestamp
            };
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne({ adminId: adminId })
                .then((existingEntry) => {
                    if (existingEntry) {
                        return db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION)
                            .updateOne(
                                { adminId: adminId },
                                { $push: { logs: { loggedIN: currentTime } } }
                            );
                    } else {
                        return db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).insertOne(logEntry);
                    }
                })
                .then(() => {
                    return db.getDb().collection(collection.USER_COLLECTION)
                    .updateOne(
                        { _id: new objectId(adminId)},
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

    
    insertloggedOUTTime: (adminId) => {
        return new Promise((resolve, reject) => {
            let currentTime = new Date(); // Get current timestamp
            let logEntry = {
                adminId: adminId,
                logs: [{ loggedOUT: currentTime }] // Create an array with current timestamp
            };
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne({ adminId: adminId })
                .then((existingEntry) => {
                    if (existingEntry) {
                        return db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION)
                            .updateOne(
                                { adminId: adminId },
                                { $push: { logs: { loggedOUT: currentTime } } }
                            );
                    } else {
                        return db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).insertOne(logEntry);
                    }
                })
                .then(() => {
                    return db.getDb().collection(collection.USER_COLLECTION)
                        .updateOne(
                            { _id: new objectId(adminId)},
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

    GetAllUserThroughSearch: (Name) => {
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
                        Status: user.Status
                    });
                });    
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },


    /*GetUserSuggestions: (searchName) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const regexPattern = new RegExp(searchName, 'i');
                const cursor = userCollection.find({ Name: { $regex: regexPattern } }).limit(10); // Limit suggestions to 10
                const suggestions = await cursor.toArray();
                resolve(suggestions);
            } catch (error) {
                reject(error);
            }
        });
    },*/
    



    GetAdminAlumniNameThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
                const regexPattern = new RegExp(Name, 'i');   
                const cursor = userCollection.find({ Name: { $regex: regexPattern }, Status: "Alumni" }); // Updated query to filter by "Status" equal to "Alumni"                  
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();                   
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        employmentStatus: user.employmentStatus
                    });
                });    
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },


    GetAdminAlumniPassoutThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
                const regexPattern = new RegExp(Name, 'i');   
                const cursor = userCollection.find({ passoutYear: { $regex: regexPattern }, Status: "Alumni" }); // Updated query to filter by "passoutYear" and "Status" equal to "Alumni"                    
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();                   
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        passoutYear: user.passoutYear,
                        employementStatus: user.employmentStatus
                    });
                });    
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },
    


    GetAdminAlumniLocationThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
    
                // Construct a regex pattern that allows for optional spaces between characters in the location name
                const regexPattern = new RegExp(Name.replace(/\s/g, '\\s*'), 'i');   
    
                // Construct a modified regex pattern to allow optional spaces before each character
                const modifiedRegexPattern = new RegExp(Name.split('').join('\\s*').replace(/\\s\*/g, '\\s*'), 'i');
    
                // Use $or operator to search using both regex patterns
                const cursor = userCollection.find({ $or: [
                    { currentLocation: { $regex: regexPattern }, Status: "Alumni" },
                    { currentLocation: { $regex: modifiedRegexPattern }, Status: "Alumni" }
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
    
    


    GetAdminAlumniDomainThroughSearch: (Name) => {
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
                    { workDomains: { $regex: regexPattern }, Status: "Alumni" },
                    { workDomains: { $regex: modifiedRegexPattern }, Status: "Alumni" }
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
    
   
    GetAdminAlumniFilteredThroughSearch: (filter) => {
        return new Promise(async (resolve, reject) => {
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                let query = { Status: "Alumni" };
    
                if (filter.searchPassout && filter.searchPassout !== '') {
                    query.passoutYear = filter.searchPassout;
                }

                if (filter.Branch && filter.Branch !== '') {
                    query.Branch = filter.Branch;
                }
    
                if (filter.searchLocation && filter.searchLocation !== '') {
                    // Construct a regex pattern that allows for optional spaces between characters in the location name
                    const regexLocation = new RegExp(filter.searchLocation.split('').join('\\s*'), 'i');
                    query.currentLocation = { $regex: regexLocation };
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
                        passoutYear: user.passoutYear,
                        currentLocation: user.currentLocation,
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
    
    
    GetAdminStudentNameThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
                const regexPattern = new RegExp(Name, 'i');   
                const cursor = userCollection.find({ Name: { $regex: regexPattern }, Status: "Student" }); // Updated query to filter by "Status" equal to "Alumni"                  
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();                   
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        AdmissionYear : user.AdmissionYear
                    });
                });    
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },
    


    GetAdminStudentAdmissionYearThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
                const regexPattern = new RegExp(Name, 'i');   
                const cursor = userCollection.find({ AdmissionYear: { $regex: regexPattern }, Status: "Student" }); // Updated query to filter by "passoutYear" and "Status" equal to "Alumni"                    
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();                   
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
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
    


    GetAdminStudentLocationThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            if (!Name) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);   
    
                // Construct a regex pattern that allows for optional spaces between characters in the location name
                const regexPattern = new RegExp(Name.replace(/\s/g, '\\s*'), 'i');   
    
                // Construct a modified regex pattern to allow optional spaces before each character
                const modifiedRegexPattern = new RegExp(Name.split('').join('\\s*').replace(/\\s\*/g, '\\s*'), 'i');
    
                // Use $or operator to search using both regex patterns
                const cursor = userCollection.find({ $or: [
                    { currentLocation: { $regex: regexPattern }, Status: "Student" },
                    { currentLocation: { $regex: modifiedRegexPattern }, Status: "Student" }
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
    

    GetAdminStudentDomainThroughSearch: (Name) => {
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
                    { workDomains: { $regex: regexPattern }, Status: "Student" },
                    { workDomains: { $regex: modifiedRegexPattern }, Status: "Student" }
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
    

    GetStudentAdminFilteredThroughSearch: (filter) => {
        return new Promise(async (resolve, reject) => {
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                let query = { Status: "Student" };
                
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
                        Branch: user.Branch,
                        AdmissionYear: user.AdmissionYear,
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
       

    GetAdminCandidateThroughSearch: (Name) => {
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
                        Status: user.Status
                    });
                });    
                resolve(userNamesDetails);
            } catch (error) {
                reject(error);
            }
        });
    },

    deleteCandidateByAdmin: (profile_id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).deleteOne({
                _id: new objectId(profile_id)
            }).then((profile) => {
                resolve({ deleteCandidate: true });
            }).catch((error) => {
                reject(error);
            });
        });
    },

    insertRemovedCandidateByAdminLogs: (profile_id,profile_name,profile_status, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        deletedCandidates: { profile_id,profile_name,profile_status, deletedAt: currentTime }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ deleteCandidate: true });
            }).catch((error) => {
                reject(error);
            });
        });
    },


    getProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) });
            resolve(profile);
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

    getOneDelMess: (senderID, recieverID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let profile = await db.getDb().collection(collection.DELETED_ONE_ON_ONE_CHAT_COLLECTION).findOne(
                    {
                        Sender_Id: senderID,
                        [senderID]: { $exists: true },
                        [`${senderID}.${recieverID}`]: { $exists: true }
                    },
                    {
                        [`${senderID}.${recieverID}`]: 1,
                        _id: 0
                    }
                );
                resolve(profile && profile[senderID][recieverID] ? profile[senderID][recieverID] : []);
            } catch (error) {
                reject(error);
            }
        });
    },


    
    OneonONEchatViewedLogByAdmin: (sender_id, sender_name, receiver_id, receiver_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        viewedOneonOneChat: { 
                            sender_id,
                            sender_name,
                            receiver_id,
                            receiver_name,
                            viewedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added one-on-one chat viewed log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    
        

    GetAlumniOwnedCompany: () => {
        return new Promise(async (resolve, reject) => {
            let alumniDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const cursor = userCollection.find({
                    Status: "Alumni",
                    $or: [
                        { ownCompany: { $exists: true } },
                        { "working.WorkingownedPreviousStorage": { $elemMatch: { $exists: true, $ne: [] } } }
                    ]
                });
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    const { employmentStatus, ownCompany, working ,Status} = user;
                    alumniDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        employmentStatus,
                        ownCompany,
                        working,
                        Status
                    });
                });
                resolve(alumniDetails);
            } catch (error) {
                reject(error);
            }
        });
    },
    

    GetAlumniSearchWorkingCompany: (CompanyName) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);    
                const regexPattern = new RegExp(CompanyName, 'i');
                const alumniQuery = {
                    Status: "Alumni",
                    $or: [
                        { "working.workingCompanyName": { $regex: regexPattern } },
                        { "working.WorkingownedPreviousStorage.name": { $regex: regexPattern } },
                        { "experience.companyName": { $regex: regexPattern } }
                    ]
                };
    
                const alumniCursor = userCollection.find(alumniQuery);
    
                const alumniDetails = [];
    
                await alumniCursor.forEach((alumni) => {
                    const stringId = alumni._id.toString();
                    let foundIn = '';
    
                    if (alumni.experience?.find(exp => exp.companyName.match(regexPattern))) {
                        const matchedExperience = alumni.experience.find(exp => exp.companyName.match(regexPattern));
                        foundIn = "experienceENTRY";
                        alumniDetails.push({
                            _id: stringId,
                            Name: alumni.Name,
                            employmentStatus: alumni.employmentStatus,
                            foundIn: foundIn,
                            matchedExperience: matchedExperience
                        });
                    } else if (alumni.working && alumni.working.workingCompanyName.match(regexPattern)) {
                        foundIn = "companyENTRY";
                        alumniDetails.push({
                            _id: stringId,
                            Name: alumni.Name,
                            employmentStatus: alumni.employmentStatus,
                            foundIn: foundIn,
                            matchedWorking: alumni.working
                        });
                    } else if (alumni.working && alumni.working.WorkingownedPreviousStorage.find(prev => prev.name.match(regexPattern))) {
                        const matchedPrevious = alumni.working.WorkingownedPreviousStorage.find(prev => prev.name.match(regexPattern));
                        foundIn = "previouscompanyENTRY";
                        alumniDetails.push({
                            _id: stringId,
                            Name: alumni.Name,
                            employmentStatus: alumni.employmentStatus,
                            foundIn: foundIn,
                            matchedPrevious: matchedPrevious,
                            matchedWorking: alumni.working
                        });
                    }
                });
    
                resolve(alumniDetails);
            } catch (error) {
                reject(error);
            }
        });
    },
    
    
    
    GetAlumniWorkingCompany: () => {
        return new Promise(async (resolve, reject) => {
            let alumniWorkingDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                const cursor = userCollection.find({ Status: "Alumni", working: { $exists: true } });
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    const { employmentStatus, working, ownCompany } = user;
                    alumniWorkingDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        employmentStatus,
                        working,
                        ownCompany
                    });
                });
                resolve(alumniWorkingDetails);
            } catch (error) {
                reject(error);
            }
        });
    },    

    changeUserStatus:(userId,userStatus)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(userId)},{
                $set:{
                    Status:userStatus
                }
            }).then((response)=>{
                resolve()
            })
        })
    },

    changeUserStatusByAdmin: (profile_id, user_name, status_changed_to, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        StatusUpdateLog: { 
                            profile_id, 
                            user_name, 
                            status_changed_to, 
                            updated_time: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                if (!result.value) {
                    resolve({ message: 'Admin log details created and status updated.' });
                } else {
                    resolve({ message: 'Status updated successfully.' });
                }
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    changeAllUserStatus: () => {
        return new Promise((resolve, reject) => {
          const today = new Date();
          const cutoffDate = new Date(today.getFullYear() - 4, today.getMonth() - 6, today.getDate());
          db.getDb()
            .collection(collection.USER_COLLECTION)
            .updateMany(
              {
                Status: "Student",
                $expr: {
                  $lte: [
                    { $dateFromString: { dateString: { $concat: ["01-01-", "$AdmissionYear"] } } },
                    cutoffDate
                  ]
                }
              },
              { $set: { Status: "Alumni" } }
            )
            .then((result) => {
              console.log(result.modifiedCount, "documents updated");
              resolve();
            })
            .catch((err) => {
              console.error("Error updating status:", err);
              reject(err);
            });
        });
      },

      getAllMessageAdmin:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.GROUP_CHAT_COLLECTION).find({}).toArray().then((messages) => {
                resolve(messages);
            }).catch((err) => {
                reject(err);
            });
        });
    },
      

    getAdminBasicProfileDetails: (adminId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ADMIN_COLLECTION).findOne({_id: new objectId(adminId)}).then((admin) => {
                if (admin) {
                    let adminDetails = {
                        _id: admin._id,
                        Name: admin.Name
                    };
                    resolve(adminDetails);
                } else {
                    reject("Admin not found");
                }
            }).catch((err) => {
                reject(err);
            });
        });
    },

    addJob_by_admin: (userData) => {
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
       

    getEditAdminJobDetails: (userId) => {
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


    deleteAdminJob: (jobId) => {
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

    AddJobDeleteLogByAdmin: (job_id, posted_user_id, posted_user_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        JobDeletedLogByAdmin: { 
                            job_id,
                            posted_user_id,
                            posted_user_name,
                            deletedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added job delete log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    

    getIndividualAdminJobDetail: (jobId) => {
        return new Promise(async (resolve, reject) => {
            let job = await db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) });
            resolve(job);
        });
    },

    putJobRecomendationScoreAdmin: (jobId) => {
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


    getuserDetailsForrequestAdmin: (users) => {
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



    findUserIdFromJobIdAdmin: (jobId) => {
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


    updateJobAdmin:(jobId,jobDetails)=>{
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

    getJobDetailsAdmin:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.JOB_COLLECTION).find({}).toArray().then((jobs) => {
                resolve(jobs);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    getInternDetailsAdmin:()=> {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.INTERN_COLLECTION).find({}).toArray().then((interns) => {
                resolve(interns);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    getIndividualInternshipDetailsAdmin:(internshipId)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.INTERN_COLLECTION).findOne({_id:new objectId(internshipId)}).then((indintern)=>{
                resolve(indintern)
            })
        })
    },

    deleteInternshipAdmin: (internshipId) => {
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

    AddInternDeleteLogByAdmin: (intern_id, posted_intern_id, posted_intern_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        InternDeletedLogByAdmin: { 
                            intern_id,
                            posted_intern_id,
                            posted_intern_name,
                            deletedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added intern delete log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    

    getMentorDetailsAdmin:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.MENTOR_COLLECTION).find({}).toArray().then((mentors) => {
                resolve(mentors);
            }).catch((err) => {
                reject(err);
            });
        });
    },


    searchMentorAdmin: (mentorkeyword) => {
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
            console.log("UPDATED STRING : ",mentorkeyword)
    
            // Split the mentorkeyword into individual words
            const keywords = mentorkeyword.split(/\s+/);
            console.log("KEYWORD UPDATED : ",keywords)
    
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


    deleteMentorAdmin: (mentorId) => {
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

    AddMentorQuestionDeleteLogByAdmin: (question_id, user_name, user_id, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        deletedMentorQuestion: { 
                            question_id,
                            user_name,
                            user_id,
                            deletedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added mentor question delete log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    AddMentorReplyDeleteLogByAdmin: (reply_id, question_id, user_name, user_id, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        deletedMentorReply: { 
                            reply_id,
                            question_id,
                            user_name,
                            user_id,
                            deletedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added mentor reply delete log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    deleteMentorReplyAdmin: (mentorReplyId, questionId) => {
        return new Promise((resolve, reject) => {
            const mentorId = { "replies._id": new objectId(mentorReplyId) };
    
            db.getDb().collection(collection.MENTOR_COLLECTION)
                .updateOne(
                    { _id: new objectId(questionId) },
                    { $pull: { replies: { _id: new objectId(mentorReplyId) } } }
                )
                .then((response) => {
                    if (response.modifiedCount > 0) {
                        resolve({ deleteMentor: true ,deleteMentorReply:true});
                    } else {
                        resolve({ deleteMentor: false, message: "Mentor reply not found" });
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },


    doAddUser: (userData) => {
        return new Promise(async (resolve, reject) => {
            if (userData.Password == userData.Cpass) {
                userData.Password = await bcrypt.hash(userData.Password, 10);
                userData.Cpass = await bcrypt.hash(userData.Cpass, 10);
                db.getDb().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    resolve(data.insertedId); // Resolve with the inserted ObjectId
                }).catch((error) => {
                    reject(error);
                });
            } else {
                reject("Password and Confirm Password do not match.");
            }
        });
    },



    ViewAddUserByAdmin: (user_name, user_status, user_id, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        newUserAdded: { 
                            user_name,
                            user_status,
                            user_id,
                            addedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added user viewed log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    updateProfileUserAdmin:(userId,userDetails)=>{
        return new Promise((resolve,reject)=>{
            db.getDb().collection(collection.USER_COLLECTION).updateOne({_id:new objectId(userId)},{
                $set:{
                    Name:userDetails.Name,
                    Email:userDetails.Email,
                    Contact:userDetails.Contact,
                    Gender:userDetails.gender
                }
            }).then((response)=>{
                resolve()
            })
        })
    },


    AddEditProfileByAdminLog: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        EditProfileByAdmin: { 
                            profile_id,
                            profile_name,
                            updatedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added profile edit log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },



    AddUpdateProfileByAdminLog: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        UpdateProfileByAdmin: { 
                            profile_id,
                            profile_name,
                            updatedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added profile update log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },



    updateuserProfileAdmin: (userId, userDetails) => {
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


    updateUPassUserByAdmin: async (view, userDetails) => {
        let NewPW = userDetails.NewPass;
        let UserId = view;
        let response = {}
        return new Promise(async (resolve, reject) => {
            try {
                NewPW = await bcrypt.hash(NewPW, 10);
                await db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(UserId)},
                {
                    $set: {
                        Password: NewPW,
                    },
                });
                response.status = true;
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    },


    AddUpdateUserPasswordByAdminLog: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        UpdatePasswordOfUserByAdmin: { 
                            profile_id,
                            profile_name,
                            updatedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added profile password log by admin.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    

    getUpdatePassLogDetailsAdmin: (user_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.LOG_DETAILS_COLLECTION).findOne({userId:user_id }).then((logDetails) => {
                    if (logDetails) {
                        const updatePassLogs = logDetails.updatePasslogs || [];
                        const lastUpdatedValues = updatePassLogs.map(entry => entry.Last_Updated);
                        resolve(lastUpdatedValues);
                    } else {
                        resolve([]);
                    }
                }).catch(error => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },    


    AddAdminViewPasswordLogOfUser: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        AdminViewPassUpdateLogOfUser: { 
                            profile_id,
                            profile_name,
                            viewedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added admin view password log of user.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    getUserLoggedLogDetailsAdmin: (user_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.LOG_DETAILS_COLLECTION).findOne({ userId: user_id }).then((logDetails) => {
                    if (logDetails) {
                        const logs = logDetails.logs || [];
                        const combinedLogs = [];
                        logs.forEach(entry => {
                            if (entry.loggedIN) {
                                combinedLogs.push({ type: 'logged_in', value: entry.loggedIN });
                            }
                            if (entry.loggedOUT) {
                                combinedLogs.push({ type: 'logged_out', value: entry.loggedOUT });
                            }
                        });
                        resolve(combinedLogs);
                    } else {
                        resolve([]);
                    }
                }).catch(error => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },


    AddAdminViewLoggedLogOfUser: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        AdminViewLoggedUpdateLogOfUser: { 
                            profile_id,
                            profile_name,
                            viewedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added admin view password log of user.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    
    
    getPostDetails:(userId) => {
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

    getIndividualPostDetails: (post_id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.POST_COLLECTION)
                .findOne({ _id: new objectId(post_id) })
                .then((post) => {
                    if (post) {
                        resolve(post);
                    } else {
                        reject(new Error("Post not found"));
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },
    

    deletePostAdmin: (postId) => {
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


    AdminDeletedPosts: (profile_id, profile_name, post_id, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        deletedPostsAdmin: { 
                            profile_id,
                            profile_name,
                            post_id,
                            deletedAt: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Added admin deleted posts log.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    handleGroupChatMessageAdmin: async (MessageId,userId,Name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY) => {
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

    deleteMessageAdmin: (messageId) => {
        console.log("REACHED ADMIN-HELPERS.JS ")
        return new Promise((resolve, reject) => {
            console.log("MESSAGE IS TO DELETE IS : ",messageId)
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
                            messageContent: "This message was deleted by admin",
                            deleteStatus: "deletedMessage",
                            ImageNames: [],
                            VideoNames: []
                        }
                    };
    
                    // Update the message in GROUP_CHAT_COLLECTION
                    db.getDb().collection(collection.GROUP_CHAT_COLLECTION).updateOne({
                        MessageId: messageId
                    }, updatedMessage).then(() => {
                        // Insert the deleted message into DELETED_GROUP_CHAT_COLLECTION
                        deletedMessage.deletedtime = new Date();
                        deletedMessage.deletion_status = "deleted_by_admin";
                        db.getDb().collection(collection.DELETED_GROUP_CHAT_COLLECTION).insertOne(deletedMessage).then(() => {
                            console.log("DELETED MESSAGE IS  : ",deletedMessage)
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

    addPostGroupAdmin: (postData, timestamp,status) => {
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

    addPostGroupImagesAdmin:(postId,postNames)=>{
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
    addPostGroupVideosAdmin:(postId,postNames)=>{
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



    getAllDeletedGroupMessageAdmin:() => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.DELETED_GROUP_CHAT_COLLECTION).find({}).toArray().then((messages) => {
                resolve(messages);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    AdminViewDeletedGroupChat: (admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        ViewDeletedGroupMessageLog: { viewedAt: currentTime }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                resolve({ message: 'Viewed deleted group chat successfully.' });
            }).catch((error) => {
                reject(error);
            });
        });
    },
    


    handleBroadcastMessage: async (MessageId, messageContent, actualMessageId, actualMessageContent, timestamp, status, Sender_name, Sender_Id, type_of_message) => {
        try {
            const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
            // Create a document with the provided data
            const broadcastMessage = {
                MessageId,
                messageContent,
                actualMessageId,
                actualMessageContent,
                timestamp,
                status,
                Sender_name,
                Sender_Id,
                type_of_message
            };
    
            // Insert the document into the collection
            const result = await adminBroadcastChatCollection.insertOne(broadcastMessage);
    
            console.log("Broadcast message inserted:", result.insertedId);
            return result.insertedId; // Return the ID of the inserted document if needed
        } catch (error) {
            console.error(error);
            throw new Error("Error handling broadcast message");
        }
    },


    addPostOneBroadcastAdmin: async (postData, timestamp, status, Sender_name, Sender_Id) => {
        try {
            const postDocument = {
                ...postData,
                timestamp,
                status,
                Sender_name,
                Sender_Id
            };
    
            const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
            const result = await adminBroadcastChatCollection.insertOne(postDocument);
            console.log("Post inserted:", result.insertedId);
            return result.insertedId;
        } catch (error) {
            console.error(error);
            throw new Error("Error adding post");
        }
    },
    

    
    addPostOneImagesAdminBroadcast: async (Sender_Id, postId, postNames) => {
        try {
            const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
            // Check if there is an entry with the same postId
            const existingPost = await adminBroadcastChatCollection.findOne({ MessageId: postId });
    
            if (existingPost) {
                // If entry exists, update the ImageNames array with new postNames
                const updatedPost = await adminBroadcastChatCollection.updateOne(
                    { MessageId: postId },
                    { $addToSet: { ImageNames: { $each: postNames } } }
                );
    
                console.log("Updated existing post with images:", updatedPost.modifiedCount);
                return updatedPost.modifiedCount; // Return the count of modified documents
            } else {
                // If no entry exists, create a new document
                const newPost = await adminBroadcastChatCollection.insertOne({
                    MessageId: postId,
                    ImageNames: postNames,
                    Sender_Id
                });
    
                console.log("Created new post with images:", newPost.insertedId);
                return newPost.insertedId; // Return the ID of the newly inserted document
            }
        } catch (error) {
            console.error(error);
            throw new Error("Error adding post with images");
        }
    },
    
    
    
    addPostOneVideosAdminBroadcast: async (Sender_Id, MessageId, postNames) => {
        try {
            const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
            // Check if there is an entry with the same MessageId
            const existingPost = await adminBroadcastChatCollection.findOne({ MessageId });
    
            if (existingPost) {
                // If entry exists, update the VideoNames array with new postNames
                const updatedPost = await adminBroadcastChatCollection.updateOne(
                    { MessageId },
                    { $addToSet: { VideoNames: { $each: postNames } } }
                );
    
                console.log("Updated existing post with videos:", updatedPost.modifiedCount);
                return updatedPost.modifiedCount; // Return the count of modified documents
            } else {
                // If no entry exists, create a new document
                const newPost = await adminBroadcastChatCollection.insertOne({
                    MessageId,
                    VideoNames: postNames,
                    Sender_Id
                });
    
                console.log("Created new post with videos:", newPost.insertedId);
                return newPost.insertedId; // Return the ID of the newly inserted document
            }
        } catch (error) {
            console.error(error);
            throw new Error("Error adding post with videos");
        }
    },

    /*getBroadcastMessageUIDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
                // Find the last entry in the collection
                const lastEntry = await adminBroadcastChatCollection.find({}).sort({ _id: -1 }).limit(1).toArray();
    
                if (lastEntry && lastEntry.length > 0) {
                    resolve(lastEntry[0]); // Resolve with the last entry
                } else {
                    reject("No entries found in ADMIN_BROADCAST_ALL"); // Reject if no entries found
                }
            } catch (error) {
                console.error(error);
                reject("Error fetching broadcast message details");
            }
        });
    },*/


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

    deleteBroadcastMessage: (MessageId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({
                MessageId: MessageId
            }).then((messageData) => {
                if (messageData) {
                    const deletedMessage = { ...messageData };
                    delete deletedMessage._id; // Remove MongoDB ObjectId field
    
                    // Copy the deleted message to DELETED_ADMIN_BROADCAST
                    db.getDb().collection(collection.DELETED_ADMIN_BROADCAST).insertOne(deletedMessage).then(() => {
                        // Update message content, clear ImageNames and VideoNames in ADMIN_BROADCAST_ALL
                        const updatedFields = {
                            $set: {
                                messageContent: "This message was deleted",
                                deleteStatus: "deletedMessage",
                                deleted_time: new Date(),
                                ImageNames: [],
                                VideoNames: []
                            }
                        };
    
                        db.getDb().collection(collection.ADMIN_BROADCAST_ALL).updateOne({
                            MessageId: MessageId
                        }, updatedFields).then(() => {
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


    EnablePowerTransfer: (admin_ID) => {
        return new Promise((resolve, reject) => {
            const adminLogCollection = db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION);
            adminLogCollection.findOne({ adminId: admin_ID }).then((adminLog) => {
                if (!adminLog) {
                    reject("Admin ID not found.");
                    return;
                }
                let powerTransferEnabled = adminLog.powertransfer_enabled;
                if (powerTransferEnabled === undefined) {
                    powerTransferEnabled = true;
                } else {
                    powerTransferEnabled = !powerTransferEnabled;
                }
    
                const currentTime = new Date();
                const powerTransferedTime = adminLog.power_transfered_time ? adminLog.power_transfered_time : currentTime;
    
                const updateObject = {
                    $set: {
                        powertransfer_enabled: powerTransferEnabled,
                        power_transfered_time: powerTransferedTime
                    }
                };
    
                // If powerTransferEnabled is being set to true by the POST method, set a timeout to turn it off after 24 hours
                if (powerTransferEnabled) {
                    const twentyFourHoursLater = new Date(powerTransferedTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
                    const timeUntilExpiration = twentyFourHoursLater - currentTime;
    
                    setTimeout(() => {
                        adminLogCollection.updateOne({ _id: new objectId(adminLog._id) }, { $set: { powertransfer_enabled: false } })
                            .then(() => console.log("Power transfer disabled after 24 hours."))
                            .catch(err => console.error("Error disabling power transfer after 24 hours:", err));
                    }, timeUntilExpiration);
                }
    
                adminLogCollection.updateOne({ adminId: admin_ID }, updateObject).then(() => {
                    resolve({ adminId: admin_ID, powertransfer_enabled: powerTransferEnabled, power_transfered_time: powerTransferedTime });
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        });
    },    
    
      
    
    fetchPowerTransferState: (admin_id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOne(
                { adminId: admin_id },
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
    
    
    fetchUserConcentOnDeletedOneChatView: (user_id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.USER_COLLECTION).findOne(
                { _id: new objectId(user_id) },
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
    


    chatCOUNT: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ONE_ON_ADMIN_COLLECTION).findOne({ Sender_Id: userId }).then((messageUI) => {
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
    
    getReceivedMessageSendDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ONE_ON_ADMIN_COLLECTION)
                .find({ "Sender_Id": { $ne: userId } })
                .toArray()
                .then((entries) => {
                    const result = [];
                    entries.forEach((entry) => {
                        const senderId = entry.Sender_Id;
                        if (entry[senderId] && entry[senderId][userId]) {
                            const userArray = entry[senderId][userId];
                            if (userArray.length > 0) {
                                result.push(senderId); // Push the senderId directly
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


    GetallEnquiries: () => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                .find()
                .toArray()
                .then((entries) => {
                    const convertedEntries = entries.map(entry => {
                        entry._id = entry._id.toString(); // Convert ObjectId to string
                        return entry;
                    });
                    resolve(convertedEntries);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },

    GetindiEnquiries: (ask_id) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                .findOne({ _id: new objectId(ask_id) }) // Use findOne and match _id with ObjectId
                .then((entry) => {
                    entry._id = entry._id.toString();
                    resolve(entry); // Resolve with the matched entry
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    
       

    AddAdminEnquiryView: (ask_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const entry = await db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                    .findOne({ _id: new objectId(ask_id) });
    
                if (entry) {
                    // Update admin_opened_time with current time if entry found
                    await db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                        .updateOne({ _id: new objectId(ask_id) }, { $set: { admin_opened_time: new Date() } });
    
                    resolve(entry); // Resolve with the matched entry
                } else {
                    resolve(null); // Resolve with null if entry not found
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    

}