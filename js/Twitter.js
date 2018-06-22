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
            Object.defineProperty(this, 'profiles', { value: {}, writable: false });
        }
    

        ProfileRepository.prototype.getCacheKey = function(screen_name) {
            return 'Twitter'+this.settings.address+screen_name;
        }

        ProfileRepository.prototype.getProfile = function(screen_name) {
            let profile = this.profiles[screen_name];
            if(profile)
                return profile;

            var data = this.storage.getItem(this.getCacheKey(screen_name));
            if(!data) {
                return null;
            } 

            profile = JSON.parse(data);
            this.setProfile(profile);
            return profile;
        }

        ProfileRepository.prototype.setProfile = function(profile) {
            this.profiles[profile.screen_name] = profile;
            this.storage.setItem(this.getCacheKey(profile.screen_name), JSON.stringify(profile));
        }

        ProfileRepository.prototype.ensureProfile = function(screen_name) {
            let profile = this.getProfile(screen_name);
            if(!profile) {
                profile = new DTP.Profile(screen_name);
                this.setProfile(profile);
                DTP.trace('Profile '+ profile.screen_name +' created');
            }
            return profile;
        }

        ProfileRepository.prototype.update = function(settings) {
            this.settings = settings;
        }

        return ProfileRepository;
    }());

    DTP.ProfileController = (function () {
        function ProfileController(profile, view, host) { 
            this.profile = profile;
            this.view = view;
            this.view.controller = this;
            this.host = host;
            // this.twitterService = twitter.twitterService;
            // this.profileRepository = twitter.profileRepository;
            // this.subjectService = twitter.subjectService;
            // this.packageBuilder = twitter.packageBuilder
            this.trustHandler = null;
            this.domElements = [];
            this.time = 0;
        }

        // Update data for the profile
        ProfileController.prototype.update = function() {
            let deferred = $.Deferred();
            let self = this;

            if(self.profile.owner) {
                deferred.resolve(self.profile);

            } else {
                self.host.twitterService.getProfileDTP(self.profile.screen_name).then((owner) => {
                    if(owner != null) {
                        owner.valid = DTP.ProfileController.verifyDTPsignature(owner, self.profile.screen_name);
                    }
                    self.profile.owner = owner;
                    self.save();
                    deferred.resolve(self.profile);
                });
            }

            return deferred;
        }

        ProfileController.prototype.save = function() {
            this.host.profileRepository.setProfile(this.profile);
        }

        ProfileController.prototype.calculateTrust = function() {
            if(!this.trustHandler) 
                return;

            let ownerAddress = (this.profile.owner) ? this.profile.owner.address.toBase64() : "";
            this.profile.result = this.trustHandler.CalculateBinaryTrust(this.profile.address.toBase64(), ownerAddress);
        }


        ProfileController.prototype.render = function(element) {
            if(element) {
                this.view.renderElement(element);
                return;
            }

            for (let item of this.domElements) {
                this.view.renderElement(item);
            }
        }
       
        ProfileController.prototype.trust = function() {
            DTP.trace("Trust "+ this.profile.screen_name);
            return this.trustProfile(true, 0);
        }

        ProfileController.prototype.distrust = function() {
            DTP.trace("Distrust "+ this.profile.screen_name);
            return this.trustProfile(false, 0);
        }

        ProfileController.prototype.untrust = function() {
            DTP.trace("Untrust "+ this.profile.screen_name);
            return this.trustProfile(true, 1);
        }

        ProfileController.prototype.trustProfile = function(value, expire) {
            const self = this;
            return this.buildAndSubmitBinaryTrust(self.profile, value, expire).then(function(result) {
                //self.controller.render();
                DTP.trace('TrustProfile done!');
            });
        }

        ProfileController.prototype.buildAndSubmitBinaryTrust = function(profile, value, expire) {
            const self = this;
            let package = this.host.subjectService.BuildBinaryTrust(profile, value, null, expire);
            this.host.packageBuilder.SignPackage(package);
            DTP.trace("Updating trust");
            return this.host.trustchainService.PostTrust(package).then(function(trustResult){
                DTP.trace("Posting package is a "+trustResult.status.toLowerCase()+ ' '+ trustResult.message);
    
                // Requery everything, as we have changed a trust
                self.host.queryDTP(self.host.sessionProfiles);

                // if (self.updateCallback) {
                //     self.updateCallback(profile);
                // }
    
            }).fail(function(trustResult){ 
                DTP.trace("Adding trust failed: " +trustResult.message,"fail");
            });
        }


        // profile will usually be a deserialized neutral object
        ProfileController.addTo = function(profile, twitterService, domElement) {
            if (!profile.controller) {
                let view = new DTP.ProfileView();
                let controller = new DTP.ProfileController(profile, view, twitterService);
                // Make sure that this property will no be serialized by using Object.defineProperty
                Object.defineProperty(profile, 'controller', { value: controller });
            }
            profile.controller.domElements.push(domElement);
            $(domElement).data("dtp_profile", profile);
        }

        ProfileController.bindEvents = function(element, profileRepository) {
            $(element).on('click', '.trustIcon', function (event) {
                let button = this;
                $(button).addClass('trustSpinner24');
                let screen_name = ProfileController.getParentScreenName(button);
                ProfileController.loadProfile(screen_name, profileRepository).then(function(profile) {
                    if(button.classList.contains('trust')) {
                        profile.controller.trust().then(RemoveSpinner);
                    }

                    if(button.classList.contains('distrust')) {
                        profile.controller.distrust().then(RemoveSpinner);
                    }

                    if(button.classList.contains('untrust')) {
                        profile.controller.untrust().then(RemoveSpinner);
                    }
                });

                function RemoveSpinner() {
                    $(button).removeClass('trustSpinner24');
                }
            });

        }

        ProfileController.getParentScreenName = function(element)  {
            return $(element).closest('div[data-screen-name]').attr("data-screen-name");
        }

        ProfileController.verifyDTPsignature = function(dtp, message) {
            return tce.bitcoin.message.verify(dtp.address, dtp.signature, message);
        }

        ProfileController.loadProfile = function(screen_name, profileRepository) {
            let profile = profileRepository.getProfile(screen_name);
            return profile.controller.update();
        }

        return ProfileController;
    }());

    DTP.ProfileView = (function () {
        function ProfileView(controller) {
            this.controller = controller;
            //this.checkIconUrl = chrome.extension.getURL("img/check13.gif");
            this.Anchor = '.ProfileTweet-action--favorite';
            this.fullNameGroup = '.FullNameGroup';
        }

        
        ProfileView.prototype.renderElement = function(element) {
            const $element = $(element);
            let bar = $element.data('dtp_bar');
            if(!bar) {
                let $anchor = $element.find(this.Anchor);

                bar = {
                    trust: this.createButton("Trust", "trustIconPassive", "trust"),
                    distrust: this.createButton("Distrust", "distrustIconPassive", "distrust"),
                    untrust:this.createButton("Untrust", "untrustIconPassive", "untrust")
                }

                if(this.controller.profile.owner && this.controller.profile.owner.valid) {

                    bar.$fullNameGroup = $element.find(this.fullNameGroup);
                    bar.$fullNameGroup.prepend(ProfileView.createIdenticon(this.controller.profile));
                }

               
                $anchor.after(bar.untrust.$html);
                $anchor.after(bar.distrust.$html);
                $anchor.after(bar.trust.$html);
                bar.untrust.$html.hide();

                $element.data('dtp_bar', bar);
            }

            bar.trust.$a.removeClass("trustIconActive").addClass("trustIconPassive");
            bar.trust.$span.text('');
            bar.distrust.$a.removeClass("distrustIconActive").addClass("trustIconPassive");
            bar.distrust.$span.text('');

            if(!this.controller.profile.result)
                return;

            if (this.controller.profile.result.state > 0) {
                bar.trust.$a.removeClass("trustIconPassive").addClass("trustIconActive");
                bar.trust.$span.text(this.controller.profile.result.trust);

            } 

            if (this.controller.profile.result.state < 0) {
                bar.distrust.$a.removeClass("trustIconPassive").addClass("distrustIconActive");
                bar.distrust.$span.text(this.controller.profile.result.distrust);
            }

            if (this.controller.profile.result.direct) {
                bar.untrust.$html.show();
            }
        } 

        ProfileView.createTweetDTPButton = function() {
            let $editButton = $('.ProfileNav-list .edit-button');
            if($editButton.length == 0)
                return;

            let $tweetDTP = $editButton.parent().find('button.tweet-dtp');
            if($tweetDTP.length > 0)
                return;
           
            $tweetDTP = $(
                '<button type="button" class="EdgeButton EdgeButton--tertiary dtpUserAction-Button tweet-dtp">'+
                '<span class="button-text">Tweet DTP</span>'+
                '</button>'
            );
            
            $editButton.before($tweetDTP);
        }
        
        ProfileView.showMessage = function(message) {
            var pop = $('#message-drawer');
            pop.find('.message-text').text(message);
            pop.attr("style", "").removeClass('hidden').delay(3000).fadeOut(function() {
                pop.addClass('hidden').attr("style", "top: -40px;");
            });
        }

        ProfileView.createIdenticon = function(profile) {
            if(!profile.owner.data) {
                let icon = new Identicon(profile.owner.address.toAddress(), {margin:0.1, size:16, format: 'svg'});
                profile.owner.data = icon.toString();
                profile.time = Date.now();
                profile.controller.save();
            }
            let $icon = $('<a title="'+profile.screen_name+'" href="javascript:void 0"><img src="data:image/svg+xml;base64,' + profile.owner.data + '" class="dtpIdenticon"></a>');
            // $alink.data("subject", subject);
            // $alink.click(function() {
            //     var opt = {
            //         command:'openDialog',
            //         url: 'trustlist.html',
            //         data: $(this).data("subject")
            //     };
            //     opt.w = 800;
            //     opt.h = 800;
            //     var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
            //     var wTop = window.screenTop ? window.screenTop : window.screenY;
        
            //     opt.left = Math.floor(wLeft + (window.innerWidth / 2) - (opt.w / 2));
            //     opt.top = Math.floor(wTop + (window.innerHeight / 2) - (opt.h / 2));
                
            //     chrome.runtime.sendMessage(opt);
            //     return false;
            // });
            // this.container.appendChild($alink[0]);
            return $icon;
        }
    



        ProfileView.prototype.createButton = function(text, iconClass, type, count) {
            let number = count || "";
            let html = '<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px">'+
            '<button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button" >' +
            '<div class="IconContainer js-tooltip" >'+
            '<span class="Icon Icon--medium"><a class="trustIcon '+ type +' js-tooltip '+  iconClass +'" data-original-title="'+text+'" title="'+text+'"></a></span>' +
            '<span class="u-hiddenVisually">'+text+'</span>'+
            '</div>'+
            '<span class="ProfileTweet-actionCount">'+
            '<span class="ProfileTweet-actionCountForPresentation" aria-hidden="true">'+ number +'</span>'+
            '</span>'+
            '</button></div>';

            let $html = $(html);
            return {
                $html: $html,
                $a: $("a", $html),
                $span: $('.ProfileTweet-actionCountForPresentation', $html)
            }
        }
        return ProfileView;
    }());


    DTP.Profile = (function () {
        function Profile(screen_name) { 
            this.screen_name = screen_name;
            this.address = screen_name.hash160();
            this.scope = window.location.hostname;
            this.personalScore = 0;
            this.networkScore = 0;
        }

        Profile.LoadCurrent = function(settings, profileRepository) {
            Profile.Current = JSON.parse($("#init-data")[0].value);

            if(settings.address) {
                Profile.Current.owner = {
                    scope: '',
                    address: settings.publicKeyHash,
                    signature: tce.bitcoin.message.sign(settings.keyPair, Profile.Current.screenName),
                    valid : true
                };
            }

            let profile = profileRepository.ensureProfile(Profile.Current.screenName);
            profile.owner = Profile.Current.owner;
            profileRepository.setProfile(profile);
        }


        Profile.Current = null;

        return Profile;
    }());

    DTP.TwitterService = (function ($) {
        function TwitterService(settings) {
            this.settings = settings;
        }

        TwitterService.prototype.getProfileDTP = function (screen_name) {
            let deferred = $.Deferred();
            this.getData('/search?l=&q=%23DTP%20Address%20Signature%20from%3A'+ screen_name +'&src=typd', 'html').then((html) => {
                let content = html.findSubstring('<div class="js-tweet-text-container">', '</div>');
                if(content == null) {
                    deferred.resolve(null);
                }
   
                let text = $(content).text();
                text = text.replace("\n", ' ');

                let btcAddress = text.findSubstring('Address:', ' ', true, true);
                let hash = tce.bitcoin.address.fromBase58Check(btcAddress).hash;

                let result = {
                    address: hash,
                    signature: text.findSubstring('Signature:', ' ', true, true),
                    scope: '', // global
                }
                deferred.resolve(result);
                
            }).fail((error) => deferred.fail(error));

            return deferred;
        }

        TwitterService.prototype.getData = function (path, dataType) {
            let deferred = $.Deferred();
            let self = this;
            let url = TwitterService.BaseUrl+path;
            dataType = dataType || "json";

            $.ajax({
                type: "GET",
                url: url,
                headers: {
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'x-twitter-active-user': 'yes'
                },
                dataType: dataType,
            }).done(function (data, textStatus, jqXHR) {
                deferred.resolve(data);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.errorHandler(jqXHR, textStatus, errorThrown);
                deferred.fail();
            });
            return deferred.promise();
        }


        TwitterService.prototype.sendTweet = function (data) {
            return this.postData('/i/tweet/create', data);
        }

        // TwitterService.prototype.updateProfile = function () {
        //     let self = this;

        //     let address = self.settings.address;
        //     //let nameBuffer = new tce.buffer.Buffer("test", 'utf8');
        //     let signatureBuffer = tce.bitcoin.Bitcoin.sign(self.settings.keyPair, "test");
        //     let signature = signatureBuffer.toString('base64');
        //     //let nameHash = tce.bitcoin.crypto.hash256(nameBuffer);
        //     //let signatureBuffer = self.settings.keyPair.signCompact(nameHash);
        //     //let signature = signatureBuffer.toString('base58');

        //     let description = '#DTP+Address:' + address + '+Signature:' + signature;

        //     let url = TwitterService.BaseUrl+'/i/profiles/update'; //?description=MyTime:'+today.toISOString() ;
        //     let data = 'page_context=me&section_context=profile&user%5Bdescription%5D=' + description;
        //     this.postData(url, data);

        // }

        TwitterService.prototype.postData = function (path, data) {
            let self = this;
            var deferred = $.Deferred();

            let url = TwitterService.BaseUrl + path;
            //let postData = 'authenticity_token=' + DTP.Profile.Current.formAuthenticityToken + '&' + data;
            data.authenticity_token = DTP.Profile.Current.formAuthenticityToken;

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
                deferred.resolve(msg);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.errorHandler(jqXHR, textStatus, errorThrown);
                deferred.fail();
            });
            return deferred.promise();
        }

        TwitterService.prototype.errorHandler = function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 404 || errorThrown == 'Not Found') {
                var msg = 'Error 404: Server was not found.';
                DTP.trace(msg);
            }
            else {
                var msg = textStatus + " : " + errorThrown;
                if (jqXHR.responseJSON)
                    msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);

                DTP.trace(msg);
            }
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
            self.waiting = false;
            self.profilesToQuery= [];
            self.sessionProfiles = [];
            

            self.processElement = function(element) { // Element = dom element
                let screen_name = element.attributes["data-screen-name"].value;
                let profile = self.profileRepository.ensureProfile(screen_name, self.profileView);

                DTP.ProfileController.addTo(profile, self, element);
                
                self.sessionProfiles.push(profile); // All the profiles in the current page session
                if(profile.controller.time == 0) { 
                    self.profilesToQuery.push(profile);
                }

                profile.controller.render(element);
            }
        }

        Twitter.prototype.getTweets = function() {
            var tweets = $('.tweet.js-stream-tweet');
            return tweets;
        }

        Twitter.prototype.queryDTP = function (profiles) {
            let self = this;
            if(!profiles || profiles.length == 0) {
                return;
            }

            return this.trustchainService.Query(profiles, window.location.hostname).then(function(result) {
                if (result || result.status == "Success") {
                    DTP.trace(JSON.stringify(result, null, 2));
                    let th = new TrustHandler(result.data.results, self.settings);
                    for (let profile of profiles) {
                        profile.controller.trustHandler = th;
                        profile.controller.time = Date.now();
                        profile.controller.calculateTrust();
                        profile.controller.render();
                        profile.controller.save();
                    }
                }
                else {
                    console.log(result.message);
                }
            });
        }

        Twitter.prototype.tweetDTP = function() {
            const self = this;

            let status = 'Digital Trust Protocol #DTP \rAddress:' + DTP.Profile.Current.owner.address.toAddress()
                         + ' \rSignature:' + DTP.Profile.Current.owner.signature.toBase64();
            let data = {
                batch_mode:'off',
                is_permalink_page:false,
                place_id: !0,
                status: status 
            };

            self.twitterService.sendTweet(data).then(function(result) {
                DTP.Profile.Current.DTP = DTP.Profile.Current.DTP || {};
                DTP.Profile.Current.DTP.tweet_id = result.tweet_id;
                DTP.ProfileView.showMessage("DTP tweet created");
            });
        }

        Twitter.prototype.ready = function (element) {
            const self = this;

            $(element).ready(function () {

                DTP.Profile.LoadCurrent(self.settings, self.profileRepository);

                var tweets = self.getTweets();

                tweets.each(function(i, element) {
                    self.processElement(element);
                });

                                
                DTP.ProfileController.bindEvents(element, self.profileRepository);
                DTP.ProfileView.createTweetDTPButton();
            });



            $(element).on('DOMNodeInserted', function (e) {
                let classObj = e.target.attributes['class'];
                if (!classObj) 
                    return;

                let permaTweets = $(e.target).find('.tweet.permalink-tweet');
                permaTweets.each(function(i, element) {
                    self.processElement(element);
                });
                
                let tweets = $(e.target).find('.tweet.js-stream-tweet');
                tweets.each(function(i, element) {
                    self.processElement(element);
                });

                if(!self.waiting) {
                    self.waiting = true;
                    setTimeout(function() {
                        DTP.trace("DOMNodeInserted done!");
                        DTP.ProfileView.createTweetDTPButton();

                        self.queryDTP(self.profilesToQuery);
                        self.profilesToQuery = [];
                        self.waiting = false;
                    }, 100);
                }
            });

            $(element).on('click', '.tweet-dtp', function (event) {
                self.tweetDTP();
            });
        }

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

            // $(element).on('click', '.trust', function (event) {
            //     let screen_name = $(this).closest('div[data-screen-name]').attr("data-screen-name");

            //     let profile = self.profileRepository.getProfile(screen_name);
            //     profile.controller.update().then(function(profile) {
            //         DTP.trace(profile); 
            //     });
    
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