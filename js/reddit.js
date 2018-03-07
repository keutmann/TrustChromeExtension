///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");
var PackageParser = (function() {
    function  PackageParser(package) {
        var self = this;

        this.package = package;
        this.targets = [];

        var trusts = package.trusts;
        for(var trustIndex in trusts)
        {
            var trust = trusts[trustIndex];
            
            for(var subjectIndex in trust.subjects)
            {
                var subject = trust.subjects[subjectIndex];
                var target = this.targets[subject.address];
                if(!target) {
                    target = subject;
                    target.issuers = [];
                    target.aliases = [];
                    target.claims = [];
                    this.targets[subject.address] = target;
                } 

                // Add claims
                if(!subject.claimIndexs || subject.claimIndexs.length == 0)
                {  // If not claim index exist, default is Trust true
                    target.cliams.push({
                            "index": 0,
                            "type": "binarytrust.tc1",
                            "data": "{\"trust\":true}",
                            "cost": 100
                          });    
                } else {
                    for(claimIndex in subject.claimIndexs) 
                        target.claims.push(trust.claims[claimIndex]);
                }

                if(subject.alias)
                    target.aliases.push(subject.alias);

                target.issuers[trust.issuer.address] = trust.issuer;
            }
            
        }

    }

    PackageParser.prototype.claimAnalysis = function(target) {
        var result = {
            "trusttrue" : 0,
            "trustfalse" : 0,
            "trust" : 0,    
            "type" : []
        };
        for(var i in target.claims) {
            var claim = target.claims[i];
            
            if(claim.type === "binarytrust.tc1") {
                var obj = JSON.parse(claim.data);
                if(obj.trust === true) 
                    result.trusttrue++;
                 else
                    result.trustfalse++;
            }
            result.type[claim.type].push(claim);
        }
        var total = result.trusttrue + result.trustfalse;
        result.trust = Math.floor((result.trusttrue * 100) / total);

        return result;
    }

    return PackageParser;
}());


