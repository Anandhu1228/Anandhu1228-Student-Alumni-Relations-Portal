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

    doAdminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let loginStatus = false;
                let response = {};
                let admin = await db.getDb().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email });
    
                if (admin) {
                    // Check if the account is locked
                    if (admin.lockoutTime && new Date() < admin.lockoutTime) {
                        // Account is lockedz
                        resolve({ status: false, locked: true });
                    } else {
                        if (admin.access) {
                            let status1 = await bcrypt.compare(adminData.key_1, admin.key1);
                            let status2 = await bcrypt.compare(adminData.key_2, admin.key2);
    
                            if (status1 && status2) {
                                // Reset failed attempts on successful login
                                await db.getDb().collection(collection.ADMIN_COLLECTION).updateOne(
                                    { _id: admin._id },
                                    { $set: { failedAttempts: 0, lockoutTime: null } }
                                );

                                console.log("login success");
                                response.admin = {
                                    _id: admin._id,
                                    Name: admin.Name || null,
                                    Email: admin.Email || null
                                };
                                response.status = true;
                                resolve(response);

                            } else {
                                // Increment failed attempts on unsuccessful login
                                let failedAttempts = admin.failedAttempts ? admin.failedAttempts + 1 : 1;
                                let lockoutTime = null;
                                if (failedAttempts >= 3) {
                                    // Set lockout time for 1 day
                                    lockoutTime = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                                }
                                await db.getDb().collection(collection.ADMIN_COLLECTION).updateOne(
                                    { _id: admin._id },
                                    { $set: { failedAttempts: failedAttempts, lockoutTime: lockoutTime } }
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
                console.error("Error in doAdminLogin:", error);
                reject(error); // Optionally, you may want to resolve with an error object or handle differently
            }
        });
    },    


    getOtpRequest: (email) => {
        return new Promise((resolve, reject) => {
            db.getDb().collection(collection.ADMIN_COLLECTION).findOne(
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
            db.getDb().collection(collection.ADMIN_COLLECTION).updateOne(
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
            const usercollection = db.getDb().collection(collection.ADMIN_COLLECTION)
            
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
            db.getDb().collection(collection.ADMIN_COLLECTION).findOne(
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


    insertloggedINTime: (adminId) => {
        return new Promise((resolve, reject) => {
            try {
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
                                { _id: new objectId(adminId) },
                                { $set: { lastlogged_In: currentTime } }
                            );
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        throw error; // Propagate the error to the outer catch block
                    });
            } catch (error) {
                console.error("Error in insertloggedINTime:", error);
                reject(error); // Optionally, you may want to handle the error differently or resolve with an error object
            }
        });
    },
    

    insertloggedOUTTime: (adminId) => {
        return new Promise((resolve, reject) => {
            try {
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
                                { _id: new objectId(adminId) },
                                { $set: { lastlogged_OUT: currentTime } }
                            );
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        throw error; // Propagate the error to the outer catch block
                    });
            } catch (error) {
                console.error("Error in insertloggedOUTTime:", error);
                reject(error); // Optionally, you may want to handle the error differently or resolve with an error object
            }
        });
    },
    

    GetAllUserThroughSearch: (Name) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!Name) {
                    resolve([]);
                    return;
                }
    
                let userNamesDetails = [];
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
    
                // Find users where Name matches the regex pattern
                const cursor = userCollection.find({ Name: { $regex: regexPattern } });
    
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status
                    });
                });
    
                // Resolve the promise with the user details
                resolve(userNamesDetails);
            } catch (error) {
                // Reject the promise if there's an error
                console.error("Error in GetAllUserThroughSearch:", error);
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
    
                // Function to escape special characters in the Name string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
    
                // Escape the Name string
                const escapedName = escapeRegExp(Name);
                // Create a case-insensitive regex pattern with the escaped Name
                const regexPattern = new RegExp(escapedName, 'i');
    
                // Find users where Name matches the regex pattern and Status is "Alumni"
                const cursor = userCollection.find({ Name: { $regex: regexPattern }, Status: "Alumni" });
    
                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        employmentStatus: user.employmentStatus
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
    

    GetAdminAlumniPassoutThroughSearch: (Name) => {
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

                // Find users where passoutYear matches the regex pattern and Status is "Alumni"
                const cursor = userCollection.find({ passoutYear: { $regex: regexPattern }, Status: "Alumni" });

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


    GetAdminAlumni1Location2Through28Search: (Name) => {
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

                // Resolve the promise with the user details
                resolve(userNamesDetails);
            } catch (error) {
                // Reject the promise if there's an error
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

                // Function to escape special characters in a string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };

                if (filter.searchPassout && filter.searchPassout !== '') {
                    query.passoutYear = filter.searchPassout;
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


    GetAdminStudentNameThroughSearch: (Name) => {
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
                // Construct a regex pattern for the Name with case-insensitive matching
                const regexPattern = new RegExp(escapedName, 'i');

                // Find users where Name matches the regex pattern and Status is "Student"
                const cursor = userCollection.find({ Name: { $regex: regexPattern }, Status: "Student" });

                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status,
                        AdmissionYear: user.AdmissionYear
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


    GetAdminStudentAdmissionYearThroughSearch: (Name) => {
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
                // Construct a regex pattern for the Name with case-insensitive matching
                const regexPattern = new RegExp(escapedName, 'i');

                // Find users where AdmissionYear matches the regex pattern and Status is "Student"
                const cursor = userCollection.find({ AdmissionYear: { $regex: regexPattern }, Status: "Student" });

                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        AdmissionYear: user.AdmissionYear,
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

    
    GetAdminStudentLocationThroughSearch: (Location) => {
        return new Promise(async (resolve, reject) => {
            if (!Location) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                
                // Function to escape special characters in the Location string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };

                // Escape the Location string
                const escapedLocation = escapeRegExp(Location);
                // Create a case-insensitive regex pattern with the escaped Location
                const regexPattern = new RegExp(escapedLocation, 'i');
                // Construct a modified regex pattern to allow optional spaces before each character
                const modifiedRegexPattern = new RegExp(escapedLocation.replace(/\s+/g, '\\s*'), 'i');

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

                // Resolve the promise with the user details
                resolve(userNamesDetails);
            } catch (error) {
                // Reject the promise if there's an error
                reject(error);
            }
        });
    },


    GetAdminStudentDomainThroughSearch: (Domain) => {
        return new Promise(async (resolve, reject) => {
            if (!Domain) {
                resolve([]);
                return;
            }   
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                
                // Function to escape special characters in the Domain string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };

                // Escape the Domain string
                const escapedDomain = escapeRegExp(Domain);
                // Create a case-insensitive regex pattern with the escaped Domain
                const regexPattern = new RegExp(escapedDomain, 'i');
                // Construct a modified regex pattern to allow optional spaces before each character
                const modifiedRegexPattern = new RegExp(escapedDomain.replace(/\s+/g, '\\s*'), 'i');

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
                        employmentStatus: user.employmentStatus
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

    
    GetStudentAdminFilteredThroughSearch: (filter) => {
        return new Promise(async (resolve, reject) => {
            let userNamesDetails = [];
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
                let query = { Status: "Student" };

                // Function to escape special characters in a string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };

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
                        Branch: user.Branch,
                        AdmissionYear: user.AdmissionYear,
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

       
    GetAdminCandidateThroughSearch: (Name) => {
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

                // Find users where Name matches the regex pattern
                const cursor = userCollection.find({ Name: { $regex: regexPattern } });

                await cursor.forEach((user) => {
                    const stringId = user._id.toString();
                    userNamesDetails.push({
                        _id: stringId,
                        Name: user.Name,
                        Status: user.Status
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


    deleteCandidateByAdmin: (profile_id) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).deleteOne({
                    _id: new objectId(profile_id)
                }).then((profile) => {
                    resolve({ deleteCandidate: true });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error("Error in deleteCandidateByAdmin:", error);
                reject(error);
            }
        });
    },


    insertRemovedCandidateByAdminLogs: (profile_id, profile_name, profile_status, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date();
                db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                    { adminId: admin_id },
                    {
                        $setOnInsert: { adminId: admin_id },
                        $addToSet: {
                            deletedCandidates: { profile_id, profile_name, profile_status, deletedAt: currentTime }
                        }
                    },
                    { upsert: true, returnOriginal: false }
                ).then((result) => {
                    resolve({ deleteCandidate: true });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error("Error in insertRemovedCandidateByAdminLogs:", error);
                reject(error);
            }
        });
    },    


    getProfilefORsTATUS12_28: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let profile = await db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) },
                { projection: { Name: 1, _id: 1,Status: 1} });
                resolve(profile);
            } catch (error) {
                console.error("Error in getProfile:", error);
                reject(error);
            }
        });
    },


    getEditProfileDetails : (userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).findOne(
                    { _id: new objectId(userId) },
                    { projection: { Name: 1, Gender: 1, Email: 1, Contact: 1, _id: 1} }
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
                        AdmissionYear: 1,
                        passoutYear: 1,
                        currentLocation: 1,
                        employmentStatus: 1,
                        higherStudies: 1,
                        working: 1,
                        ownCompany: 1,
                        _id: 1
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


    getProfileForStatus: (userId) => {
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
                    Contact :1,
                    employmentStatus: 1,
                    experience: 1,
                    _id: 1,
                    activeStatus: 1,
                    restrict_portal: 1,
                    restrict_group: 1
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
    
            try {
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
            } catch (error) {
                console.error("Error in OneonONEchatViewedLogByAdmin:", error);
                reject(error);
            }
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
            if (!CompanyName) {
                resolve([]);
                return;
            }
            try {
                const userCollection = db.getDb().collection(collection.USER_COLLECTION);
    
                // Function to escape special characters in the CompanyName string
                const escapeRegExp = (string) => {
                    // Replace all special characters with their escaped versions
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                };
    
                // Escape the CompanyName string
                const escapedCompanyName = escapeRegExp(CompanyName);
                // Create a case-insensitive regex pattern with the escaped CompanyName
                const regexPattern = new RegExp(escapedCompanyName, 'i');
    
                // Construct the alumni query object
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


    changeUserStatus: (userId, userStatus) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_COLLECTION).updateOne({ _id: new objectId(userId) }, {
                    $set: {
                        Status: userStatus
                    }
                }).then((response) => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error("Error in changeUserStatus:", error);
                reject(error);
            }
        });
    },


    changeUserStatusByAdmin: (profile_id, user_name, status_changed_to, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            try {
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
            } catch (error) {
                console.error("Error in changeUserStatusByAdmin:", error);
                reject(error);
            }
        });
    },    


    changeAllUserStatus: () => {
        return new Promise((resolve, reject) => {
          try {
            const today = new Date();
            const cutoffDate = new Date(today.getFullYear() - 4, today.getMonth() - 6, today.getDate());
            
            db.getDb()
              .collection(collection.USER_COLLECTION)
              .updateMany(
                {
                  Status: "Student",
                  AdmissionYear: { $exists: true, $ne: "" }, // Ensure AdmissionYear exists and is not empty
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
          } catch (error) {
            console.error("Error in changeAllUserStatus:", error);
            reject(error);
          }
        });
      },
      

      getAllMessageAdmin: (skip, limit) => {
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
                    reject(err);
                });
            } catch (error) {
                console.error("Error in getAllMessageAdmin:", error);
                reject(error);
            }
        });
    },


    getPollInformation: () => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.GROUP_UNIQUE_COLLECTION; // POLL- GET POLL INFORMATION
    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group && group.poll) {
                            // Extract only the necessary fields from the poll object
                            const { caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName } = group.poll;
    
    
                            resolve({ caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName });
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

    
    getExistingGroupChatCountAdmin: (Sender_Id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
    
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
      

    getAdminBasicProfileDetails: (adminId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_COLLECTION).findOne({ _id: new objectId(adminId) })
                    .then((admin) => {
                        if (admin) {
                            let adminDetails = {
                                _id: admin._id,
                                Name: admin.Name
                            };
                            resolve(adminDetails);
                        } else {
                            reject("Admin not found");
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error("Error in getAdminBasicProfileDetails:", error);
                reject(error);
            }
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
       

    /*getEditAdminJobDetails: (userId) => {
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
                console.error("Error in getEditAdminJobDetails:", error);
                reject(error);
            }
        });
    },*/


    getEditAdminJobDetails: (userId,skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION)
                    .find({ UserId: userId })
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
                console.error("Error in getEditAdminJobDetails:", error);
                reject(error);
            }
        });
    },
    

    deleteAdminJob: (jobId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) })
                    .then((job) => {
                        if (!job) {
                            resolve({ deleteJob: false});
                            return;
                        }
                        if (job.UserId !== userID) {
                            resolve({ deleteJob: false});
                            return;
                        }
                        db.getDb().collection(collection.JOB_COLLECTION).deleteOne({ _id: new objectId(jobId) })
                            .then((response) => {
                                resolve({ deleteJob: true });
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in deleteAdminJob:", error);
                reject(error);
            }
        });
    },   
    
    
    deleteJobAdmin: (jobId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) })
                    .then((job) => {
                        if (!job) {
                            resolve({ deleteJob: false});
                            return;
                        }
                        db.getDb().collection(collection.JOB_COLLECTION).deleteOne({ _id: new objectId(jobId) })
                            .then((response) => {
                                resolve({ deleteJob: true });
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in deleteAdminJob:", error);
                reject(error);
            }
        });
    },    
    

    AddJobDeleteLogByAdmin: (job_id, posted_user_id, posted_user_name, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                console.error("Error in AddJobDeleteLogByAdmin:", error);
                reject(error);
            }
        });
    },
    
    
    getIndividualAdminJobDetail: (jobId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let job = await db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) });
                resolve(job);
            } catch (error) {
                console.error("Error in getIndividualAdminJobDetail:", error);
                reject(error);
            }
        });
    },
    

    putJobRecomendationScoreAdmin: (jobId) => {
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
                console.error("Error in putJobRecomendationScoreAdmin:", error);
                reject(error);
            }
        });
    },    


    getuserDetailsForrequestAdmin: (users) => {
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
                console.error("Error in getuserDetailsForrequestAdmin:", error);
                reject(error);
            }
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


    updateJobAdmin: (jobDetails, userID) => {
        return new Promise((resolve, reject) => {
            try {
                let jobId = jobDetails.jobID;
                db.getDb().collection(collection.JOB_COLLECTION).findOne({ _id: new objectId(jobId) })
                    .then((job) => {
                        if (!job) {
                            resolve({ editedJob: false});
                            return;
                        }
                        if (job.UserId !== userID) {
                            resolve({ editedJob: false});
                            return;
                        }
    
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
                    }).catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in updateJobAdmin:", error);
                reject(error);
            }
        });
    },    
    

    /*getJobDetailsAdmin: () => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION).find({}).toArray()
                    .then((jobs) => {
                        resolve(jobs);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error("Error in getJobDetailsAdmin:", error);
                reject(error);
            }
        });
    },*/


    getJobDetailsAdmin: (skip,limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.JOB_COLLECTION).find({})
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
                console.error("Error in getJobDetailsAdmin:", error);
                reject(error);
            }
        });
    },
    

    /*getInternDetailsAdmin: () => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).find({}).toArray()
                    .then((interns) => {
                        resolve(interns);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } catch (error) {
                console.error("Error in getInternDetailsAdmin:", error);
                reject(error);
            }
        });
    },*/


    getInternDetailsAdmin: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).find({})
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
                console.error("Error in getInternDetailsAdmin:", error);
                reject(error);
            }
        });
    },

    
    getIndividualInternshipDetailsAdmin: (internshipId) => {
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
                console.error("Error in getIndividualInternshipDetailsAdmin:", error);
                reject(error);
            }
        });
    },
    

    deleteInternshipAdmin: (internshipId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.INTERN_COLLECTION).deleteOne({
                    _id: new objectId(internshipId)
                })
                    .then((internship) => {
                        resolve({ deleteIntern: true });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in deleteInternshipAdmin:", error);
                reject(error);
            }
        });
    },
    

    AddInternDeleteLogByAdmin: (intern_id, posted_intern_id, posted_intern_name, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                console.error("Error in AddInternDeleteLogByAdmin:", error);
                reject(error);
            }
        });
    },    
    

    getMentorDetailsAdmin: (skip, limit) => {
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
                console.error("Error in getMentorDetailsAdmin:", error);
                reject(error);
            }
        });
    },    


    searchMentorAdmin: (mentorkeyword) => {
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
    
    
    deleteMentorAdmin: (mentorId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).deleteOne({
                    _id: new objectId(mentorId)
                }).then((response) => {
                    resolve({ deleteMentor: true });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                console.error("Error in deleteMentorAdmin:", error);
                reject(error);
            }
        });
    },
    

    AddMentorQuestionDeleteLogByAdmin: (question_id, question_Input, user_name, user_id, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date();
                db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                    { adminId: admin_id },
                    {
                        $setOnInsert: { adminId: admin_id },
                        $addToSet: {
                            deletedMentorQuestion: { 
                                question_id,
                                question_Input,
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
            } catch (error) {
                console.error("Error in AddMentorQuestionDeleteLogByAdmin:", error);
                reject(error);
            }
        });
    },
    

    AddMentorReplyDeleteLogByAdmin: (reply_id, REPLYINPUT, question_id, user_name, user_id, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date();
                db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                    { adminId: admin_id },
                    {
                        $setOnInsert: { adminId: admin_id },
                        $addToSet: {
                            deletedMentorReply: { 
                                reply_id,
                                reply_Input: REPLYINPUT,
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
            } catch (error) {
                console.error("Error in AddMentorReplyDeleteLogByAdmin:", error);
                reject(error);
            }
        });
    },    
    

    deleteMentorReplyAdmin: (mentorReplyId, questionId) => {
        return new Promise((resolve, reject) => {
            try {
                const mentorId = { "replies._id": new objectId(mentorReplyId) };
    
                db.getDb().collection(collection.MENTOR_COLLECTION)
                    .updateOne(
                        { _id: new objectId(questionId) },
                        { $pull: { replies: { _id: new objectId(mentorReplyId) } } }
                    )
                    .then((response) => {
                        if (response.modifiedCount > 0) {
                            resolve({ deleteMentor: true, deleteMentorReply: true });
                        } else {
                            resolve({ deleteMentor: false, message: "Mentor reply not found" });
                        }
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } catch (error) {
                console.error("Error in deleteMentorReplyAdmin:", error);
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
                            resolve({ success: false, message: 'Question not found' });
                            return;
                        }
    
                        const replyToUpdate = questionDocument.replies.find(reply => reply._id.toString() === replyId);
                        if (!replyToUpdate) {
                            resolve({ success: false, message: 'Reply not found' });
                            return;
                        }
    
                        if (replyToUpdate.userId !== userID) {
                            resolve({ success: false, message: 'User not authorized to edit this reply' });
                            return;
                        }
    
                        // Update the questionInput with questionData
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


    editQuestion: (questionData, questionId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.MENTOR_COLLECTION).findOne({ _id: new objectId(questionId) })
                    .then((mentor) => {
                        if (!mentor) {
                            resolve({ success: false});
                            return;
                        }
                        if (mentor.userId !== userID) {
                            resolve({ success: false});
                            return;
                        }
    
                        db.getDb().collection(collection.MENTOR_COLLECTION)
                            .updateOne(
                                { _id: new objectId(questionId) },
                                { $set: { questionInput: questionData, edit_status: true } }
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
                        resolve({ has_mentorReply: false, message: "User not authorized to view this reply" });
                        return;
                    }
                    
                    let result = {
                        has_mentorReply: false
                    }
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
    

    doAddUser: (userData) => {
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


    ViewAddUserByAdmin: (user_name, user_status, user_id, admin_id) => {
        return new Promise((resolve, reject) => {
            const currentTime = new Date();
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },
        

    updateProfileUserAdmin: (userDetails) => {
        return new Promise((resolve, reject) => {
            try {
                let userId = userDetails.profileID
                db.getDb().collection(collection.USER_COLLECTION).updateOne(
                    { _id: new objectId(userId) },
                    {
                        $set: {
                            Name: userDetails.Name,
                            Email: userDetails.Email,
                            Contact: userDetails.Contact,
                            Gender: userDetails.gender
                        }
                    }
                ).then(() => {
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    AddEditProfileByAdminLog: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },
    

    AddUpdateProfileByAdminLog: (profile_id, profile_name, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },
    

    updateUserProfileAdmin: (userDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userId =  userDetails.profileID
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
                reject(error);
            }
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
            try {
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
            } catch (error) {
                reject(error);
            }
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
            try {
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
            } catch (error) {
                reject(error);
            }
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
            try {
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
                    resolve({ message: 'Added admin view logged log of user.' });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    AdminDeletedPosts: (profile_id, profile_name, post_id, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },
    

    handleGroupChatMessageAdmin: async (MessageId,userId,Name,messageContent,actualMessageId,actualMessageUsername,actualMessageContent, timestamp,status,SENDBY,formattedTime) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date(); // Get the current time

                // Insert the group chat message into the database
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
                throw new Error("Error handling group chat message");
            }
        });
    },


    deleteMessageAdmin: (messageId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.GROUP_CHAT_COLLECTION).findOne({
                    MessageId: messageId
                }).then((deletedMessage) => {
                    // If the message exists, update its content and insert into DELETED_GROUP_CHAT_COLLECTION
                    if (deletedMessage) {
                        // Save ImageNames and VideoNames arrays before deleting
                        const deletedImageNames = deletedMessage.ImageNames || [];
                        const deletedVideoNames = deletedMessage.VideoNames || [];
                        var formattedTimestamp = new Date().toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

                        const updatedMessage = {
                            $set: {
                                messageContent: "This message was deleted by admin",
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
                            deletedMessage.deletion_status = "deleted_by_admin";
                            deletedMessage.formatteddeletedtime = formattedTimestamp;
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
            } catch (error) {
                reject(error);
            }
        });
    },


    addPostGroupAdmin: (postData, timestamp, status, User_Id, Name, formattedTime) => {
        return new Promise(async (resolve, reject) => {
            try {
                const currentTime = new Date(); // Get the current time
                
                const postDocument = {
                    ...postData,
                    timestamp: timestamp,
                    status:status,
                    Name: Name,
                    userId:User_Id,
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
                reject(error);
            }
        });
    },


    addPostGroupImagesAdmin: (postId, postNames) => {
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
    

    addPostGroupVideosAdmin: (postId, postNames) => {
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
    

    getAllDeletedGroupMessageAdmin: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.DELETED_GROUP_CHAT_COLLECTION)
                .find({})
                .sort({ timestamp: -1 })  // Sort by timestamp in descending order
                .skip(skip)
                .limit(limit)
                .toArray()
                .then((messages) => {
                    resolve(messages);
                }).catch((err) => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    },


   AdminViewDeletedGroupChat: (admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },


    handleBroadcastMessage: async (MessageId, messageContent, actualMessageId, actualMessageContent, timestamp, status, Sender_name, Sender_Id, ReadableTime) => {
        return new Promise(async(resolve, reject) => {
            try {
                const currentTime = new Date(); // Get the current time
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
                    ReadableTime
                };
        
                // Insert the document into the collection
                const insertMessage = await adminBroadcastChatCollection.insertOne(broadcastMessage);

                // Check if an entry exists in ADMIN_BROADCAST_UNIQUE_COLLECTION
                const findAndUpdateOrInsertTime = db.getDb().collection(collection.ADMIN_BROADCAST_UNIQUE_COLLECTION).findOneAndUpdate(
                    {}, // Filter condition, you can adjust this if you have specific criteria
                    { $set: { initial_time: currentTime } }, // Update the initial_time with current time
                    { upsert: true, returnOriginal: false } // Upsert: insert if not found; return the new document
                );

                // Wait for both operations to complete
                Promise.all([insertMessage, findAndUpdateOrInsertTime]).then(() => {
                    resolve({ addedAdminBroadMessage: true });
                }).catch(error => {
                    console.error(error);
                    reject(new Error("Error handling group chat message"));
                });
            } catch (error) {
                console.error(error);
                throw new Error("Error handling broadcast message");
            }
        });
    },


    FetchBroadMessageInitiationTime: () => {
        return new Promise((resolve, reject) => {
            try {
                // Fetch the initial_time from ADMIN_BROADCAST_UNIQUE_COLLECTION
                db.getDb().collection(collection.ADMIN_BROADCAST_UNIQUE_COLLECTION).findOne({}, { projection: { initial_time: 1 } })
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


    addPinAdminBroad: (messageId, userID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const groupUniqueCollection = db.getDb().collection(collection.ADMIN_BROADCAST_UNIQUE_COLLECTION);
                const groupChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
                const groupUnique = await groupUniqueCollection.findOne();
    
                if (!groupUnique || !groupUnique.pin_message) {
                    await groupUniqueCollection.updateOne({}, { $set: { pin_message: messageId } }, { upsert: true });
    
                    await groupChatCollection.updateOne(
                        { MessageId: messageId },
                        { $set: { pinStatus: true } }
                    );
                    resolve({ addedPin: true });
                } else {
                    const previousPinMessageId = groupUnique.pin_message;
    
                    const prevMessage = await groupChatCollection.findOne({ MessageId: previousPinMessageId });
    
                    if (prevMessage && prevMessage.pinStatus) {
                        await groupChatCollection.updateOne(
                            { MessageId: previousPinMessageId },
                            { $unset: { pinStatus: "" } }
                        );
    
                        const newMessage = await groupChatCollection.findOne({ MessageId: messageId });
                        if (newMessage && !newMessage.pinStatus) {
                            await groupChatCollection.updateOne(
                                { MessageId: messageId },
                                { $set: { pinStatus: true } }
                            );
    
                            await groupUniqueCollection.updateOne({}, { $set: { pin_message: messageId } });
                            resolve({ addedPin: true });
                        } else {
                            resolve({ addedPin: true });
                        }
                    } else {
                        const newMessage = await groupChatCollection.findOne({ MessageId: messageId });
                        if (newMessage && !newMessage.pinStatus) {
                            await groupChatCollection.updateOne(
                                { MessageId: messageId },
                                { $set: { pinStatus: true } }
                            );
    
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


    removePinAdminBroad: (messageId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const groupUniqueCollection = db.getDb().collection(collection.ADMIN_BROADCAST_UNIQUE_COLLECTION);
                const groupChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
    
                // Step 1: Check if messageId matches pin_message in ADMIN_BROADCAST_UNIQUE_COLLECTION
                const pinMessageDoc = await groupUniqueCollection.findOne({});
    
                if (pinMessageDoc && pinMessageDoc.pin_message === messageId) {
                    // Step 2: Remove pin_message field from ADMIN_BROADCAST_UNIQUE_COLLECTION
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


    getBroadMessageById: (messageId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({ MessageId: messageId, Sender_Id: userID }).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                    } else {
                        resolve(message);
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    getBroadMessageByIdText: (messageId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({ MessageId: messageId, Sender_Id: userID  }).then((message) => {
                    if (!message) {
                        reject(new Error("Message not found"));
                    } else {
                        let result = {
                            has_message: false
                        };
                        if (message.messageContent && message.messageContent !== '' && message.messageContent !== null) {
                            result.has_message = true;
                        }
                        resolve(result);
                    }
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    

    addPostOneBroadcastAdmin: async (postData, timestamp, status, Sender_name, Sender_Id, formattedTimestamp) => {
        return new Promise(async (resolve, reject) => {
            try {
                const currentTime = new Date(); // Get the current time

                const postDocument = {
                    ...postData,
                    timestamp,
                    status,
                    Sender_name,
                    Sender_Id,
                    ReadableTime: formattedTimestamp
                };
        
                const adminBroadcastChatCollection = db.getDb().collection(collection.ADMIN_BROADCAST_ALL);
                const insertPost = await adminBroadcastChatCollection.insertOne(postDocument);
            
                // Check if an entry exists in ADMIN_BROADCAST_UNIQUE_COLLECTION and update or insert the current time
                const findAndUpdateOrInsertTime = db.getDb().collection(collection.ADMIN_BROADCAST_UNIQUE_COLLECTION).findOneAndUpdate(
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
                throw new Error("Error adding post");
            }
        });
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
            }  catch (error) {
                console.error(error);
                reject("Error fetching broadcast message details");
            }
        });
    },


    GetPinnedAdminBroadMessage: () => {
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
                reject(error);
            }
        });
    },
    

    deleteBroadcastMessage: (MessageId, userID) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_BROADCAST_ALL).findOne({
                    MessageId: MessageId,
                    Sender_Id: userID
                }).then((messageData) => {
                    if (messageData) {
                        let ReadableTime = messageData.ReadableTime;
                        const timestamp = new Date();
                        const formattedTimestamp = new Date(timestamp).toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                        const deletedMessage = { ...messageData };
                        delete deletedMessage._id; // Remove MongoDB ObjectId field
        
                        // Copy the deleted message to DELETED_ADMIN_BROADCAST
                        db.getDb().collection(collection.DELETED_ADMIN_BROADCAST).insertOne(deletedMessage).then(() => {
                            // Update message content, clear ImageNames and VideoNames in ADMIN_BROADCAST_ALL
                            const updatedFields = {
                                $set: {
                                    messageContent: "This message was deleted",
                                    deleteStatus: "deletedMessage",
                                    deleted_time: timestamp,
                                    ReadableTime: ReadableTime,
                                    deletedReadleTime: formattedTimestamp,
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
            } catch (error) {
                reject(error);
            }
        });
    },


    initializePOLLInBroad: (pollbody, userid, userName) => {
        console.log("INITIALIZED POLL IN BROADCAST")
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION; // POLL -INITIALIZE POLL
                
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
                            // Entry exists in ADMIN_BROADCAST_UNIQUE_COLLECTION
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
                                console.log("Poll initialized successfully in new broad entry");
                                resolve(result);
                            })
                            .catch(error => {
                                console.error("Error initializing poll in new broad entry:", error);
                                reject(new Error("Error initializing poll in new broad entry"));
                            });
                        }
                    })
                    .catch((error) => {
                        console.error("Error fetching broad entry:", error);
                        reject(new Error("Error InitializingPoll"));
                    });
            } catch (error) {
                console.error("Error in initializing poll function:", error);
                reject(new Error("Error in initializing poll function"));
            }
        });
    }, 
    
    
    checkThirtyDayBroadPollInitiationPolicy: () => {
        console.log("ENTERED IN 30 DAY POLL CHECK......")
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION; // POLL -CHECK 30
                const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
                const currentTime = new Date();
                
                // Find the document in ADMIN_BROADCAST_UNIQUE_COLLECTION
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
    
    
    deleteBroadPoll: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION; // POLL- DELETE POLL
                const groupUniqueCollection = dbInstance.collection(collectionName);
                
                let deletedPoll = false; // Initialize the variable to track deletion status
    
                // Check if there is an entry in ADMIN_BROADCAST_UNIQUE_COLLECTION
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
    
    
    getAllBroadPollResult: () => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION; // POLL - GET ALL POLL RESULT
    
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


    getBroadPollInformation: () => {
        return new Promise((resolve, reject) => {
            try {
                const dbInstance = db.getDb();
                const collectionName = collection.ADMIN_BROADCAST_UNIQUE_COLLECTION; // POLL- GET POLL INFORMATION
    
                dbInstance.collection(collectionName).findOne()
                    .then((group) => {
                        if (group && group.poll) {
                            // Extract only the necessary fields from the poll object
                            const { caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName } = group.poll;
    
    
                            resolve({ caption, options, polledUser, readable_poll_time, Poll_Id, polledUserName });
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


    EnablePowerTransfer: (admin_ID) => {
        return new Promise((resolve, reject) => {
            try {
                const adminLogCollection = db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION);
                adminLogCollection.findOne({ adminId: admin_ID }).then((adminLog) => {
                    if (!adminLog) {
                        reject("Admin ID not found.");
                        return;
                    }
    
                    let powerTransferEnabled = adminLog.powertransfer_enabled;
                    const currentTime = new Date();
    
                    // Toggling the state
                    powerTransferEnabled = (powerTransferEnabled === undefined) ? true : !powerTransferEnabled;
    
                    const updateObject = {
                        $set: {
                            powertransfer_enabled: powerTransferEnabled,
                            power_transfered_time: currentTime // Always update to the current time when enabling
                        }
                    };
    
                    // If enabling power transfer, set a timeout for 24 hours from now
                    if (powerTransferEnabled) {
                        const twentyFourHoursLater = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
                        const timeUntilExpiration = twentyFourHoursLater - currentTime; // Should be 24 hours
    
                        setTimeout(() => {
                            adminLogCollection.updateOne({ _id: new objectId(adminLog._id) }, { $set: { powertransfer_enabled: false } })
                                .then(() => console.log("Power transfer disabled after 24 hours."))
                                .catch(err => console.error("Error disabling power transfer after 24 hours:", err));
                        }, timeUntilExpiration);
                    }
    
                    adminLogCollection.updateOne({ adminId: admin_ID }, updateObject)
                        .then(() => {
                            resolve({ adminId: admin_ID, powertransfer_enabled: powerTransferEnabled, power_transfered_time: currentTime });
                        })
                        .catch((err) => {
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
    
    
    authenticateEnable: (key_1, key_2, ad_MAIL, session) => {
        return new Promise(async (resolve, reject) => {
            try {
                let admin = await db.getDb().collection(collection.ADMIN_COLLECTION).findOne({ Email: ad_MAIL });
                if (admin) {
                    if (admin.access === true) {
                        const status1 = await bcrypt.compare(key_1, admin.key1);
                        const status2 = await bcrypt.compare(key_2, admin.key2);
                        
                        if (status1 && status2) {
                            resolve({ success: true });
                        } else {
                            console.log("Login failed");
                            // Increment failed attempts
                            if (!session.failedAttempts) {
                                session.failedAttempts = 1;
                            } else {
                                session.failedAttempts += 1;
                            }
                            
                            if (session.failedAttempts >= 5) {
                                session.destroy(err => {
                                    if (err) {
                                        console.error("Error destroying session:", err);
                                        reject(err);
                                    } else {
                                        resolve({ success: false, message: "Session destroyed after 5 failed attempts" });
                                    }
                                });
                            } else {
                                resolve({ success: false });
                            }
                        }
                    } else {
                        resolve({ success: false, accessFail: true });
                    }
                } else {
                    console.log("Login failed");
                    resolve({ success: false });
                }
            } catch (error) {
                console.error("Error in authenticateEnable:", error);
                reject(error);
            }
        });
    },        
      
    
    fetc_2_hPower_2_Transfer_1_Sta_8_te: (admin_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },    
    
    
    fetchUserConcentOnDeletedOneChatView: (user_id) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },    


    chatCOUNT: (userId) => {
        return new Promise((resolve, reject) => {
            try {
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
            } catch (error) {
                reject(error);
            }
        });
    },
    
    
    getReceivedMessageSendDetails: (userId) => {
        return new Promise((resolve, reject) => {
            try {
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
    

    GetallEnquiries: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                    .find({})
                    .sort({ timeStamp: -1 })  // Sort by timestamp in descending order
                    .skip(skip)
                    .limit(limit)
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
     

    AddAdminEnquiryView: (ask_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const entry = await db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                    .findOne({ _id: new objectId(ask_id) });
    
                if (entry) {
                    const formattedTimestamp = new Date().toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });                    // Update admin_opened_time with current time if entry found
                    await db.getDb().collection(collection.ADMIN_ASK_QUESTION)
                        .updateOne({ _id: new objectId(ask_id) }, { $set: { admin_opened_time: formattedTimestamp } });
    
                    resolve(entry); // Resolve with the matched entry
                } else {
                    resolve(null); // Resolve with null if entry not found
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    GetallReports: (skip, limit) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.USER_REPORTS_REPORTED)
                    .find({})
                    .sort({ timeStamp: -1 })  // Sort by timestamp in descending order
                    .skip(skip)
                    .limit(limit)
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
     

    AddAdminReportView: (report_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const entry = await db.getDb().collection(collection.USER_REPORTS_REPORTED)
                    .findOne({ _id: new objectId(report_id) });
    
                if (entry) {
                    const formattedTimestamp = new Date().toLocaleTimeString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });                    // Update admin_opened_time with current time if entry found
                    await db.getDb().collection(collection.USER_REPORTS_REPORTED)
                        .updateOne({ _id: new objectId(report_id) }, { $set: { admin_opened_time: formattedTimestamp } });
    
                    resolve(entry); // Resolve with the matched entry
                } else {
                    resolve(null); // Resolve with null if entry not found
                }
            } catch (error) {
                reject(error);
            }
        });
    },


    getAllPostDetails: (userId, skip, limit) => {
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


    deletePostComment: async (postID, commentID) => {
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
    
                const timestamp = new Date();
                const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
                // Handle based on replyCount
                // Modify the comment data
                const deletedCommentData = commentToDelete.Comment_data;
                post.comments[commentIndex].Comment_data = "this comment was removed by admin";
                post.comments[commentIndex].del_com_stat = true;
                post.comments[commentIndex].del_time = formattedTimestamp;
                post.comments[commentIndex].del_st_admin = true;

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
                    del_st_admin: true
                };

                // Insert into DELETED_POST_COMMENT_REPLY collection
                await db.getDb().collection(collection.DELETED_POST_COMMENT_REPLY).insertOne(deletedPostComment);
    
                // Update the post with modified or deleted comment
                await postCollection.updateOne({ _id: new objectId(postID) }, { $set: { comments: post.comments } });
    
                resolve({ deleted_Comment: true });
    
            } catch (err) {
                reject(err);
            }
        });
    },


    deletePostCommentSupreme: async (postID, commentID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
    
                // Find the post and the comment to be deleted or modified
                const post = await postCollection.findOne({ _id: new objectId(postID) });
                if (!post) {
                    resolve({ deleted_Comment_supreme: false});
                    return;
                }
    
                // Locate the comment within the post
                const commentIndex = post.comments.findIndex(comment => comment.comment_id.equals(new objectId(commentID)));
                if (commentIndex === -1) {
                    resolve({ deleted_Comment_supreme: false});
                    return;
                }
    
                // Remove the comment from the post
                post.comments.splice(commentIndex, 1);

                await postCollection.updateOne({ _id: new objectId(postID) }, { $set: { comments: post.comments } });
    
                resolve({ deleted_Comment_supreme: true });
                return
    
            } catch (err) {
                reject(err);
            }
        });
    },


    deletePostCommentReply: async (postID, commentID, replyID) => {
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
    
                // Save the original reply content before modifying
                const replyToDelete = post.comments[commentIndex].replies[replyIndex];
                const deletedReplyContent = post.comments[commentIndex].replies[replyIndex].Reply_content;
                const timestamp = new Date();
                const formattedTimestamp = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
                // Update reply with modified content and additional variables
                post.comments[commentIndex].replies[replyIndex].Reply_content = "this reply was removed by admin";
                post.comments[commentIndex].replies[replyIndex].del_rep_stat = true;
                post.comments[commentIndex].replies[replyIndex].del_time = formattedTimestamp;
                post.comments[commentIndex].replies[replyIndex].deleted_Reply_content = deletedReplyContent;
                post.comments[commentIndex].replies[replyIndex].del_st_admin = true;

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
                    del_st_admin: true
                };

                 // Insert into DELETED_POST_COMMENT_REPLY collection
                 await db.getDb().collection(collection.DELETED_POST_COMMENT_REPLY).insertOne(deletedPostCommentReply);
    
                // Update the post in the database
                await postCollection.updateOne(
                    { _id: new objectId(postID) },
                    { $set: { comments: post.comments } }
                );   
    
                resolve({ deleted_reply_Comment: true });
                return
            } catch (err) {
                reject(err);
            }
        });
    }, 


    deletePostCommentReplySupreme: async (postID, commentID, replyID) => {
        return new Promise(async (resolve, reject) => {
            try {
                const postCollection = db.getDb().collection(collection.POST_COLLECTION);
                
                // Find the post by postID
                const post = await postCollection.findOne({ _id: new objectId(postID) });
                if (!post) {
                    return resolve({ deleted_reply_Comment_supreme: false });
                }
    
                // Ensure the post has comments
                if (!post.comments) {
                    return resolve({ deleted_reply_Comment_supreme: false });
                }
    
                // Find the index of the comment containing the reply
                const commentIndex = post.comments.findIndex(comment => comment.comment_id.equals(new objectId(commentID)));
                if (commentIndex === -1) {
                    return resolve({ deleted_reply_Comment_supreme: false });
                }
    
                // Ensure the comment has replies
                if (!post.comments[commentIndex].replies) {
                    return resolve({ deleted_reply_Comment_supreme: false });
                }
    
                // Find the index of the specific reply to delete
                const replyIndex = post.comments[commentIndex].replies.findIndex(reply => reply.reply_id.equals(new objectId(replyID)));
                if (replyIndex === -1) {
                    return resolve({ deleted_reply_Comment_supreme: false });
                }
    
                // Remove the reply from the replies array
                post.comments[commentIndex].replies.splice(replyIndex, 1);
    
                // Update the post in the database
                await postCollection.updateOne(
                    { _id: new objectId(postID) }, 
                    { $set: { comments: post.comments } }
                );
    
                resolve({ deleted_reply_Comment_supreme: true });
                return
            } catch (err) {
                reject(err);
            }
        });
    },    


    AdminDeletedPostComment: (postID, commentID, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date();
                db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                    { adminId: admin_id },
                    {
                        $setOnInsert: { adminId: admin_id },
                        $addToSet: {
                            deletedPostCommentsAdmin: { 
                                postID,
                                commentID,
                                deletedAt: currentTime 
                            }
                        }
                    },
                    { upsert: true, returnOriginal: false }
                ).then((result) => {
                    resolve({ message: 'Added admin deleted post comments log.' });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },


    AdminDeletedPostCommentReply: (postID, commentID, replyID, admin_id) => {
        return new Promise((resolve, reject) => {
            try {
                const currentTime = new Date();
                db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                    { adminId: admin_id },
                    {
                        $setOnInsert: { adminId: admin_id },
                        $addToSet: {
                            deletedPostCommentRepliesAdmin: { 
                                postID,
                                commentID,
                                replyID,
                                deletedAt: currentTime 
                            }
                        }
                    },
                    { upsert: true, returnOriginal: false }
                ).then((result) => {
                    resolve({ message: 'Added admin deleted post comment replies log.' });
                }).catch((error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    },


    deletePost: (postId) => {
        return new Promise((resolve, reject) => {
            try {
                db.getDb().collection(collection.POST_COLLECTION).findOne(
                    { _id: new objectId(postId) }
                ).then((post) => {
                    if (post) {
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





//     NOTIFICATION  


updateTimeOnleaveGroupchatAdmin: (Sender_Id, timestamp,messageCount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);

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


fetch_Groupchat_last_leave_count_Admin: (Sender_Id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            const query = { _id: new objectId(Sender_Id) };
            const userDocument = await userCollection.findOne(query);
            const lastGroupchatCount = userDocument && userDocument.last_groupchat_count !== undefined 
                ? userDocument.last_groupchat_count 
                : 0;
            resolve(lastGroupchatCount);
        } catch (error) {
            reject(error);
        }
    });
},


getAllCurrentEnquiryCount: () => {
    return new Promise(async (resolve, reject) => {
        try {
            const enquiryCollection = db.getDb().collection(collection.ADMIN_ASK_QUESTION);
            const totalEntries = await enquiryCollection.countDocuments();

            resolve(totalEntries);
        } catch (error) {
            reject(error);
        }
    });
},


enquiryCountLastLeaveAdmin: (Sender_Id,enquiryCount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);

            const query = { _id: new objectId(Sender_Id) };
            const update = { $set: {last_leaved_enquiry_count: enquiryCount } };
            const options = { upsert: true };

            await userCollection.updateOne(query, update, options);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
},


GetLastEnquiryCountAdmin : (Sender_Id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            const query = { _id: new objectId(Sender_Id) };
            const admin = await userCollection.findOne(query);
            const lastLeavedEnquiryCount = admin ? admin.last_leaved_enquiry_count : 0;
            resolve(lastLeavedEnquiryCount);
        } catch (error) {
            reject(error);
        }
    });
},


GetCurrentEnquiryCountAdmin : () => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_ASK_QUESTION);
            const count = await userCollection.countDocuments();
            resolve(count);
        } catch (error) {
            // If there's an error (e.g., collection not found), resolve with 0
            resolve(0);
        }
    });
},


getCurrentMentorCount: () => {
    return new Promise(async (resolve, reject) => {
        try {
            const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);
            const totalEntries = await mentorCollection.countDocuments();

            resolve(totalEntries);
        } catch (error) {
            reject(error);
        }
    });
},


updateCountOnleaveMentorshipAdmin: (Sender_Id,mentorCount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);

            const query = { _id: new objectId(Sender_Id) };
            const update = { $set: {last_mentorportal_count: mentorCount } };
            const options = { upsert: true };

            await userCollection.updateOne(query, update, options);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
},


fetch_MentorPortal_last_leave_count_Admin: (Sender_Id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            const query = { _id: new objectId(Sender_Id) };
            const userDocument = await userCollection.findOne(query);
            const lastMentorCount = userDocument && userDocument.last_mentorportal_count !== undefined 
                ? userDocument.last_mentorportal_count 
                : 0;
            resolve(lastMentorCount);
        } catch (error) {
            reject(error);
        }
    });
},


get_current_MentorPortal_count_Admin: () => {
    return new Promise(async (resolve, reject) => {
        try {
            const mentorCollection = db.getDb().collection(collection.MENTOR_COLLECTION);
            const totalEntries = await mentorCollection.countDocuments();
            resolve(totalEntries);
        } catch (error) {
            reject(error);
        }
    });
},


updateCountOnleaveJobportalAdmin: (Sender_Id,JobCount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);

            const query = { _id: new objectId(Sender_Id) };
            const update = { $set: {last_jobportal_count: JobCount } };
            const options = { upsert: true };

            await userCollection.updateOne(query, update, options);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
},


fetch_JobPortal_last_leave_count_Admin: (Sender_Id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            const query = { _id: new objectId(Sender_Id) };
            const userDocument = await userCollection.findOne(query);
            const lastJobCount = userDocument && userDocument.last_jobportal_count !== undefined 
                ? userDocument.last_jobportal_count 
                : 0;
            resolve(lastJobCount);
        } catch (error) {
            reject(error);
        }
    });
},


get_current_JobPortal_count_Admin: () => {
    return new Promise(async (resolve, reject) => {
        try {
            const jobCollection = db.getDb().collection(collection.JOB_COLLECTION);
            const totalEntries = await jobCollection.countDocuments();
            resolve(totalEntries);
        } catch (error) {
            reject(error);
        }
    });
},


updateCountOnleaveInternPortalAdmin: (Sender_Id,InternCount) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);

            const query = { _id: new objectId(Sender_Id) };
            const update = { $set: {last_internportal_count: InternCount } };
            const options = { upsert: true };

            await userCollection.updateOne(query, update, options);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
},


fetch_InternPortal_last_leave_count_Admin: (Sender_Id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            const query = { _id: new objectId(Sender_Id) };
            const userDocument = await userCollection.findOne(query);
            const lastInternCount = userDocument && userDocument.last_internportal_count !== undefined 
                ? userDocument.last_internportal_count 
                : 0;
            resolve(lastInternCount);
        } catch (error) {
            reject(error);
        }
    });
},


get_current_InternPortal_count_Admin: () => {
    return new Promise(async (resolve, reject) => {
        try {
            const internCollection = db.getDb().collection(collection.INTERN_COLLECTION);
            const totalEntries = await internCollection.countDocuments();
            resolve(totalEntries);
        } catch (error) {
            reject(error);
        }
    });
},


storeAdminNotification: (
    userId,new_Intern_Notif_Count,new_Intern_Notif,
    new_Job_Notif_Count,new_Job_Notif,
    new_enquiry_count_admin,newEnquiry_notif_admin,
    mentorcount_admin,newMentor_notif_admin,
    AllNewExistingMessageCountAdmin,newMessagesInExisting_Found,
    new_Messenger,new_messenger_found,New_Reciever,
    groupchatcount_admin,groupchat_notif_admin
) => { return new Promise(async (resolve, reject) => {
        try {
            const broadlastentrytimeCollection = db.getDb().collection(collection.ADMIN_NOTIFICATION_COLLECTION);
            //const fullNotificationCollection = db.getDb().collection(collection.ADMIN_FULL_NOTIFICATION_COLLECTION);

            const entry = await broadlastentrytimeCollection.findOne({ Sender_Id: userId });

            if (entry) {
                const latestNotification = entry.notification[entry.notification.length - 1];
                let isChanged = false;

                // Compare incoming parameters with latest entry in notification array
                if (
                    latestNotification.new_Intern_Notif_Count !== new_Intern_Notif_Count ||
                    latestNotification.new_Intern_Notif !== new_Intern_Notif ||
                    latestNotification.new_Job_Notif_Count !== new_Job_Notif_Count ||
                    latestNotification.new_Job_Notif !== new_Job_Notif ||
                    latestNotification.new_enquiry_count_admin !== new_enquiry_count_admin ||
                    latestNotification.newEnquiry_notif_admin !== newEnquiry_notif_admin ||
                    latestNotification.mentorcount_admin !== mentorcount_admin ||
                    latestNotification.newMentor_notif_admin !== newMentor_notif_admin ||
                    latestNotification.AllNewExistingMessageCountAdmin !== AllNewExistingMessageCountAdmin ||
                    latestNotification.newMessagesInExisting_Found !== newMessagesInExisting_Found ||
                    latestNotification.new_Messenger !== new_Messenger ||
                    latestNotification.new_messenger_found !== new_messenger_found ||
                    latestNotification.groupchatcount_admin !== groupchatcount_admin ||
                    latestNotification.groupchat_notif_admin !== groupchat_notif_admin
                ) {
                    isChanged = true;
                }

                if (isChanged) {
                    // Create a new entry with current time and set all incoming parameters
                    const newNotification = {
                        entered_timeStamp: new Date(),
                        new_Intern_Notif_Count,
                        new_Intern_Notif,
                        new_Job_Notif_Count,
                        new_Job_Notif,
                        new_enquiry_count_admin,
                        newEnquiry_notif_admin,
                        mentorcount_admin,
                        newMentor_notif_admin,
                        AllNewExistingMessageCountAdmin,
                        newMessagesInExisting_Found,
                        new_Messenger,
                        new_messenger_found,
                        New_Reciever,
                        groupchatcount_admin,
                        groupchat_notif_admin
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
                    new_Intern_Notif_Count,
                    new_Intern_Notif,
                    new_Job_Notif_Count,
                    new_Job_Notif,
                    new_enquiry_count_admin,
                    newEnquiry_notif_admin,
                    mentorcount_admin,
                    newMentor_notif_admin,
                    AllNewExistingMessageCountAdmin,
                    newMessagesInExisting_Found,
                    new_Messenger,
                    new_messenger_found,
                    New_Reciever,
                    groupchatcount_admin,
                    groupchat_notif_admin
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


getAdminViewNotifications: (userId) => {
    return new Promise((resolve, reject) => {
        try {
            db.getDb().collection(collection.ADMIN_NOTIFICATION_COLLECTION).findOne({ Sender_Id: userId })
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


getAllMailOfAdminCheckAccessButton: () => {
    return new Promise((resolve, reject) => {
        const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

        db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).find({
            $or: [
                { viewEnabledForAdmin: true },
                { powertransfer_enabled: true }
            ]
        }).batchSize(1000).toArray()
        .then((response) => {
            const emails = [];
            const updateOperations = [];

            response.forEach(user => {
                // Debugging: Log the current user data

                // Check and update viewEnabledForAdmin if the time is older than one day
                if (user.viewEnabledForAdminTime && user.viewEnabledForAdminTime < oneDayAgo) {
                    emails.push(user.Email);
                    updateOperations.push({
                        updateOne: {
                            filter: { _id: user._id },
                            update: { $set: { viewEnabledForAdmin: false } }
                        }
                    });
                }

                // Check and update powertransfer_enabled if the time is older than one day
                if (user.powertransfer_enabled === true) {
                    if (user.power_transfered_time && user.power_transfered_time < oneDayAgo) {
                        updateOperations.push({
                            updateOne: {
                                filter: { _id: user._id },
                                update: { $set: { powertransfer_enabled: false } }
                            }
                        });
                    } else {
                        console.log(`No update needed for user ID: ${user._id}`);
                    }
                }
            });

            // Perform the bulk update to set viewEnabledForAdmin and powertransfer_enabled to false
            const bulkWritePromise = updateOperations.length > 0 
                ? db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).bulkWrite(updateOperations)
                : Promise.resolve();

            bulkWritePromise.then(() => resolve(emails)).catch((error) => reject(error));

        }).catch((error) => {
            reject(error);
        });
    });
},


sendRestrictData: (userId) => {
    return new Promise((resolve, reject) => {
        try {
            db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) })
                .then((user) => {
                    if (user) {
                        // Check if 'restrict_group' exists
                        if (user.restrict_group) {
                            // 'restrict_group' exists, set it to true
                            db.getDb().collection(collection.USER_COLLECTION).updateOne(
                                { _id: new objectId(userId) },
                                { $set: { restrict_group: true } }
                            ).then(() => {
                                resolve(true); // Successfully updated
                            }).catch((err) => {
                                reject(err); // Catch any errors during the update operation
                            });
                        } else {
                            // 'restrict_group' does not exist, create it and set it to true
                            db.getDb().collection(collection.USER_COLLECTION).updateOne(
                                { _id: new objectId(userId) },
                                { $set: { restrict_group: true } }
                            ).then(() => {
                                resolve(true); // Successfully created and set
                            }).catch((err) => {
                                reject(err); // Catch any errors during the update operation
                            });
                        }
                    } else {
                        resolve([]); // User not found, resolve with an empty array
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


sendAdminRestrictDataLog: (userId, myid) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.ADMIN_LOG_DETAILS_COLLECTION;

            dbInstance.collection(collectionName).findOne({ adminId: myid })
                .then((adminLog) => {
                    const currentTime = new Date(); // Current timestamp
                    const updateQuery = {};
                    const dynamicUpdateQuery = {};

                    // Handle adminRestrictedGroupUser update
                    if (adminLog && adminLog.adminRestrictedGroupUser && Array.isArray(adminLog.adminRestrictedGroupUser)) {
                        // Add a new entry to adminRestrictedGroupUser with the current time
                        updateQuery.$push = {
                            adminRestrictedGroupUser: { [userId]: true, timestamp: currentTime }
                        };
                    } else {
                        // Create adminRestrictedGroupUser array with the current entry
                        updateQuery.$set = {
                            adminRestrictedGroupUser: [{ [userId]: true, timestamp: currentTime }]
                        };
                    }

                    // Handle adminRestrictedGroupUserDynamic update
                    let dynamicArrayUpdated = false;
                    if (adminLog && adminLog.adminRestrictedGroupUserDynamic && Array.isArray(adminLog.adminRestrictedGroupUserDynamic)) {
                        const dynamicArray = adminLog.adminRestrictedGroupUserDynamic;
                        const userEntryIndex = dynamicArray.findIndex(entry => Object.keys(entry)[0] === userId);

                        if (userEntryIndex !== -1) {
                            // Entry exists, update the value if it's false
                            if (!dynamicArray[userEntryIndex][userId]) {
                                dynamicArray[userEntryIndex][userId] = true;
                                dynamicUpdateQuery.$set = {
                                    adminRestrictedGroupUserDynamic: dynamicArray
                                };
                                dynamicArrayUpdated = true;
                            }
                        } else {
                            // Entry does not exist, add it
                            dynamicArray.push({ [userId]: true });
                            dynamicUpdateQuery.$set = {
                                adminRestrictedGroupUserDynamic: dynamicArray
                            };
                            dynamicArrayUpdated = true;
                        }
                    } else {
                        // adminRestrictedGroupUserDynamic does not exist, create it
                        dynamicUpdateQuery.$set = {
                            adminRestrictedGroupUserDynamic: [{ [userId]: true }]
                        };
                        dynamicArrayUpdated = true;
                    }

                    // Perform both updates if needed
                    const updateOperations = [];
                    if (Object.keys(updateQuery).length > 0) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                updateQuery
                            )
                        );
                    }
                    if (dynamicArrayUpdated) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                dynamicUpdateQuery
                            )
                        );
                    }

                    Promise.all(updateOperations)
                        .then(() => {
                            resolve(true); // Successfully updated or created
                        })
                        .catch((err) => {
                            reject(err); // Catch any errors during the update operation
                        });

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


getAllGroupRestrictedUser: (myid) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.ADMIN_LOG_DETAILS_COLLECTION;

            dbInstance.collection(collectionName).findOne({ adminId: myid })
                .then((adminLog) => {
                    if (adminLog && Array.isArray(adminLog.adminRestrictedGroupUserDynamic)) {
                        // Filter the array to find entries where the value is true
                        const restrictedUsers = adminLog.adminRestrictedGroupUserDynamic
                            .filter(entry => Object.values(entry)[0] === true)
                            .map(entry => Object.keys(entry)[0]);

                        resolve(restrictedUsers);
                    } else {
                        resolve([]); // No admin log found or adminRestrictedGroupUserDynamic array not found
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


removeGroupRestriction: (userId) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.USER_COLLECTION;

            dbInstance.collection(collectionName).findOne({ _id: new objectId(userId) })
                .then((user) => {
                    if (user && user.restrict_group === true) {
                        // If 'restrict_group' exists and is true, remove the field
                        dbInstance.collection(collectionName).updateOne(
                            { _id: new objectId(userId) },
                            { $unset: { restrict_group: "" } }
                        )
                        .then(() => {
                            resolve(true); // Successfully removed the field
                        })
                        .catch((err) => {
                            reject(err); // Catch any errors during the update operation
                        });
                    } else {
                        resolve(false); // User not found or 'restrict_group' is not true
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


addRemoveRestrictionLogAdmin: (userId, myid) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.ADMIN_LOG_DETAILS_COLLECTION;

            dbInstance.collection(collectionName).findOne({ adminId: myid })
                .then((adminLog) => {
                    const currentTime = new Date(); // Current timestamp
                    const updateQuery = {};
                    const dynamicUpdateQuery = {};
                    
                    let adminRestrictedGroupUserUpdated = false;
                    let dynamicArrayUpdated = false;

                    // Update or create adminRestrictedGroupUser
                    if (adminLog && adminLog.adminRestrictedGroupUser && Array.isArray(adminLog.adminRestrictedGroupUser)) {
                        // Add a new entry with false and current timestamp
                        updateQuery.$push = {
                            adminRestrictedGroupUser: { [userId]: false, timestamp: currentTime }
                        };
                        adminRestrictedGroupUserUpdated = true;
                    } else {
                        // Create the array with the current entry
                        updateQuery.$set = {
                            adminRestrictedGroupUser: [{ [userId]: false, timestamp: currentTime }]
                        };
                        adminRestrictedGroupUserUpdated = true;
                    }

                    // Handle adminRestrictedGroupUserDynamic update
                    if (adminLog && adminLog.adminRestrictedGroupUserDynamic && Array.isArray(adminLog.adminRestrictedGroupUserDynamic)) {
                        const dynamicArray = adminLog.adminRestrictedGroupUserDynamic;
                        const userEntryIndex = dynamicArray.findIndex(entry => Object.keys(entry)[0] === userId);

                        if (userEntryIndex !== -1) {
                            // Entry exists, update the value to false if necessary
                            if (dynamicArray[userEntryIndex][userId]) {
                                dynamicArray[userEntryIndex][userId] = false;
                                dynamicUpdateQuery.$set = {
                                    adminRestrictedGroupUserDynamic: dynamicArray
                                };
                                dynamicArrayUpdated = true;
                            }
                        } else {
                            // Entry does not exist, add it
                            dynamicArray.push({ [userId]: false });
                            dynamicUpdateQuery.$set = {
                                adminRestrictedGroupUserDynamic: dynamicArray
                            };
                            dynamicArrayUpdated = true;
                        }
                    } else {
                        // adminRestrictedGroupUserDynamic does not exist, create it
                        dynamicUpdateQuery.$set = {
                            adminRestrictedGroupUserDynamic: [{ [userId]: false }]
                        };
                        dynamicArrayUpdated = true;
                    }

                    // Perform the update operations
                    const updateOperations = [];
                    if (adminRestrictedGroupUserUpdated) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                updateQuery
                            )
                        );
                    }
                    if (dynamicArrayUpdated) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                dynamicUpdateQuery
                            )
                        );
                    }

                    Promise.all(updateOperations)
                        .then(() => {
                            resolve(true); // Successfully updated or created
                        })
                        .catch((err) => {
                            reject(err); // Catch any errors during the update operation
                        });

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


sendRestrictUserData: (userId) => {
    return new Promise((resolve, reject) => {
        try {
            db.getDb().collection(collection.USER_COLLECTION).findOne({ _id: new objectId(userId) })
                .then((user) => {
                    if (user) {
                        // Check if 'restrict_portal' exists
                        if (user.restrict_portal) {
                            // 'restrict_portal' exists, set it to true
                            db.getDb().collection(collection.USER_COLLECTION).updateOne(
                                { _id: new objectId(userId) },
                                { $set: { restrict_portal: true } }
                            ).then(() => {
                                resolve(true); // Successfully updated
                            }).catch((err) => {
                                reject(err); // Catch any errors during the update operation
                            });
                        } else {
                            // 'restrict_portal' does not exist, create it and set it to true
                            db.getDb().collection(collection.USER_COLLECTION).updateOne(
                                { _id: new objectId(userId) },
                                { $set: { restrict_portal: true } }
                            ).then(() => {
                                resolve(true); // Successfully created and set
                            }).catch((err) => {
                                reject(err); // Catch any errors during the update operation
                            });
                        }
                    } else {
                        resolve([]); // User not found, resolve with an empty array
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


sendAdminRestrictUserDataLog: (userId, myid) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.ADMIN_LOG_DETAILS_COLLECTION;

            dbInstance.collection(collectionName).findOne({ adminId: myid })
                .then((adminLog) => {
                    const currentTime = new Date(); // Current timestamp
                    const updateQuery = {};
                    const dynamicUpdateQuery = {};

                    // Handle adminPortalRestrictedUser update
                    if (adminLog && adminLog.adminPortalRestrictedUser && Array.isArray(adminLog.adminPortalRestrictedUser)) {
                        // Add a new entry to adminPortalRestrictedUser with the current time
                        updateQuery.$push = {
                            adminPortalRestrictedUser: { [userId]: true, timestamp: currentTime }
                        };
                    } else {
                        // Create adminPortalRestrictedUser array with the current entry
                        updateQuery.$set = {
                            adminPortalRestrictedUser: [{ [userId]: true, timestamp: currentTime }]
                        };
                    }

                    // Handle adminRestrictedPortalUserDynamic update
                    let dynamicArrayUpdated = false;
                    if (adminLog && adminLog.adminRestrictedPortalUserDynamic && Array.isArray(adminLog.adminRestrictedPortalUserDynamic)) {
                        const dynamicArray = adminLog.adminRestrictedPortalUserDynamic;
                        const userEntryIndex = dynamicArray.findIndex(entry => Object.keys(entry)[0] === userId);

                        if (userEntryIndex !== -1) {
                            // Entry exists, update the value if it's false
                            if (!dynamicArray[userEntryIndex][userId]) {
                                dynamicArray[userEntryIndex][userId] = true;
                                dynamicUpdateQuery.$set = {
                                    adminRestrictedPortalUserDynamic: dynamicArray
                                };
                                dynamicArrayUpdated = true;
                            }
                        } else {
                            // Entry does not exist, add it
                            dynamicArray.push({ [userId]: true });
                            dynamicUpdateQuery.$set = {
                                adminRestrictedPortalUserDynamic: dynamicArray
                            };
                            dynamicArrayUpdated = true;
                        }
                    } else {
                        // adminRestrictedPortalUserDynamic does not exist, create it
                        dynamicUpdateQuery.$set = {
                            adminRestrictedPortalUserDynamic: [{ [userId]: true }]
                        };
                        dynamicArrayUpdated = true;
                    }

                    // Perform both updates if needed
                    const updateOperations = [];
                    if (Object.keys(updateQuery).length > 0) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                updateQuery
                            )
                        );
                    }
                    if (dynamicArrayUpdated) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                dynamicUpdateQuery
                            )
                        );
                    }

                    Promise.all(updateOperations)
                        .then(() => {
                            resolve(true); // Successfully updated or created
                        })
                        .catch((err) => {
                            reject(err); // Catch any errors during the update operation
                        });

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


getAllPortalRestrictedUser: (myid) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.ADMIN_LOG_DETAILS_COLLECTION;

            dbInstance.collection(collectionName).findOne({ adminId: myid })
                .then((adminLog) => {
                    if (adminLog && Array.isArray(adminLog.adminRestrictedPortalUserDynamic)) {
                        // Filter the array to find entries where the value is true
                        const restrictedUsers = adminLog.adminRestrictedPortalUserDynamic
                            .filter(entry => Object.values(entry)[0] === true)
                            .map(entry => Object.keys(entry)[0]);

                        resolve(restrictedUsers);
                    } else {
                        resolve([]); // No admin log found or adminRestrictedPortalUserDynamic array not found
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


removePortalRestriction: (userId) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.USER_COLLECTION;

            dbInstance.collection(collectionName).findOne({ _id: new objectId(userId) })
                .then((user) => {
                    if (user && user.restrict_portal === true) {
                        // If 'restrict_portal' exists and is true, remove the field
                        dbInstance.collection(collectionName).updateOne(
                            { _id: new objectId(userId) },
                            { $unset: { restrict_portal: "" } }
                        )
                        .then(() => {
                            resolve(true); // Successfully removed the field
                        })
                        .catch((err) => {
                            reject(err); // Catch any errors during the update operation
                        });
                    } else {
                        resolve(false); // User not found or 'restrict_portal' is not true
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


addRemovePortalRestrictionLogAdmin: (userId, myid) => {
    return new Promise((resolve, reject) => {
        try {
            const dbInstance = db.getDb();
            const collectionName = collection.ADMIN_LOG_DETAILS_COLLECTION;

            dbInstance.collection(collectionName).findOne({ adminId: myid })
                .then((adminLog) => {
                    const currentTime = new Date(); // Current timestamp
                    const updateQuery = {};
                    const dynamicUpdateQuery = {};
                    
                    let adminPortalRestrictedUserUpdated = false;
                    let dynamicArrayUpdated = false;

                    // Update or create adminPortalRestrictedUser
                    if (adminLog && adminLog.adminPortalRestrictedUser && Array.isArray(adminLog.adminPortalRestrictedUser)) {
                        // Add a new entry with false and current timestamp
                        updateQuery.$push = {
                            adminPortalRestrictedUser: { [userId]: false, timestamp: currentTime }
                        };
                        adminPortalRestrictedUserUpdated = true;
                    } else {
                        // Create the array with the current entry
                        updateQuery.$set = {
                            adminPortalRestrictedUser: [{ [userId]: false, timestamp: currentTime }]
                        };
                        adminPortalRestrictedUserUpdated = true;
                    }

                    // Handle adminRestrictedPortalUserDynamic update
                    if (adminLog && adminLog.adminRestrictedPortalUserDynamic && Array.isArray(adminLog.adminRestrictedPortalUserDynamic)) {
                        const dynamicArray = adminLog.adminRestrictedPortalUserDynamic;
                        const userEntryIndex = dynamicArray.findIndex(entry => Object.keys(entry)[0] === userId);

                        if (userEntryIndex !== -1) {
                            // Entry exists, update the value to false if necessary
                            if (dynamicArray[userEntryIndex][userId]) {
                                dynamicArray[userEntryIndex][userId] = false;
                                dynamicUpdateQuery.$set = {
                                    adminRestrictedPortalUserDynamic: dynamicArray
                                };
                                dynamicArrayUpdated = true;
                            }
                        } else {
                            // Entry does not exist, add it
                            dynamicArray.push({ [userId]: false });
                            dynamicUpdateQuery.$set = {
                                adminRestrictedPortalUserDynamic: dynamicArray
                            };
                            dynamicArrayUpdated = true;
                        }
                    } else {
                        // adminRestrictedPortalUserDynamic does not exist, create it
                        dynamicUpdateQuery.$set = {
                            adminRestrictedPortalUserDynamic: [{ [userId]: false }]
                        };
                        dynamicArrayUpdated = true;
                    }

                    // Perform the update operations
                    const updateOperations = [];
                    if (adminPortalRestrictedUserUpdated) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                updateQuery
                            )
                        );
                    }
                    if (dynamicArrayUpdated) {
                        updateOperations.push(
                            dbInstance.collection(collectionName).updateOne(
                                { adminId: myid },
                                dynamicUpdateQuery
                            )
                        );
                    }

                    Promise.all(updateOperations)
                        .then(() => {
                            resolve(true); // Successfully updated or created
                        })
                        .catch((err) => {
                            reject(err); // Catch any errors during the update operation
                        });

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


GetUserToClearRecord: (Name,DOB) => {
    return new Promise(async (resolve, reject) => {
        if (!Name || !DOB) {
            resolve([]);
            return;
        }
        let userNamesDetails = [];
        try {
            // Convert JavaScript Date to Excel serial number
            const dateToSerial = (date) => {
                const epoch = new Date(Date.UTC(1900, 0, 1));
                return (Date.parse(date) - epoch) / (1000 * 60 * 60 * 24) + 2;
            }; 

            // Convert input date to serial number
            const dobInputSerial = dateToSerial(new Date(DOB));

            db.getDb().collection(collection.USER_BASIC_COLLECTION).findOne({
                $expr: {
                    $and: [
                        { $eq: [{ $toLower: "$Name" }, Name.toLowerCase()] },
                        { $eq: ["$DOB", dobInputSerial] }
                    ]
                }
            }) .then((response) => {
                if (response) {
                    // Push the result to userNamesDetails
                    userNamesDetails.push({
                        Name: response.Name,
                        DOB: DOB,  // Format as 'YYYY-MM-DD'
                        Status: response.Status,
                        ID: response._id.toString()
                    });
                } 
                resolve(userNamesDetails);
            })
            .catch((error) => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
},


removeUserRecordFromBasics: (entry_id) => {
    return new Promise((resolve, reject) => {
        try {
            db.getDb().collection(collection.USER_BASIC_COLLECTION).deleteOne({
                _id: new objectId(entry_id)
            }).then((entry) => {
                resolve({ deleteEntryRecord: true });
            }).catch((error) => {
                reject(error);
            });
        } catch (error) {
            console.error("Error in deleteUserRecordByAdmin:", error);
            reject(error);
        }
    });
},


adminClearedUserRecordLog: (Name, Status, admin_id) => {
    return new Promise((resolve, reject) => {
        const currentTime = new Date();
        try {
            db.getDb().collection(collection.ADMIN_LOG_DETAILS_COLLECTION).findOneAndUpdate(
                { adminId: admin_id },
                {
                    $setOnInsert: { adminId: admin_id },
                    $addToSet: {
                        ClearRecordLog: { 
                            Name, 
                            Status, 
                            updated_time: currentTime 
                        }
                    }
                },
                { upsert: true, returnOriginal: false }
            ).then((result) => {
                if (!result.value) {
                    resolve({ message: 'Admin log details created and clear record log updated.' });
                } else {
                    resolve({ message: 'clear record log updated successfully.' });
                }
            }).catch((error) => {
                reject(error);
            });
        } catch (error) {
            console.error("Error in clear record:", error);
            reject(error);
        }
    });
},    


getAllMailAdminAlumniBlockCheckButton: () => {
    return new Promise(async (resolve, reject) => {
        try {
            const adminCollection = db.getDb().collection(collection.ADMIN_COLLECTION);
            const currentTime = new Date();

            // Find the admin document
            const adminEntry = await adminCollection.findOne({});

            if (adminEntry) {
                const blockedTime = adminEntry.blocked_time;
                const access = adminEntry.access;

                // Check if access is false and blocked_time is present
                if (access === false && blockedTime) {
                    const blockedTimeDate = new Date(blockedTime);
                    const timeDifference = currentTime - blockedTimeDate;

                    // Check if blocked_time is older than 7 days (7 * 24 * 60 * 60 * 1000 ms)
                    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
                    if (timeDifference > sevenDaysInMs) {
                        // Update access to true and remove blocked_time
                        await adminCollection.updateOne(
                            { _id: adminEntry._id },
                            {
                                $set: { access: true },
                                $unset: { blocked_time: "" }
                            }
                        );
                    }
                }
            }

            resolve("Check and update completed successfully.");
        } catch (error) {
            reject("Unexpected error: " + error);
        }
    });
},




}