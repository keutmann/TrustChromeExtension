///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");

var Reddit = (function () {
    function Reddit(settings, packageBuilder, subjectService, trustchainService) {
        var self = this;
        self.OwnerPrefix = "[#owner_]";
        self.settings = settings;
        self.subjectService = subjectService;
        self.targets = [];
        self.packageBuilder = packageBuilder;
        self.trustchainService = trustchainService;
        self.queryResult = {};

        $("div.thing[data-author]").each(function () {

            var $this = $(this);
            var authorName = $this.data("author");

            var target = self.targets[authorName];
            if(!target) {
                target = {};
                //target.$htmlContainers = []; 
                target.alias = authorName;
                target.thingId = $this.data("author-fullname");
                target.address = authorName.hash160(); // array of bytes (Buffer)
                target.scope = window.location.hostname;
                target.type = "thing";
                self.targets[authorName] = target;
            }

            //target.$htmlContainers.push($this);

            if(!target.owner) {
                var $proof = $this.find("a[href*='scope=reddit']:contains('Proof')")
                if ($proof.length > 0) {
                    var params = getQueryParams($proof.attr("href"));
                    if(params.name == target.alias) {
                        var owner = self.targets[self.OwnerPrefix + authorName];
                        if(!owner) {
                            target.owner = params;
                            target.owner.type = "entity";
                            target.owner.address = new tce.buffer.Buffer(target.owner.address, 'HEX');
                            target.owner.alias = authorName;
                            target.owner.scope = window.location.hostname;

                            self.targets[authorName+"_owner"] = target.owner;
                        }
                    }
                }
            }
        });
    }

    Reddit.prototype.VerifyProof = function(id, sig, target) {
        var objId = new tce.buffer.Buffer(id, 'HEX');
        var linkKeyPair = tce.bitcoin.ECPair.fromPublicKeyBuffer(objId);
    
        var objSig = new tce.buffer.Buffer(sig, 'HEX');
        var targetID = new tce.buffer.Buffer(target, 'HEX');
        var ecSig = tce.bitcoin.ECSignature.fromDER(objSig);
    
        if (!linkKeyPair.verify(targetID, ecSig)) {
            console.log("Invalid signature on id : " + objId.toString('HEX'));
            Alert("Invalid signature on id : " + objId.toString('HEX'));
            return false;
        }
    
        return true;
    }

    Reddit.prototype.EnableProof = function () {
        var self = this;

        function BuildProof(settings, username, content) {
            var hash = tce.bitcoin.crypto.hash256(new tce.buffer.Buffer(username + content.trim(), 'UTF8'));
            var signature = settings.keyPair.signCompact(hash); // sign needs a sha256
    
            var proof =
                ' ([Proof](' + settings.infoserver +
                '/resources/proof.htm' +
                '?scope=reddit.com' +
                '&script=btc-pkh' +
                '&address=' + settings.publicKeyHash.toString('HEX') +
                '&signature=' + signature.toString('HEX') +
                '&hash=' + hash.toString('HEX') +
                '&name=' + username +
                ' "' + username + '"))';
    
            return proof;
        }

        function EnsureProof($area) {
            var username = $("span.user a").text();
            var content = $area.val();
            var proofIndex = content.indexOf("([Proof](");
            if (proofIndex >= 0) {
                var temp = content.substring(proofIndex);
                var endIndex = temp.indexOf("))");
                if (endIndex > 0) {
                    content = content.substring(0, proofIndex) + content.substring(proofIndex + endIndex + "))".length);
                }
            }

            $area.val(content + BuildProof(self.settings, username, content));
        }


        $('div.usertext-buttons button.save').click(function () {
            var $area = $(this).closest("form").find("textarea");
            EnsureProof($area);
            return true;
        });


        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (!node.childNodes || node.childNodes.length == 0)
                        return;

                    var $node = $(node);
                    $node.find('div.usertext-buttons button.save').click(function () {
                        var $area = $(this).closest("form").find("textarea");
                        EnsureProof($area);
                        $area.css('visibility', 'hidden');

                        return true;
                    });
                });
            });
        });

        var observerConfig = {
            attributes: false,
            childList: true,
            subtree: true,
            characterData: false
        };

        var targetNode = document.body;
        observer.observe(targetNode, observerConfig);
    }

    Reddit.prototype.RenderLinks = function () {
        var self = this;

        this.CreateText = function(text, title) {
            var $text = $("<b title='"+title+"'>["+text+"]</b>");
            return $text;
        }

        this.CreateLink = function(subject, text, title, value, expire) {
            var $alink = $("<a title='"+title+"' href='#'>["+text+"]</a>");
            $alink.data("subject",subject);
            $alink.click(function() {
                self.BuildAndSubmitBinaryTrust($(this).data("subject"), value, expire);
                return false;
            });
            return $alink;
        }

        this.CreateIdenticon = function(subject, title) {
            var data = new Identicon(subject.address.toString('HEX'), {margin:0.1, size:16, format: 'svg'}).toString();
            var $alink = $('<a title="'+title+'" href="#"><img src="data:image/svg+xml;base64,' + data + '"></a>');
            $alink.data("subject", subject);
            $alink.click(function() {
                var opt = {
                    command:'openDialog',
                    url: 'trustlist.html',
                    data: $(this).data("subject")
                };
                opt.w = 800;
                opt.h = 800;
                var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
                var wTop = window.screenTop ? window.screenTop : window.screenY;
        
                opt.left = Math.floor(wLeft + (window.innerWidth / 2) - (opt.w / 2));
                opt.top = Math.floor(wTop + (window.innerHeight / 2) - (opt.h / 2));
                
                chrome.runtime.sendMessage(opt);
                return false;
            });
            return $alink;
        }

        this.CreateIcoin = function($nameLink, name) {
            if($nameLink.data('trusticon'))
                return;
            var imgURL = chrome.extension.getURL("img/"+name);
            var $alink = $('<a href="javascript:void(0);" class="entrytrusticon"><img src="' + imgURL + '"></a>');
            $alink.click(function() {
                $(this).closest('div.entry').children('form, ul').toggle();
            });
            $alink.insertBefore($nameLink);
            $nameLink.data("trusticon", true);
        }
        
        for(var authorName in this.targets) {
            if(authorName.indexOf(self.OwnerPrefix) == 0)
                continue; // Ignore owners

            var subject = this.targets[authorName];
            subject.queryResult = self.queryResult;
            var owner = this.targets[self.OwnerPrefix + authorName];
            var ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
            subject.binaryTrust = self.trustHandler.CalculateBinaryTrust(subject.address.toString('base64'), ownerAddressBase64);


            var $nameLink = $('p.tagline a.id-'+subject.thingId);
            var $tagLine = $nameLink.parent();
            var $entry = $tagLine.closest('div.entry');
            
            $span = $("<span class='userattrs' id='tcButtons'></span>");
            
            $span.append(self.CreateIdenticon(subject, "Analyse "+authorName));

            if(subject.binaryTrust.direct && subject.binaryTrust.directValue) 
                $span.append(self.CreateText("T", "Trust"));
            else
                $span.append(self.CreateLink(subject, "T", "Trust "+authorName, true, 0));

            if(subject.binaryTrust.direct && !subject.binaryTrust.directValue) 
                $span.append(self.CreateText("D", "Distrust"));
            else
                $span.append(self.CreateLink(subject, "D", "Distrust "+authorName, false, 0));

            if(subject.binaryTrust.direct) 
                $span.append(self.CreateLink(subject, "U", "Untrust "+authorName, true, 1));


            if(subject.binaryTrust.isTrusted == 0) {
                $tagLine.children(".entrytrusticon").remove();
            }                

            if(subject.binaryTrust.isTrusted > 0) {
                if(self.settings.trustrender == "color") 
                    $entry.css("background-color", self.settings.trustrendercolor);
                else 
                if(self.settings.trustrender == "icon") {
                    self.CreateIcoin($nameLink, "check16.png");
                }
            }
                    
            if(subject.binaryTrust.isTrusted < 0) {
                if(self.settings.resultrenderhide)
                    $entry.children('form, ul').hide();

                if(self.settings.resultrender == "color") {
                    $entry.css("background-color", self.settings.resultrendercolor);
                    $nameLink.parent().click(function() {
                        $(this).closest('div.entry').children('form, ul').toggle();
                    });
                }
                else
                if(self.settings.resultrender == "icon") {
                    self.CreateIcoin($nameLink, "close16.png");
                }
            }

            var $oldSpan = $tagLine.find('#tcButtons');
            if($oldSpan.length > 0)
                $oldSpan.replaceWith($span);
            else
                $nameLink.after($span);

        }
    };

    Reddit.prototype.BuildAndSubmitBinaryTrust = function(subject, value, expire) {
        var self = this;
        var package = this.subjectService.BuildBinaryTrust(subject, value, null, expire);
        this.packageBuilder.SignPackage(package);
        $.notify("Updating trust", 'success');
        this.trustchainService.PostTrust(package).done(function(trustResult){
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status.toLowerCase());

            self.QueryAndRender().then(function() {
                //$.notify("Done",'success');
            }).fail(function(trustResult){ 
                $.notify("Query failed: " +trustResult.message,"fail");
            });

        }).fail(function(trustResult){ 
            $.notify("Adding trust failed: " +trustResult.message,"fail");
        });
    }

    Reddit.prototype.QueryAndRender = function() {
        var self = this;
        return this.trustchainService.Query(self.targets, window.location.hostname).then(function(result) {
            if (result || result.status == "Success") 
            self.queryResult = result.data.results;
            else
                console.log(result.message);
            
            self.trustHandler = new TrustHandler(self.queryResult, self.settings);

            self.RenderLinks();
        }, DeferredFail);
    }

    return Reddit;
}());


