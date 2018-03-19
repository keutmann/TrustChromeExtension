///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");

var Reddit = (function () {
    function Reddit(settings, packageBuilder, targetService, trustchainService) {
        var self = this;
        self.settings = settings;
        self.targetService = targetService;
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

        for(var authorName in this.targets) {
            var subject = this.targets[authorName];

            
            //subject.
            //var addressBase64 = subject.address.toJSON();
            //subject.trusts = parser.subjects[addressBase64];

            subject.queryResult = self.queryResult;
            subject.binaryTrust = self.trustHandler.CalculateBinaryTrust(subject.address.toString('base64'));

            var $tagLine = $('p.tagline a.id-'+subject.thingId);

            var $span = $("<span class='userattrs'></span>");
            
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
                
            if(subject.binaryTrust.isTrusted != 0) {
                var color = (subject.binaryTrust.isTrusted > 0) ? "#EEFFDD": "lightpink";
                $tagLine.parent().parent().css("background-color", color);
            }

            $('p.tagline a.id-'+subject.thingId).after($span);
            
        }
    };

    Reddit.prototype.BuildAndSubmitBinaryTrust = function(subject, value, expire) {
        var package = this.targetService.BuildBinaryTrust(subject, value, null, expire);
        this.packageBuilder.SignPackage(package);
        this.trustchainService.PostTrust(package).done(function(trustResult){
            console.log("Posting package is a "+trustResult.status);
        });
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
    reddit.trustchainService.Query(reddit.targets).done(function(result) {
        if (result || result.status == "Success") 
            reddit.queryResult = result.data.results;
        else
            console.log(result.message);
        
        reddit.trustHandler = new TrustHandler(reddit.queryResult, settings);

        reddit.RenderLinks();
        
    });
});