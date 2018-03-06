///<reference path="../typings/globals/jquery/index.d.ts" />

//var modalUrl = chrome.extension.getURL("redditmodal.html");
//var imageUrl = chrome.extension.getURL("img/Question_blue.png");
//var selectedElement = null;
//var users = [];


//var $things = null;
/*
if (window.location.href.indexOf("reddit.com") > -1) {
}
*/

var Reddit = (function () {
    function Reddit(settings) {
        var self = this;
        self.settings = settings;
        self.users = [];
    
        // Function -----------------------
        self.buildUserList = function() {

            $("div.thing[data-author]").each(function () {

                var $this = $(this);
                var authorName = $this.data("author");

                var user = self.users[authorName];
                if(!user) {
                    var user = {};
                    user.$htmlContainers = []; 
                    user.authorName = authorName;
                    user.id = $this.data("author-fullname");
                    user.nameTarget = CreateTarget(user.authorName, "name"); 
                    user.nameTarget.contentid = GetIDFromContent(user.authorName); //.toString('HEX'); //Make sure that a user has an ID

                    self.users[user.authorName] = user;
                    //user.identity = null;
                }
                user.$htmlContainers.push($this);

                if(!user.identity) {
                    var $proof = $this.find("a[href*='scope=reddit']:contains('Proof')")
                    if ($proof.length > 0) {
                        var href = $proof.attr("href").split("?")[1].split("&");
                        var query = {};
                        $.each(href, function(index, item) { 
                            var p = item.split("=");
                            query[decodeURIComponent(p[0])] = decodeURIComponent(p[1]); 
                        });

                        if(query.name == user.authorName) 
                            user.identity = query;       
                            // new tce.buffer.Buffer(decodeURIComponent(p[1] || ''), "HEX")
                    }
                }
                   
            });
        }

    }

    Reddit.prototype.EnableProof = function () {
        var self = this;

        function BuildProof(settings, username, content) {
            var keyPair = settingsController.buildKey(settings);
                
            var id = keyPair.getPublicKeyBuffer().toString('HEX');
            var contentHash = tce.bitcoin.crypto.hash256(new tce.buffer.Buffer(username + content.trim(), 'UTF8'));
            var ecSig = keyPair.sign(contentHash); // sign needs a sha256
            var sig = ecSig.toDER().toString('HEX');
            var contentHex = contentHash.toString('HEX');
    
            var proof =
                ' ([Proof](' + settings.infoserver +
                '/proof.htm' +
                '?name=' + username +
                '&scope=reddit.com' +
                '&id=' + id +
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
        if(this.users.length == 0)
            this.buildUserList();

        for(var authorName in this.users) {
            var user = this.users[authorName];
            for(var i in user.$htmlContainers) {
                var $alink = $("<a title='trust me' href='#'>[Trust me]</a>");
                $alink.data("user",user);
                $alink.click(function() {
                    var user = $(this).data("user");
                    console.log(user.authorName);
                });
                
                var $span = $("<span class='userattrs'></span>");
                $span.append($alink);
    
                user.$htmlContainers[i].find('p.tagline a.id-'+user.id).after($span);
            }
            
        }
    };


    Reddit.prototype.QueryChain = function() {
        var self = this;
        ResolveTarget(this.users, this.settings).done(function (result) {
            if (!result || result.status != "Success") {
                alert(result.message);
                return;
            }

            var package = result.data;
            var parser = new PackageParser(package);
            for (var authorName in self.users) {
                var user = self.users[authorName];

                var address = user.nameTarget.contentid.toJSON();
                var target = parser.targets[address];
                //if(!target) continue;
                
                //var claimAnalysis = parser.claimAnalysis(target);
                //var color = (claimAnalysis.trust == 100) ? "lightgreen": "lightpink";
                var color = (authorName == "trustchain") ? "lightgreen" : "lightpink";
                for(var htmlIndex in user.$htmlContainers)
                {
                    var $value = user.$htmlContainers[htmlIndex];
                    $value.css("background-color", color);
                }
                // var node = parser.FindById(idbase64);
                // if (node) {
                //     var $thing = author.$element.closest("div[data-author='" + name + "']");
                //     if (node.claim.trust) {
                //         if (settings.trustrender == "color")
                //             $thing.css("background-color", "lightgreen");

                //         if (settings.trustrender == "icon")
                //             $thing.css("background-color", "lightgreen");
                //     } else 
                //     {
                //         if (settings.resultrender == "warning")
                //             $thing.css("background-color", "pink");

                //         if (settings.resultrender == "hide")
                //             $thing.hide();
                //     }
                // }
            }
        });
    }

    return Reddit;
}());


var settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    var reddit = new Reddit(settings);

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