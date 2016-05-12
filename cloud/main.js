Parse.serverURL = "http://localhost:1337/parse";
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

Parse.Cloud.define('notify', function(req, res) {
   Parse.Cloud.useMasterKey();
   var targetUserId = req.params.target_user_id;
   var notificationType = req.params.notification_type;
   var title = req.params.title;
   var message = req.params.message;
   var postId = req.params.post_id;
   var postTitle = req.params.post_title;
   var unseen = req.params.unseen;
   var performerName = req.params.performer_name;
   var commentId = req.params.comment_id;
   
   // save the notification object
   var notificationObject = Parse.Object.extend("notification");
   var notifObj = new notificationObject();
   notifObj.set("target_user_id", targetUserId);
   notifObj.set("notification_type", notificationType);
   notifObj.set("title", title);
   notifObj.set("message", message);
   notifObj.set("post_id", postId);
   notifObj.set("post_title", postTitle);
   notifObj.set("unseen", unseen);
   notifObj.set("performer_name", performerName);
   notifObj.set("comment_id", commentId);

   notifObj.save(null, {
       success: function(nObj) {
           // send a notification
           // fetch the user onesignal player id
           var userQuery = new Parse.Query(Parse.User);
           // TODO limit the keys to the one signal id only
           userQuery.get(targetUserId, {
               success: function(user) {

                   var userIdArray = [];
                   userIdArray.push(user.get("onesignal_id"));

                   Parse.Cloud.httpRequest({
                       method : "POST",
                       url: "https://onesignal.com/api/v1/notifications",
                       headers: {
                           "Content-Type" : "application/json;charset=utf-8",
                           "Authorization" : "Basic MmZkNjMxNTMtYzRlYiOOMjUzLTkOYzUtNThlODkyNDJjNGYO"
                       },

                       body: {
                        app_id: "a49d7722-5022-4029-8023-e516bdcef63f",
                        contents: { en : message},
                        headings: { en : "Shirvooni" },
                        include_player_ids: userIdArray 
                    }

                   }).then(function(httpResponse) {
                       res.success("push sent");
                       console.log("push sent to " + targetUserId);
                       }, function(httpResponse) {
                           res.error("error sending push notification: " + JSON.stringify(httpResponse));
                           console.log("error : " + JSON.stringify(httpResponse));
                       });

               },
               error: function(error) {
                   console.log(error);
                   res.error(error);
               }
           });
       },
       error: function(nObj, error) {
           console.log(error);
           res.error(error);
       }
   });
});

Parse.Cloud.define('accept_post', function(req, res) {
    Parse.Cloud.useMasterKey();
    // debug

    var theObjectId = req.params.object_id;
    
    // TODO check the priviledge of the user to perform this operation
    var postQ = new Parse.Query("unchecked_post");
    postQ.get(theObjectId, {
        success: function(uObj) {
            // create a new object
            // set the values from the unchecked object
            // change the status to accepted
            // save the object to the accepted table
            // send a notification
            
            var postObj = Parse.Object.extend("accepted_post");
            var aObj = new postObj();
            
            // set the attrs
            aObj.set('number_of_ratings', uObj.get('number_of_ratings'));
            aObj.set('rating', uObj.get('rating'));
            aObj.set('title', uObj.get('title'));
            aObj.set('category', uObj.get('category'));
            aObj.set('likes', uObj.get('likes'));
            aObj.set('desc', uObj.get('desc'));
            // post status should be 1 (accepted)
            aObj.set('post_status', 1);
            aObj.set('author_id', uObj.get('author_id'));
            aObj.set('photos', uObj.get('photos'));
            aObj.set('user', uObj.get('user'));
            aObj.set('category_fa', uObj.get('category_fa'));

            // save the object
            aObj.save(null, {
                success: function(theObj) {
                    // respond with the object id
                    // TODO remove this
                    //console.log("post accepted. object id: " + theObj.getObjectId());
                    
                    res.success(theObj.id);

                    // delete the object from the unchecked posts table
                    uObj.destroy({
                        success: function() {
                            console.log("removed from unchecked collection");
                        },
                        error: function(error) {
                            console.log(error);
                        }
                    });

                    // TODO send the confirmation notification
                    Parse.Cloud.run('notify', {
                        target_user_id: theObj.get("author_id"),
                        notification_type: 0,
                        title: "acceptance",
                        message: "Your post was published",
                        post_id: theObj.id,
                        post_title: theObj.get("title"),
                        unseen: true,
                        performer_name: "Shirvooni",
                        comment_id : ""
                    }).then(function(str) {
                        console.log(str);
                    }, function(error) {
                        console.log(error);
                    });
                },
                error: function(theObj, error) {
                    console.log(error);
                    res.error(error);
                }
            });
        },
        error: function(error) {
            console.log(error);
            res.error(error);
        }
    });

});