var Reddit = (function () {
    function Reddit(settings, packageBuilder, trustchainService) {
        var self = this;
        self.settings = settings;
        self.targets = [];
        this.packageBuilder = packageBuilder;
        self.trustchainService = trustchainService;
    
        // Function -----------------------
        self.buildUserList = function() {

            $("div.thing[data-author]").each(function () {

                var $this = $(this);
                var authorName = $this.data("author");

                var user = self.targets[authorName];
                if(!user) {
                    user = {};
                    user.$htmlContainers = []; 
                    user.authorName = authorName;
                    user.thingId = $this.data("author-fullname");
                    user.address = authorName.hash160(); // array of bytes (Buffer)
                    user.scope = window.location.hostname;
                    self.targets[authorName] = user;
                }

                user.$htmlContainers.push($this);

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
            var keyPair = settingsController.buildKey(settings);
                
            var publicKeyHex = keyPair.getPublicKeyBuffer().toString('HEX');
            var contentHash = tce.bitcoin.crypto.hash256(new tce.buffer.Buffer(username + content.trim(), 'UTF8'));
            var ecSig = keyPair.sign(contentHash); // sign needs a sha256
            var sig = ecSig.toDER().toString('HEX');
            var contentHex = contentHash.toString('HEX');
    
            var proof =
                ' ([Proof](' + settings.infoserver +
                '/proof.htm' +
                '?name=' + username +
                '&scope=reddit.com' +
                '&pk=' + publicKeyHex +
                '&sig=' + sig +
                '&content=' + contentHex +
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
        if(this.targets.length == 0)
            this.buildUserList();

        for(var authorName in this.targets) {
            var user = this.targets[authorName];
            for(var i in user.$htmlContainers) {
                var $alink = $("<a title='trust me' href='#'>[Trust me]</a>");
                $alink.data("user",user);
                $alink.click(function() {
                    var user = $(this).data("user");
                    console.log(user.authorName);
                    self.SubmitBinaryTrust(user, true);
                });
                
                var $span = $("<span class='userattrs'></span>");
                $span.append($alink);
    
                user.$htmlContainers[i].find('p.tagline a.id-'+user.thingId).after($span);
            }
            
        }
    };

    Reddit.prototype.CreateBinaryTrust = function(user, value) {
        // Build trust
        var trust = this.packageBuilder.CreateBinaryTrust(this.settings.publicKeyHash, 
            "btc-pkh", 
            user.address, 
            user.authorName, 
            value, 
            user.scope);

        if(user.identity) {
            var claim = trust.claims[0];
            var publicKey = new tce.buffer.Buffer((user.identity.pk || user.identity.id), 'HEX');
            var address = tce.bitcoin.crypto.hash160(publicKey); 
            var subject = this.packageBuilder.CreateSubject(address, user.authorName, [claim.index]);
            trust.subjects.push(subject);
        }
        return trust;
    }

    Reddit.prototype.BuildBinaryTrust = function(user, value) {
        var deferred = $.Deferred();
        var self = this;
        var trust = this.CreateBinaryTrust(user,value);
        this.trustchainService.PostTrustTemplate(trust).done(function(result) {
            trust.id = (typeof result.data.id === 'string') ? new tce.buffer.Buffer(result.data.id, 'base64') : result.data.id;
            self.packageBuilder.SignTrust(trust);
            deferred.resolve(trust);
        });

        return deferred.promise();
    }

    Reddit.prototype.SubmitBinaryTrust = function(user, value) {
        var self = this;
        self.BuildBinaryTrust(user,value).done(function(trust) {
            self.trustchainService.PostTrust(trust).done(function(trustResult){
                console.log("Posting trust is a "+trustResult.status);
            });
        });

    }

    Reddit.prototype.QueryChain = function() {
        var self = this;

        self.trustchainService.Query(this.targets).done(function (result) {
            if (!result || result.status != "Success") {
                alert(result.message);
                return;
            }

            var package = result.data;
            var parser = new PackageParser(package);
            for (var authorName in self.targets) {
                var user = self.targets[authorName];

                var addressBase64 = user.address.toJSON();
                var target = parser.targets[addressBase64];
                if(!target) continue;
                
                var claimAnalysis = parser.claimAnalysis(target);
                var color = (claimAnalysis.trust == 100) ? "lightgreen": "lightpink";
                //var color = (authorName == "trustchain") ? "lightgreen" : "lightpink";
                for(var htmlIndex in user.$htmlContainers)
                {
                    var $value = user.$htmlContainers[htmlIndex];
                    $value.css("background-color", color);
                }
            }
        });
    }

    return Reddit;
}());


var settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    var packageBuilder = new PackageBuilder(settings);
    var trustchainService = new TrustchainService(settings);
    var reddit = new Reddit(settings,  packageBuilder, trustchainService);

    reddit.RenderLinks();
    reddit.EnableProof();
    reddit.QueryChain();
});

/*

    function ProcessThings() {

        ResolveTarget(users, settings).done(function (result) {
            if (result) {
                var parser = new QueryParser(result);
                
                for (var name in users) {
                    var author = users[name];
                    var user = author.user;
                    var id = (user.id) ? user.id : user.contentid;
                    //var objId = new tce.buffer.Buffer(id, 'HEX');
                    var idbase64 = id.toString("base64");
                    if (user.content == "chakhabona") {
                        if (idbase64 == "115omNV0gUFepSumPYO61Y2Ecic=") {
                            console.log(idbase64);
                        }
                    }
                    var node = parser.FindById(idbase64);
                    if (node) {
                        var $thing = author.$element.closest("div[data-author='" + name + "']");
                        if (node.claim.trust) {
                            if (settings.trustrender == "color")
                                $thing.css("background-color", "lightgreen");

                            if (settings.trustrender == "icon")
                                $thing.css("background-color", "lightgreen");
                        } else 
                        {
                            if (settings.resultrender == "warning")
                                $thing.css("background-color", "pink");

                            if (settings.resultrender == "hide")
                                $thing.hide();
                        }
                    }
                }

                //var jsonString = JSON.stringify(result);
                //console.log(jsonString);
                //$parent.css("background-color", "lightgrey");

            }
            else {
                //var $trustthis = $('<span class="trustthis"> -> <a href="#">Trust this</a></span>');
                //$trustthis.iframeDialog(CreateDialogOptions(target));
                //$parent.append($trustthis);
            }
        });
    }
*/
/*
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "openModal":
            var info = JSON.parse(request.content);
            if(!info.linkUrl)
                return;

            var authorName = info.linkUrl.split('/').pop();
            var author = users[authorName];

            $(selectedElement).openIframeDialog(CreateDialogOptions(author.user));

            //var target = CreateTarget(content);
            //if (!info.selectionText)
            //    target.type = "url";

            //var $proof = $("a[href*='&scope=reddit']:contains('Proof')").first();
            //if ($proof.length > 0) {
            //    var href = $proof.attr("href").split("&");
            //    for (key in href) {
            //        var part = href[key];
            //        var p = part.split("=");
            //        target[p[0]] = p[1];
            //    }
            //}

            //target.address = GetTargetAddress(target);


            console.log(request.content);
            //console.log(JSON.stringify(selectedElement));
            break;
    }

});

window.addEventListener('message', function (event) {
    if (event.data.type == "modalTrustIssue") {
        settingsController.loadSettings(function (settings) {
            settingsController.buildKey(settings);

            var trustpackage = BuildPackage(settings, event.data.target);
            var data = JSON.stringify(trustpackage);
            var rurl = settings.graphserver + '/api/trust/';
            $.ajax({
                type: "POST",
                url: rurl,
                data: data,
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
            }).done(function (msg, textStatus, jqXHR) {

            }).fail(function (jqXHR, textStatus, errorThrown) {
                TrustServerErrorAlert(jqXHR, textStatus, errorThrown, settings.graphserver);
            }).always(function () {
                $(selectedElement).dialog("close");
            });
        });
    }
});

function CreateDialogOptions(target) {
    return {
        // iframeDialog options 
        //id: 'iframeDialogTest',
        data: target,
        url: modalUrl,
        scrolling: 'no',
        // jquery UI Dialog options 
        title: 'Trust',
        modal: true,
        //resizable: true,
        width: 'auto',
        height: 'auto',
        buttons: {
            OK: function () {
                var contentWindow = $(this).find("iframe").get(0).contentWindow;
                if (!contentWindow)
                    return;

                selectedElement = this;
                $(this).parent().find(".ui-dialog-buttonset button").prop("disabled", true);
                contentWindow.postMessage({ type: "Issue", target: target }, "*");
            },
            Cancel: function () {
                $(this).dialog("close");
            }
        }
    }
}
*/