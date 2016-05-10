Parse.serverURL = "http://localhost:1337/parse";
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
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