Parse.Cloud.define('reject_post', function(req, res) {
    Parse.Cloud.useMasterKey();

    var theObjectId = req.params.object_id;
    
    // TODO check the priviledge of the user to perform this operation
    var postQ = new Parse.Query("unchecked_post");
    postQ.get(theObjectId, {
        success: function(uObj) {
            // create a new object
            // set the values from the unchecked object
            // change the status to accepted
            // save the object to the accepted table
            // send a notification
            
            var postObj = Parse.Object.extend("rejected_post");
            var aObj = new postObj();
            
            // set the attrs
            aObj.set('number_of_ratings', uObj.get('number_of_ratings'));
            aObj.set('rating', uObj.get('rating'));
            aObj.set('title', uObj.get('title'));
            aObj.set('category', uObj.get('category'));
            aObj.set('likes', uObj.get('likes'));
            aObj.set('desc', uObj.get('desc'));
            // post status should be 1 (accepted)
            aObj.set('post_status', 2);
            aObj.set('author_id', uObj.get('author_id'));
            aObj.set('photos', uObj.get('photos'));
            aObj.set('user', uObj.get('user'));
            aObj.set('category_fa', uObj.get('category_fa'));

            // save the object
            aObj.save(null, {
                success: function(theObj) {
                    // respond with the object id
                    // TODO remove this
                    //console.log("post accepted. object id: " + theObj.getObjectId());
                    
                    res.success(theObj.id);

                    // delete the object from the unchecked posts table
                    uObj.destroy({
                        success: function() {
                            console.log("removed from unchecked collection");
                        },
                        error: function(error) {
                            console.log(error);
                        }
                    });

                    // TODO send the rejected notification
                    
                },
                error: function(theObj, error) {
                    console.log(error);
                    res.error(error);
                }
            });
        },
        error: function(error) {
            console.log(error);
            res.error(error);
        }
    });

});


Parse.Cloud.define('submit_rating', function(req, res) {
    Parse.Cloud.useMasterKey();

    var rating = req.params.rating;
    var ratedObjectId = req.params.rated_object_id;

    var ratingObject = Parse.Object.extend("rating");
    var ratingObj = new ratingObject();

    ratingObj.set("rating", rating);
    ratingObj.set("rater", req.user);
    ratingObj.set("rated_object_id", ratedObjectId);

    // save the rating
    ratingObj.save(null, {
        success: function(ratingObj) {
            //increment the rated object number of ratings

            // fetch the object
            var postQuery = new Parse.Query("post");
            postQuery.get(ratedObjectId, {
                success: function(ratedObject) {
                   ratedObject.increment("number_of_ratings");
                    ratedObject.save(null, {
                    success: function(ratedObject) {
                    // calculate the overall rating of the post
                    // query all the ratings of the post
                    var ratingQuery = new Parse.Query("rating");
                    ratingQuery.equalTo("rated_object_id", ratedObjectId);
                    var keys = ['rating'];
                    ratingQuery.select(keys);
                    ratingQuery.find({
                        success: function(results) {
                            // sum all the results
                            var ratingSum = 0;
                            for(var i = 0; i < results.length; i++) {
                                ratingSum += results[i].get("rating");
                            }
                            // divide the sum over the number of ratings
                            var numberOfRatings = ratedObject.get('number_of_ratings');
                            var finalRating = ratingSum/numberOfRatings;

                            // set the new rating and update the object
                            ratedObject.set('rating', finalRating);
                            ratedObject.save(null, {
                                success: function(ratedObject) {
                                    // debug
                                    console.log(finalRating);

                                    // return the new rating
                                    res.success(finalRating + 0.0001);
                                },
                                error: function(ratedObject, error) {
                                    console.log(error);
                                    res.error(error);
                                }
                            });
                        },
                        error: function(error) {
                            console.log(error);
                            res.error(error);
                        }
                    });
                },
                error : function(ratedObject, error) {
                    console.log(error);
                    res.error(error);
                }
            });

                },
                error: function(erro) {
                    console.log(error);
                    res.error(error);
                }
            });
                    },
        error: function(ratingObj, error) {
            console.log(error);
            res.error(error);
        }
        
    });

});
Parse.Cloud.define('verify_user', function(req, res) {
    Parse.Cloud.useMasterKey();
    var suppliedVerCode = req.params.verification_code;
    
    // compar the verification codes and if there is a match, return true
    if(suppliedVerCode == req.user.get("verification_code")) {
        // set valid for user
        req.user.set("valid", true);
        req.user.save(null, {
            success: function(user) {
                res.success(true);
            },
            error: function(user, error) {
                // debug
                console.log(error);
                res.error(error.message);
            }
        });
    } else {
        res.error(error.message);
    }
});

Parse.Cloud.define('register_user', function(req, res) {
    
    Parse.Cloud.useMasterKey();

    var user = new Parse.User();
    var username = req.params.username;
    var email = req.params.email;
    var name = req.params.name;
    var onesignalId = req.params.onesignal_id;
    var password = "";
    var d = new Date();
    password += d.getMilliseconds();
    password += username;
    password += "webartma";

    var verificationCode = "";
    for(var i = 0; i < 5; i++) 
        verificationCode += Math.floor(Math.random() * 10);

    // necessary stuff
    user.set("username", username);
    user.set("password", password);
    user.set("email", email);
    user.set("onesignal_id", onesignalId);    
    user.set("name", name);

    // this parameter will become true after sms validation
    user.set("valid", false);
    user.set("verification_code", verificationCode);

       // register the user
    user.signUp(null, {
        success: function(user) {
           
            res.success(user);

            // send verification code via sms
        },
        error: function(user, error) {
            //console.log(error.message);
            res.error(error.code);
        }
    });
});
