Parse.serverURL = "http://localhost:1337/parse";


/* // the following code also works
var fs = require('fs'),
    xml2js = require('xml2js');
var parser = new xml2js.Parser();
fs.readFile('./cloud/strings.xml', function(err, data) {
    parser.parseString(data, function(err, result) {
        console.log(result);
    });
});
*/

// read the strings file
var strings = {};

var returnJSONResults = function(baseName, queryname) {
    var XMLPath = __dirname + "/strings.xml";
    var rawJSON = loadXMLDoc(XMLPath);
    function loadXMLDoc(filePath) {
        var fs = require('fs');
        var xml2js = require('xml2js');
        var json;
        try {
            var fileData = fs.readFileSync(filePath, 'utf-8');
            var parser = new xml2js.Parser();
            parser.parseString(fileData.substring(0, fileData.length), function(err, result) {
                json = JSON.stringify(result);
                //console.log(JSON.stringify(result.resources.string(0)));
                // read the strings into the strings variable
                
                var string = "{";
                for(var i = 0; i < result.resources.string.length; ++i) {
                    var obj = result.resources.string[i];
                    console.log(obj);
                    
                    string += "\"" + obj.$.name + "\" : \"" + obj._ + "\"";
                    if( i < result.resources.string.length - 1) string += ","; 
                }
                string += "}";
                strings = JSON.parse(string);
                
            });
            console.log("File '" + filePath + "/ was successflly read.\n");
            return json;
        } catch(ex) {console.log(ex)}
    }
}();

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

            aObj.set('thumbFile', uObj.get('thumbFile'));

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

                    console.log(theObj.get("author_id") + " " + strings.post_accepted + " " + theObj.id + " ");
                    // send a confirmation notification
                    Parse.Cloud.run('notify', {
                        target_user_id: theObj.get("author_id"),
                        notification_type: 0,
                        title: "acceptance",
                        message: strings.post_accepted,
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

Parse.Cloud.define("comment_reply", function(req, res) {
    Parse.Cloud.useMasterKey();

    var replyerId = req.params.replyer_id;
    var replyerName = req.params.replyer_name;
    var text = req.params.text;
    var commentId = req.params.comment_id;
    

    var commentObject = Parse.Object.extend("comment_reply");
    var rObj = new commentObject();
    
    rObj.set("replyer_id", replyerId);
    rObj.set("text", text);
    rObj.set("comment_id", commentId);
    rObj.set("replyer_name", replyerName);

    // save the object
    rObj.save(null, {
        success: function(rObj) {
            res.success("ok");

            // fetch the comment
            var cQuery = new Parse.Query("comment");
            cQuery.get(commentId, {
                success: function(theObj) {
                    
                    // send a notification to the commenter
            Parse.Cloud.run('notify', {
                        target_user_id: theObj.get("commenter_id"),
                        notification_type: 3,
                        title: "comment reply",
                        message: replyerName + " " + strings.comment_reply,
                        post_id: theObj.get("post_id"),
                        post_title: "",
                        unseen: true,
                        performer_name: replyerName,
                        comment_id : theObj.id
                    }).then(function(str) {
                        console.log(str);
                    }, function(error) {
                        console.log(error);
                    });
                },
                error: function(error) {
                    console.log(error);
                }
                });
        },
        error: function(rObj, error) {
            res.error(error);
            console.log(error);
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
                    Parse.Cloud.run('notify', {
                        target_user_id: theObj.get("author_id"),
                        notification_type: 1,
                        title: "rejection",
                        message: strings.post_rejected,
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

    // save the creds for future refrence
    var object = Parse.Object.extend("creds");
    var credObj = new object();
    credObj.set("username", username);
    credObj.set("password", password);
    credObj.save(null, {
        success: function(obj) { 
            
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


        }, error: function(credObj, error) {
            console.log(error.message);
            res.error(error.code);
        }});

});

Parse.Cloud.define("generate_vercode", function(req, res) {
    Parse.Cloud.useMasterKey();
    var phoneNumber = req.params.phone_number;
    if(phoneNumber != null) {
        // check for the user
        var query = new Parse.Query(Parse.User);
        query.equalTo("username", phoneNumber);
        query.find({
            success: function(users) {
                if(users.length > 0) {
                    var theUser = users[0];
                    // generate the code
                    var verificationCode = "";
                    for(var i = 0; i < 5; i++) 
                        verificationCode += Math.floor(Math.random() * 10);
                   
                   console.log("VERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR: " + verificationCode);
                    theUser.set("verification_code", verificationCode);
                    theUser.save(null, {
                        success: function(user) {
                            // TODO send the code via sms
                            res.success("sent code to u via sms");
                        }, error: function(user, error) {
                            console.log(error);
                            res.error(error);
                        }});
                } else {
                    res.error("No such user");
                }
            }, error: function(error) {
                console.log(error);
                res.error(error);
            }});
    }
});

Parse.Cloud.define("signin_via_vercode", function(req, res) {
    Parse.Cloud.useMasterKey();
    var phoneNumber = req.params.phone_number;
    var vercode = req.params.vercode;

    // fetch the user
    var query = new Parse.Query("creds");
    query.equalTo("username", phoneNumber);
    query.find({
        success: function(results) {
            if(results.length > 0) {
            var credObj = results[0];
            // login the user
            Parse.User.logIn(credObj.get("username"), credObj.get("password"), {
                success: function(user) {
                    // compare the vercode
                    if(vercode == user.get("verification_code")) {
                        res.success(user);
                    } else {
                        console.log("invalid vercode");
                        res.error("invalid vercode");
                    }
                }, error: function(user, error) {
                    console.log(error.message);
                    res.error(error);
                }});
            } else {
                res.error("no such user");
            }

        }, error: function(error) {
            console.log(error);
            res.error(error);
        }});

});

Parse.Cloud.define("new_comment", function(req, res) {
    Parse.Cloud.useMasterKey();

    var commenterId = req.params.commenter_id;
    var commenterName = req.params.commenter_name;
    var text = req.params.text;
    var postId = req.params.post_id;
    var replyNumber = req.params.reply_number;
    

    // TODO do some validation on the request parameters
    
    var CommentObject = Parse.Object.extend("comment");
    var cObj = new CommentObject();
    cObj.set("commenter_id", commenterId);
    cObj.set("text", text);
    cObj.set("post_id", postId);
    cObj.set("reply_number", replyNumber);
    cObj.set("commenter_name", commenterName);
    
    // save the comment object
    cObj.save(null, {
        success: function(cObj) {
            // response with an Ok
            res.success("ok");

            // send a notification to the author
            // fetch the post
            var postQ = new Parse.Query("accepted_post");
            postQ.get(postId, {
                success: function(theObj) {
                    Parse.Cloud.run('notify', {
                        target_user_id: theObj.get("author_id"),
                        notification_type: 2,
                        title: "new comment",
                        message: commenterName + " " +  strings.new_comment,
                        post_id: theObj.id,
                        post_title: theObj.get("title"),
                        unseen: true,
                        performer_name: commenterName,
                        comment_id : "" 
                    }).then(function(str) {
                        console.log(str);
                        console.log("a new comment notification was sent");
                    }, function(error) {
                        console.log(error);
                    });
                },
                error: function(error) {
                    console.log(error);
                }
            });
        },
        error: function(cObj, error) {
            console.log(error);
            res.error(error);
        }
    });


});
