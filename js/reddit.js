///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");

var Reddit = (function () {
    function Reddit(settings, packageBuilder, trustchainService) {
        var self = this;
        self.settings = settings;
        self.targets = [];
        this.packageBuilder = packageBuilder;
        self.trustchainService = trustchainService;

        $("div.thing[data-author]").each(function () {

            var $this = $(this);
            var authorName = $this.data("author");

            var user = self.targets[authorName];
            if(!user) {
                user = {};
                //user.$htmlContainers = []; 
                user.authorName = authorName;
                user.thingId = $this.data("author-fullname");
                user.address = authorName.hash160(); // array of bytes (Buffer)
                user.scope = window.location.hostname;
                self.targets[authorName] = user;
            }

            //user.$htmlContainers.push($this);

            if(!user.identity) {
                var $proof = $this.find("a[href*='scope=reddit']:contains('Proof')")
                if ($proof.length > 0) {
                    var query = getQueryParams($proof.attr("href"));
                    if(query.name == user.authorName) 
                        user.identity = query;
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
            var signatre = settings.keyPair.signCompact(hash); // sign needs a sha256
    
            var proof =
                ' ([Proof](' + settings.infoserver +
                '/resources/proof.htm' +
                '?scope=reddit.com' +
                '&script=btc-pkh' +
                '&address=' + settings.publicKeyHash.toString('HEX') +
                '&signature=' + signatre.toString('HEX') +
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

    Reddit.prototype.RenderLinks = function (parser) {
        this.CreateLink = function(user, text, title, value, expire) {
            var $alink = $("<a title='"+title+"' href='#'>["+text+"]</a>");
            $alink.data("user",user);
            $alink.click(function() {
                var user = $(this).data("user");
                self.BuildAndSubmitBinaryTrust(user, value, expire);
                return false;
            });
            return $alink;
        }

        this.CreateLinkAnalyse = function(user, text, title) {
            var $alink = $("<a title='"+title+"' href='#'>["+text+"]</a>");
            $alink.data("user",user);
            $alink.click(function() {
                var user = $(this).data("user");
    
                var opt = {
                    command:'openDialog',
                    url: 'trustlist.html',
                    data: user
                };
                opt.w = 800;
                opt.h = 800;
                var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
                var wTop = window.screenTop ? window.screenTop : window.screenY;
        
                opt.left = Math.floor(wLeft + (window.innerWidth / 2) - (opt.w / 2));
                opt.top = Math.floor(wTop + (window.innerHeight / 2) - (opt.h / 2));
                
                chrome.runtime.sendMessage(opt);
                //window.parent.postMessage({ command: "openDialog", url: 'trustlist.html' }, "*");
                return false;
            });
            return $alink;
        }

        // window.addEventListener("message", function (event) {
        //     if (event.data.type == "getTrustListData") {
                
        //     }
        // }        


        var self = this;
        for(var authorName in this.targets) {
            var user = this.targets[authorName];
            var addressBase64 = user.address.toJSON();
            user.trusts = parser.targets[addressBase64];

            var $tagLine = $('p.tagline a.id-'+user.thingId);

            var $span = $("<span class='userattrs'></span>");


            $span.append(self.CreateLink(user, "T", "Trust "+authorName, true, 0));
            $span.append(self.CreateLink(user, "D", "Distrust "+authorName, false, 0));

            if(user.trusts) 
            {
                $span.append(self.CreateLink(user, "U", "Untrust "+authorName, true, 1));
                $span.append(self.CreateLinkAnalyse(user, "A", "Analyse "+authorName));

                user.claimAnalysis = parser.claimAnalysis(user.trusts);
                var color = (user.claimAnalysis.trust == 100) ? "#EEFFDD": "lightpink";
                $tagLine.parent().parent().css("background-color", color);
            }

            $('p.tagline a.id-'+user.thingId).after($span);
            
        }
    };

    Reddit.prototype.CreateBinaryTrust = function(user, value, expire) {
        // Build trust
        var trust = this.packageBuilder.CreateBinaryTrust(this.settings.publicKeyHash, 
            "btc-pkh", 
            user.address, 
            value, 
            user.scope,
            0,
            expire);

        var package = this.packageBuilder.CreatePackage(trust);

        if(user.identity) {
            var subjectPublicKey = new tce.buffer.Buffer((user.identity.pk || user.identity.id), 'HEX');

            var trust2 = this.packageBuilder.CreateBinaryTrust(this.settings.publicKeyHash, 
                "btc-pkh", 
                tce.bitcoin.crypto.hash160(subjectPublicKey), 
                value, 
                user.scope,
                0,
                expire);
            package.trusts.push(trust2);
        }

        

        return package;
    }

    Reddit.prototype.BuildBinaryTrust = function(user, value, expire) {
        var self = this;
        var package = this.CreateBinaryTrust(user,value, expire);

        for(var trustIndex in package.trusts) {
            var trust = package.trusts[trustIndex];
            self.packageBuilder.CalculateTrustId(trust);
            self.packageBuilder.SignTrust(trust);
        }
        return package;
    }

    Reddit.prototype.BuildAndSubmitBinaryTrust = function(user, value, expire) {
        var self = this;
        var package = self.BuildBinaryTrust(user, value, expire);
        self.SubmitBinaryTrust(package).done(function(trustResult) {
            console.log("Posting package is a "+trustResult.status);
        });
    }

    Reddit.prototype.SubmitBinaryTrust = function(package) {
        return this.trustchainService.PostTrust(package).done(function(trustResult){
            console.log("Posting package is a "+trustResult.status);
        });
    }


    Reddit.prototype.QueryChain = function() {
        var deferred = $.Deferred();

        var self = this;

        self.trustchainService.Query(this.targets).done(function (result) {
            if (!result || result.status != "Success") {
                alert(result.message);
                deferred.fail();
                return;
            }

            var package = result.data.results;
            if(!package) 
                package = { trusts: [] };

            var parser = new PackageParser(package);
            self.queryResult = parser;

            deferred.resolve(parser);
        });

        return deferred.promise();
    }

    return Reddit;
}());


var settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    var packageBuilder = new PackageBuilder(settings);
    var trustchainService = new TrustchainService(settings);
    var reddit = new Reddit(settings,  packageBuilder, trustchainService);

    reddit.EnableProof();
    reddit.QueryChain().done(function(parser) {
        reddit.RenderLinks(parser);
    });
});