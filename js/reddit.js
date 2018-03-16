///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");

var Reddit = (function () {
    function Reddit(settings, packageBuilder, targetService, trustchainService) {
        var self = this;
        self.settings = settings;
        self.targetService = targetService;
        self.targets = [];
        this.packageBuilder = packageBuilder;
        self.trustchainService = trustchainService;

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
                        target.owner = params;
                        target.owner.type = "entity";
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

    Reddit.prototype.RenderLinks = function (parser) {
        this.CreateLink = function(target, text, title, value, expire) {
            var $alink = $("<a title='"+title+"' href='#'>["+text+"]</a>");
            $alink.data("target",target);
            $alink.click(function() {
                self.BuildAndSubmitBinaryTrust($(this).data("target"), value, expire);
                return false;
            });
            return $alink;
        }

        this.CreateIdenticon = function(target, title) {
            var data = new Identicon(target.address.toString('HEX'), {margin:0.1, size:16, format: 'svg'}).toString();
            var $alink = $('<a title="'+title+'" href="#"><img src="data:image/svg+xml;base64,' + data + '"></a>');
            $alink.data("target",target);
            $alink.click(function() {
                var opt = {
                    command:'openDialog',
                    url: 'trustlist.html',
                    data: $(this).data("target")
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

        var self = this;
        for(var authorName in this.targets) {
            var target = this.targets[authorName];
            var addressBase64 = target.address.toJSON();
            target.trusts = parser.targets[addressBase64];

            var $tagLine = $('p.tagline a.id-'+target.thingId);

            var $span = $("<span class='userattrs'></span>");
            
            $span.append(self.CreateIdenticon(target, "Analyse "+authorName));

            $span.append(self.CreateLink(target, "T", "Trust "+authorName, true, 0));
            $span.append(self.CreateLink(target, "D", "Distrust "+authorName, false, 0));

            if(target.trusts) 
            {
                $span.append(self.CreateLink(target, "U", "Untrust "+authorName, true, 1));
                
                target.claimAnalysis = parser.claimAnalysis(target);
                var color = (target.claimAnalysis.trust == 100) ? "#EEFFDD": "lightpink";
                $tagLine.parent().parent().css("background-color", color);
            }

            $('p.tagline a.id-'+target.thingId).after($span);
            
        }
    };

    Reddit.prototype.BuildAndSubmitBinaryTrust = function(target, value, expire) {
        var package = this.targetService.BuildBinaryTrust(target, value, null, expire);
        this.packageBuilder.SignPackage(package);
        this.trustchainService.PostTrust(package).done(function(trustResult){
            console.log("Posting package is a "+trustResult.status);
        });
    }


    Reddit.prototype.QueryChain = function() {
        var deferred = $.Deferred();

        var self = this;

        self.trustchainService.Query(this.targets).done(function (result) {
            if (!result || result.status != "Success") {
                //alert(result.message);
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
    var targetService = new TargetService(settings, packageBuilder);
    var trustchainService = new TrustchainService(settings);
   
    var reddit = new Reddit(settings,  packageBuilder, targetService, trustchainService);

    reddit.EnableProof();
    reddit.QueryChain().done(function(parser) {
        reddit.RenderLinks(parser);
    });
});