function DeferredFail(error, arg1, arg2) {
    console.log(error);
}


var RedditD2X = (function () {
    function RedditD2X(settings, packageBuilder, subjectService, trustchainService) {
        var self = this;
        self.settings = settings;
        self.subjectService = subjectService;
        self.packageBuilder = packageBuilder;
        self.trustchainService = trustchainService;
        self.queryResult = {};
        self.callbacks = [];
        self.callQuery = false;
        self.environment = 'prod';
        self.subjects = [];
        self.targets = [];
    }

    RedditD2X.prototype.update = function() {
        const self = this;

        for (const subject of self.targets) {
            var container = this.subjects[subject.author];
            for (const key in container.tagBars) {
                const tagBar = container.tagBars[key];

                if (!container.result) {

                    subject.queryResult = self.queryResult;
                    var owner = subject.owner;
                    var ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
                    container.result = self.trustHandler.CalculateBinaryTrust2(subject.address.toString('base64'), ownerAddressBase64);
                }

                tagBar.update(container.result.networkScore, container.result.personalScore);
            }
        }
    }

    RedditD2X.prototype.bindEvents = function() {
        const self = this;
        this.defineEvents();        

        document.addEventListener('reddit', function(e) { self.handleEvent(e) }, true);
        document.dispatchEvent(new CustomEvent('reddit.ready', {
			detail: {
				name: JSAPI_CONSUMER_NAME,
			},
		}));
    }

    RedditD2X.prototype.defineEvents = function() {
        const self = this;
        var callback = function(expando, detail) { self.ensureTabBar(expando, detail) };
        this.watchForRedditEvents('postAuthor', callback)
        this.watchForRedditEvents('commentAuthor', callback);
    }

    RedditD2X.prototype.ensureTabBar = function(expando, detail) {
        if(expando.update || !expando.jsapiTarget) return; 
        const self = this;

        const contentElement = $('#'+expando.contentId);
        let subject = SubjectService.enrichSubject(detail.data.author, contentElement);
        const container = self.ensureContainer(subject);

        let instance = TagBar.bind(expando, subject, this.settings, this.packageBuilder, this.subjectService, this.trustchainService);
        instance.updateCallback = function(subject) {
            self.queryDTP(subject);
        };

        if(container.result)
            instance.update(container.result.networkScore, container.result.personalScore);

        container.tagBars.push(instance);
    }

    RedditD2X.prototype.ensureContainer = function(subject) {
        let container = this.subjects[subject.author];
        if(!container) {
            container = {
                 subject: subject,
                 tagBars: [],
            };
            this.subjects[subject.author] = container;
            if (subject.owner) {
                this.subjects[subject.owner.author] = container;
            }
        }
        return container;
    }

    RedditD2X.prototype.watchForRedditEvents = function(type, callback) {
        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(callback);
    }


    RedditD2X.prototype.queryDTP = function(custom) {
        const self = this;
        self.callQuery = false; // Enable the queryDTP to be called again

        self.targets = [];
        if (custom) {
            if ($.isArray(custom)) {
                self.targets = custom;
             } else {
                self.targets.push(custom); // Predefined targets!
             }
        } else {
            for (const author in this.subjects) {
                var container = this.subjects[author];
                if (container.processed) 
                    continue;
                
                self.targets.push(container.subject);
                if (container.subject.owner) {
                    self.targets.push(container.subject.owner);
                }
                container.processed = true;
            }
        }
        if(self.targets.length === 0)
            return;

        for (const subject of self.targets) {
            const container = self.subjects[subject.author];
            container.result = undefined;
        }

        console.log("Quering the DTP!");

        this.trustchainService.Query(self.targets, window.location.hostname).then(function(result) {
            if (result || result.status == "Success") 
                self.queryResult = result.data.results;
            else
                console.log(result.message);
            
            self.trustHandler = new TrustHandler(self.queryResult, self.settings);

            self.update();
        }, DeferredFail);

    }    

    RedditD2X.prototype.handleEvent = function(event) {
        const self = this;
        
        // A hack to make a function call when all the events have executed.
        if (!this.callQuery) { 
            this.callQuery = true;
            setTimeout(function() { self.queryDTP(); }, 100);
        }
        

        if(!event) return;
        if(!event.detail) return;

        //console.log('Type: '+event.detail.type);
        const fns = this.callbacks[event.detail.type];
        if(!fns) {
            if (self.environment === 'development') {
                console.warn('Unhandled reddit event type:', event.detail.type);
            }
            return;
        }
   

        let contentId;
        let expandoId = `${event.detail.type}|`;
        switch (event.detail.type) {
            case 'postAuthor':
                expandoId += event.detail.data.post.id;
                contentId = event.detail.data.post.id;
                break;
            case 'commentAuthor':
                expandoId += event.detail.data.comment.id;
                contentId = event.detail.data.comment.id;
                break;
            case 'userHovercard':
                expandoId += `${event.detail.data.contextId}|${event.detail.data.user.id}`;
                break;
            case 'subreddit':
            case 'post':
            default:
                expandoId += event.detail.data.id;
                contentId = event.detail.data.id;
                break;
        }
    
        const update = event.target.expando && event.target.expando.id === expandoId ?
            (event.target.expando.update || 0) + 1 :
            0;
    
        if(!event.target.expando) {
            event.target.expando = {
                id: expandoId,
                contentId: contentId,
            } ;

            event.target.expando.jsapiTarget = event.target.querySelector(`[data-name="${JSAPI_CONSUMER_NAME}"]`);
        }

        event.target.expando.update = update;
        
        for (const fn of fns) {
            try {
                fn(event.target.expando, event.detail);
            } catch (e) {
                console.log(e);
            }
        }

    }
    

    return RedditD2X;
}());

const JSAPI_CONSUMER_NAME = "DTPreddit";

var TT = TrustHandler;

var settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    var packageBuilder = new PackageBuilder(settings);
    var subjectService = new SubjectService(settings, packageBuilder);
    var trustchainService = new TrustchainService(settings);
   
	if (document.documentElement.getAttribute('xmlns')) {
        // Old reddit
        var reddit = new Reddit(settings,  packageBuilder, subjectService, trustchainService);

        reddit.EnableProof();
        reddit.QueryAndRender();
    
        // Update the content when trust changes on the Trustlist.html popup
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.command === 'updateContent') {
                reddit.QueryAndRender();
            }
        });
    } else {
        // Mew reddit
        var redditD2X = new RedditD2X(settings,  packageBuilder, subjectService, trustchainService);
        redditD2X.bindEvents()
    }
});

