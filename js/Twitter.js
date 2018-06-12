var DTP = {};

DTP.trace = function (message) {
    console.log(message);
};

(function (DTP) {

    DTP.ProfileRepository = (function () {
        function ProfileRepository(settings, storage) { 
            // No serializable
            Object.defineProperty(this, 'settings', { value: settings, writable: true });
            Object.defineProperty(this, 'storage', { value: storage, writable: false });
        }
    

        ProfileRepository.prototype.getCacheKey = function(screen_name) {
            return 'Twitter'+this.settings.address58+screen_name;
        }

        ProfileRepository.prototype.getProfile = function(screen_name) {
            var data = this.storage.getItem(this.getCacheKey(screen_name));
            return JSON.parse(data);
        }

        ProfileRepository.prototype.setProfile = function(profile) {
            this.storage.setItem(this.getCacheKey(profile.screen_name), JSON.stringify(profile));
        }

        ProfileRepository.prototype.ensureProfile = function(screen_name) {
            let model = this.getProfile(screen_name);
            if(!model) {
                model = new DTP.Profile(screen_name);
                this.setProfile(model);
                DTP.trace('Profile '+ model.screen_name +' created');
            }
            return model;
        }

        ProfileRepository.prototype.update = function(settings) {
            this.settings = settings;
        }


        return ProfileRepository;
    }());

    DTP.ProfileController = (function () {
        function ProfileController(model, view) { 
            this.model = model;
            this.view = view;
            this.view.controller = this;
        }

        ProfileController.prototype.render = function(element) {
            if(element) {
                // Render the current element
                this.view.renderElement(element);
                return;
            }
            
            // for (let e of this.domElements) {
            //     // Render each element
            //     this.view.renderElement(e);
            // }
        }
       
        ProfileController.prototype.trust = function() {
        }

        ProfileController.prototype.distrust = function() {
        }

        ProfileController.prototype.neutral = function() {
        }

        // Model will usually be a deserialized neutral object
        ProfileController.addTo = function(model) {
            if (!model.controller) {
                let view = new DTP.ProfileView();
                let controller = new DTP.ProfileController(model, view);
                // Make sure that this property will no be serialized by using Object.defineProperty
                Object.defineProperty(model, 'controller', { value: controller });
            }
        }

        ProfileController.bindEvents = function(element) {
            $(element).on('click', '.trustIcon', function (event) {
            });

            $(element).on('click', '.distrustIcon', function (event) {
            });

            $(element).on('click', '.neutralIcon', function (event) {
            });
        }

        return ProfileController;
    }());

    DTP.ProfileView = (function () {
        function ProfileView(controller) {
            this.controller = controller;
            this.checkIconUrl = chrome.extension.getURL("img/check13.gif");
            this.Anchor = '.ProfileTweet-action--favorite';
            this.Buttons = '<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button" >' +
            '<div class="IconContainer js-tooltip" ><span class="Icon Icon--medium"><a class="trustIcon js-tooltip" data-original-title="Block" style="background-image: url(' + this.checkIconUrl + ')" title="Block"></a></span>' +
            '<span class="u-hiddenVisually">Block</span></div></button></div>';
        }

        
        ProfileView.prototype.renderElement = function(element) {
            var $element = $(element);
            if($element.attr('rendered') == null) {
                $element.attr('rendered', 'true');
                let $anchor = $element.find(this.Anchor);
                $anchor.after(this.Buttons);
            }
            else {            
                // Update element

            }
        }
        return ProfileView;
    }());


    DTP.Profile = (function () {
        function Profile(screen_name) { 
            this.screen_name = screen_name;

            this.personalScore = 0;
            this.networkScore = 0;
        }

        return Profile;
    }());

    DTP.TwitterService = (function ($) {
        function TwitterService(settings) {
            this.settings = settings;
        }

        TwitterService.prototype.getProfile = function () {
            let url = 'https://twitter.com/search?f=tweets&vertical=default&q=DTP%20keutmann';

            $.ajax({
                type: "GET",
                url: url,
                //data: data,
                //contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                headers: {
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'x-twitter-active-user': 'yes'
                },
                dataType: 'json',
            }).done(function (msg, textStatus, jqXHR) {
                //resolve = msg;
                console.log(msg);
                //deferred.resolve(resolve);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status == 404 || errorThrown == 'Not Found') {
                    var msg = 'Error 404: Server was not found.';
                    //alert('Error 404: Server ' + server + ' was not found.');
                    console.log(msg);
                }
                else {
                    var msg = textStatus + " : " + errorThrown;
                    if (jqXHR.responseJSON)
                        msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);

                    console.log(msg);
                    alert(msg);
                }
            });
        }


        TwitterService.prototype.updateProfile = function () {
            let self = this;

            let address = self.settings.address58;
            let nameBuffer = new tce.buffer.Buffer("@test", 'utf8');
            let nameHash = tce.bitcoin.crypto.hash256(nameBuffer);
            let signatureBuffer = self.settings.keyPair.signCompact(nameHash);
            let signature = signatureBuffer.toString('base58');

            let description = 'DTP+adr:' + address + '+sig:' + signature;

            let today = new Date();
            let url = TwitterService.BaseUrl+'/i/profiles/update'; //?description=MyTime:'+today.toISOString() ;
            let data = 'authenticity_token=' + self.authenticity_token + '&page_context=me&section_context=profile&user%5Bdescription%5D=' + description;
            //url += data; 
            $.ajax({
                type: "POST",
                url: url,
                data: data,
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                headers: {
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'x-twitter-active-user': 'yes'
                },
                dataType: 'json',
            }).done(function (msg, textStatus, jqXHR) {
                //resolve = msg;
                console.log(msg);
                //deferred.resolve(resolve);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status == 404 || errorThrown == 'Not Found') {
                    var msg = 'Error 404: Server was not found.';
                    //alert('Error 404: Server ' + server + ' was not found.');
                    console.log(msg);
                }
                else {
                    var msg = textStatus + " : " + errorThrown;
                    if (jqXHR.responseJSON)
                        msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);

                    console.log(msg);
                    alert(msg);
                }
            });
        }

        TwitterService.BaseUrl = 'https://twitter.com';

        return TwitterService;
    }(jQuery));
    

    DTP.Twitter = (function ($) {
        function Twitter(settings, packageBuilder, subjectService, trustchainService, twitterService, profileRepository) {
            var self = this;
            self.OwnerPrefix = "[#owner_]";
            self.settings = settings;
            self.subjectService = subjectService;
            self.targets = [];
            self.packageBuilder = packageBuilder;
            self.trustchainService = trustchainService;
            self.twitterService = twitterService;
            self.profileRepository = profileRepository;
  
            self.queryResult = {};

            self.authenticity_token = $('.authenticity_token')[0].value;
            self.authtoken = $('.auth-token').val();

            self.checkIconUrl = chrome.extension.getURL("img/check13.gif");

            
            self.processElement = function(element) { // Element = dom element
                let screen_name = element.attributes["data-screen-name"].value;
                let profile = self.profileRepository.ensureProfile(screen_name, self.profileView);

                DTP.ProfileController.addTo(profile);

                profile.controller.render(element);
            }
        }

        Twitter.prototype.getTweets = function() {
            var tweets = $('.tweet.js-stream-tweet');
            return tweets;
        }

        Twitter.prototype.ready = function (element) {
            let self = this;

            $(element).ready(function () {
                var tweets = self.getTweets();

                tweets.each(function(i, element) {
                    self.processElement(element);
                });

                                
                DTP.ProfileController.bindEvents(element);
                
                //console.log(self.profileRepository.save());

                // $(".ProfileTweet-action--favorite").each(function () {
                //     if ($(this).attr("check") == null) {
                //         $(this).after('<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button" >' +
                //             '<div class="IconContainer js-tooltip" ><span class="Icon Icon--medium"><a class="trustIcon js-tooltip" data-original-title="Block" style="background-image: url(' + self.checkIconUrl + ')" title="Block"></a></span>' +
                //             '<span class="u-hiddenVisually">Block</span></div></button></div>');
                //     }
                //     $(this).attr('check', 'true');

                // })

                // $(".user-actions-follow-button").each(function () {
                //     if ($(this).attr("check") == null) {
                //         $(this).after('<span style="padding: 0 0 0.25em 0.2em;" class="user-actions-follow-button"><a class="trustIcon js-tooltip" data-original-title="Block" style="background-image: url(' + self.checkIconUrl + ')" title="Block"></a></span>');
                //     }
                //     $(this).attr('check', 'true');
                // })
            });

            $(element).on('DOMNodeInserted', function (e) {
                let tweets = $(e.target).find('.tweet.js-stream-tweet');
                tweets.each(function(i, element) {
                    self.processElement(element);
                });
                

                //$(document).bind('DOMNodeInserted', function(e) {
                // if ($(e.target).find('.ProfileTweet-action--favorite')) {
                //     if ($(e.target).find('.ProfileTweet-action--favorite').attr("check") == null) {
                //         $(e.target).find('.ProfileTweet-action--favorite').not('.u-hiddenVisually').after('<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px"><button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button" ><div class="IconContainer js-tooltip" ><span class="Icon Icon--medium"><a class="trustIcon js-tooltip" data-original-title="Block" style="background-image: url(' + self.checkIconUrl + ')" title="Block"></a></span><span class="u-hiddenVisually">Block</span></div></button></div>');
                //         $(e.target).find('.ProfileTweet-action--favorite').attr('check', 'true');
                //     }
                // }
                // if ($(e.target).find('.user-actions-follow-button')) {
                //     if ($(e.target).find('.user-actions-follow-button').attr("check") == null) {
                //         if (!($(e.target).find(".dismiss").length > 0) && !($(e.target).parents("body").find("#profile-hover-container").children().length > 0)) {
                //             $(e.target).find('.user-actions-follow-button').not('.u-hiddenVisually').after('<span style="padding: 0 0 0.25em 0.2em;" class="user-actions-follow-button"><a class="trustIcon js-tooltip" data-original-title="Block" style="background-image: url(' + self.checkIconUrl + ')" title="Block "></a></span>');
                //             $(e.target).find('.user-actions-follow-button').attr('check', 'true');
                //         }
                //     }

                // }
            });

            //$(element).on('click', '.trustIcon', function (event) {
                //self.getProfile();

                // event.preventDefault();
                // if(!(location.href.indexOf("following") > 0) &&  !(location.href.indexOf("followers") >0) ){
                //     if($(this).parents(".content").length > 0){
                //         //console.log("timeline");
                //         $(this).parents(".content").find("li.block-link").trigger("click");
                //         $("body").removeClass("modal-enabled");
                //         $(document).find("#block-dialog").hide();
                //         $(document).find("button.block-button").trigger("click");
                //     }
                //     if($(this).parents(".permalink-tweet-container").length > 0){
                //         //console.log("tweet permalink");
                //         $(this).parents(".permalink-tweet-container").find("li.block-link").trigger("click");
                //         $("body").removeClass("modal-enabled");
                //         $(document).find("#block-dialog").hide();
                //         $(document).find("button.block-button").trigger("click");
                //         $(document).find("span.Icon--close").trigger("click");
                //     }
                //     if(	$(this).parents(".UserActions").length > 0){
                //         //console.log("Profile block");
                //         $(this).parents(".UserActions").find("li.not-blocked").trigger("click");
                //         $("body").removeClass("modal-enabled");
                //         $(document).find("#block-dialog").hide();
                //         $(document).find("button.block-button").trigger("click");
                //     }
                // }else{
                //     //console.log("following/followers page");
                //     $(this).parents(".user-actions").find("li.not-blocked").trigger("click");
                //     $("body").removeClass("modal-enabled");
                //     $(document).find("#block-dialog").hide();
                //     $(document).find("button.block-button").trigger("click");
                // }

                // var screen_name = $(this).closest('div[data-screen-name]').attr("data-screen-name");
                // var message = $('<div class="msg error-message" style="display: none;">');
                // message.append('User <a class="link" href="https://twitter.com/'+screen_name+'">@'+screen_name+'</a> has been blocked.');
                // message.appendTo($('body')).fadeIn(300).delay(3000).fadeOut(500);
            //});

        }

        Twitter.blockIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAABICAYAAACeNle5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2OTMzOTcxOThFNTJFNzExOTQwMUUxOTRFMjk5OUQ4OCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpDMzdCMzRBQjUyOTExMUU3QTRCNjgzRTg5MDI1OTg3NyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpDMzdCMzRBQTUyOTExMUU3QTRCNjgzRTg5MDI1OTg3NyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjY5MzM5NzE5OEU1MkU3MTE5NDAxRTE5NEUyOTk5RDg4IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjY5MzM5NzE5OEU1MkU3MTE5NDAxRTE5NEUyOTk5RDg4Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+1btqcgAABDNJREFUeNrsmElIVVEcxt/T1MzQKLDUpkXUoszSiiYaXPWsZ5PRtpAkpGgRYQUZ4aKSgkgRGoyWkZnh2C5bZJDlVC1qE5oaDQRGFj5T+w58Nw63O5x73xOl7oEfR8+775zvnXuG///zj42N+SZTifJNsuIJ8gSFW6ZofxScPD9hIq5fOPW3IAclFewFm0A6mAOSwAD4DDrBY1AN+l3PkEJZAc6CIIg2+DyJLKLgK6AWnAMdkVxDU8FV8ALsAiPgITgMMsAM4GedwXbx+S8+L75Xxn7CFpQPPoCjYBTcBAtBAFwDXXxVPtZdbA/wuRv83hHwFKSFIyifHYpfPgg2gEMUqFLEcwVgDXjLV/4EzHUjKB5c5qsQJQGcBrEuNkE7WAdawQJQz/4dCSrlAh2U2naCKpeivoIc8IbrrNSJoExQCIZBNmiSPssNQ9QXsJ/9FnIcJUFn2C52xjPuFL2oey5FdbLfKI5jKyiNAw6Bi2wLGYgKhiGqlP3nGu06vaDdbKsDn6R2TVRjBER9ZP9RHM9S0BbWjQYdhdiBXlS1C1ENrLfaCVrG+rlJR5qoBqlthwtRWv9L7QSlsO6x6EyI2mMg6r4DUe9145kKSpSuAZ9DUdsdiBrQjWcq6Jt0c/vGUVSSbjxTQdo9NV9x6jVR9TpRNTai5unGMxX0inWWgwUaYvwji8qxEbWK9Ws7Qc3Sr/S5EFWnE/XARFQO60d2gmoYv4jzJdmFqDydqICBqGSe0qP8zFJQH8POOFDk4lqwEhXH/0/wbzFOr8rlWkL1IkpcHkFRNVw7x9h/iept3wYqQAy4C2aFIapWJ6qZ/VZwHOUArYihwhLe8jNditqnE5XAQ7HIacT4g9dBN1gNWhgTuxElXs13/i+8n+Ps33GQ38vAvosz1cqMIkVRTAqfF9nGdM6MSBIqw0mDxK5bC8r5rMgi3jGMPcDMNVG6l9LZXsXnCvi9cma8lZHIXH9yx90CxTyj8ohV0c6ZErMFHG4q3c5YSMvtN0u5fSIvShFlvuQJPO65vVb6GaiXjYcT4vdMT0/QP+sxtvj9EyZivbSxJp3H+GfbK8yQncdodFIreYzyDE06j9FuhoStd4mDiQFu8z5TsfVSODsHuTQ6GNL0Wc2QlSDNY/TTScumX+S0rAR3wGLGVxv1sbTKK/M8Rs9jVPUY9Ys6jd7QMA0HzdaLZfQXkL5bx6gx5FDUbC7uGI7RZ7WoPY/R8xg9j9HzGP97j1H1pFYtsTwsg1JbEw/VkOQx9vCkFrd/r9VJPeEeo1GAlsnYZYTvusuFMLOZKqb5FU0jrE0lQJtQj9EshJ3GX5LB2drGIMvNTFUxZJEPxVTZ1lMJYT2P0UmiGM8YuJA/YIi7qIE5VzevgERu4yyeY0HuplGumSKzmVFNg4zSmWIXmautx+hWkD63j5jHKAv6LcAANVWyl69h+iIAAAAASUVORK5CYII=';

        return Twitter;
    }(jQuery));

})(DTP || (DTP = {}));

var settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    var packageBuilder = new PackageBuilder(settings);
    var subjectService = new SubjectService(settings, packageBuilder);
    var trustchainService = new TrustchainService(settings);
    var twitterService = new DTP.TwitterService(settings);
    var profileRepository = new DTP.ProfileRepository(settings, localStorage);

    var twitter = new DTP.Twitter(settings, packageBuilder, subjectService, trustchainService, twitterService, profileRepository);

    twitter.ready(document);
});
