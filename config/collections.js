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

module.exports={
    USER_COLLECTION: 'user',
    USER_BASIC_COLLECTION : 'basic_user',
    //DELETED_USER_BY_ADMIN : 'deletedUser',
    ADMIN_COLLECTION: 'admin',
    GROUP_CHAT_COLLECTION: 'groupchat',
    GROUP_UNIQUE_COLLECTION: 'groupuniquechat',
    JOB_COLLECTION: 'jobportal',
    MENTOR_COLLECTION: 'mentorship',
    INTERN_COLLECTION: 'internship',
    POST_COLLECTION: 'posts',
    DELETED_GROUP_CHAT_COLLECTION: 'deletedgroupchat',
    ONE_ON_ONE_CHAT_COLLECTION: 'oneononechat',
    DELETED_ONE_ON_ONE_CHAT_COLLECTION: 'deleteoneononechat',
    TIME_UNREAD_COLLECTION: 'timestampunread', 
    ONE_CHAT_FIRST_CHAT_DETAILS: 'onechatfirstchatdetails',
    LOG_DETAILS_COLLECTION: 'logdetails',
    ADMIN_LOG_DETAILS_COLLECTION: 'adminlog',
    ADMIN_BROADCAST_ALL: 'admin_broadcast_message',
    ADMIN_BROADCAST_UNIQUE_COLLECTION: 'adminbroaduniquestat',
    DELETED_ADMIN_BROADCAST: 'deleted_admin_broadcasts',
    ADMIN_CHAT_ENTRY_HISTORY: 'admin_chat_entry_history',
    SUPER_ADMIN_COLLECTION: 'superadmin',
    ACCOUNT_DISABLE_USER_LOGS: 'account_disable_user_logs',
    USER_PROFILE_VIEW_OTHERUSER: 'user_profile_view_otheruser',
    USER_REPORTS_REPORTED: 'user_reports_reported',
    USER_BLOCKS_LOGS: 'user_block_logs',
    UNBLOCK_BLOCK_LOG: 'unblock_block_log',
    ADMIN_ASK_QUESTION: 'admin_asked_question_log',
    CHAT_BACK_AND_FORTH_BOOK: 'chatbackandforthbook',
    CHAT_BACK_AND_FORTH_BOOK_ADMIN: 'chatbackandforthbookadmin',
    TIME_UNREAD_COLLECTION_ADMIN: 'timestampunreadadmin',
    ONE_CHAT_FIRST_CHAT_DETAILS_ADMIN: 'onechatfirstchatdetailsadmin',
    ONE_ON_ONE_CHAT_COLLECTION_ADMIN: 'oneononechatadmin',
    NOTIFICATION_COLLECTION: 'notifications',
    ADMIN_PRIVATECHAT_VIEW_USER_NOTIFY: 'adminprivatechatviewusernotify',
    USER_MENTOR_COLLECTION: 'user_mentor_collection',
    FULL_NOTIFICATION_COLLECTION: 'full_notifications',
    ADMIN_NOTIFICATION_COLLECTION : 'admin_notifications',
    ADMIN_FULL_NOTIFICATION_COLLECTION: 'admin_full_notifications',
    COMMENT_REPLY_LIKE_ACTIVITY_TRACKER: 'comment_reply_like_activity_tracker',
    DELETED_POST_COMMENT_REPLY: 'deleted_post_comment_reply',
    SYSTEM_GENERAL : 'system_general_notifications'
}
