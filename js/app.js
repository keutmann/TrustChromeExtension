var modalUrl = chrome.extension.getURL("redditmodal.html");
var imageUrl = chrome.extension.getURL("img/Question_blue.png");
var selectedElement = null;
var settingsController = new SettingsController();
settingsController.loadSettings(function (items) {
    Load(items);
});


function Load(items) {
    if (window.location.href.indexOf("reddit.com") > -1) {

        function ProcessLinks(items) {
            var $links = $("a.author");
            var target = [];
            $links.each(function () { //.slice(0, 1)
                var item = ParseTrustMe(this);
                item.$link = $(this);
                target.push(item);
            });

            ResolveTarget(target, items).done(function (result) {
                if (result) {
                    var parser = new QueryParser(result);

                    for (var key in target) {
                        var item = target[key];

                        var id = item.address.toString("base64");
                        var node = parser.FindById(id);
                        if (node) {

                            if (node.claim.trust) {
                                if (items.trustrender == "color")
                                    item.$link.closest("div[data-author='" + item.$link.text() + "']").css("background-color", "lightgreen");

                                if (items.trustrender == "icon")
                                    item.$link.closest("div[data-author='" + item.$link.text() + "']").css("background-color", "lightgreen");
                            } else 
                            {
                                if (items.resultrender == "warning")
                                    item.$link.closest("div[data-author='" + item.$link.text() + "']").css("background-color", "pink");

                                if (items.resultrender == "hide")
                                    item.$link.closest("div[data-author='" + item.$link.text() + "']").hide();
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


        function trustmeDialog($trustme) {
            $trustme.each(function () {
                var target = ParseTrustMe(this); // this = a href element
                $(this).iframeDialog(CreateDialogOptions(target));
            });
            $trustme.click(function () {
                return false;
            });
        }

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
                '&scope=reddit' +
                //'&type=identity' + // Needed?
                '&id=' + id +
                '&sig=' + sig +
                '&content=' + contentHex +
                ' "' + username + '"))';

            return proof;
        }

        function ExtendLinks(settings) {
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

                $area.val(content + BuildProof(settings, username, content));
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

                        //trustmeDialog($node.find("em a[href^='" + settings.infoserver + "'?page=trustme']"));
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

        ProcessLinks(items);
        //trustmeDialog($("em a[href*='?page=trustme&scope=reddit']")); // No need 
        ExtendLinks(items);
    }
}

document.addEventListener('contextmenu', function (e) {
    selectedElement = e.toElement;
}, false);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "openModal":
            var info = JSON.parse(request.content);
            var content = info.selectionText;
            if (!content) 
                content = info.linkUrl;

            var target = CreateTarget(content);
            if (!info.selectionText)
                target.type = "url";

            var $proof = $("a[href*='&scope=reddit']:contains('Proof')").first();
            if ($proof.length > 0) {
                var href = $proof.attr("href").split("&");
                for (key in href) {
                    var part = href[key];
                    var p = part.split("=");
                    target[p[0]] = p[1];
                }
            }

            target.address = GetTargetAddress(target);


            $(selectedElement).openIframeDialog(CreateDialogOptions(target));
            console.log(request.content);
            //console.log(JSON.stringify(selectedElement));
            break;
    }

});

function CreateDialogOptions(target) {
    return {
        /* iframeDialog options */
        //id: 'iframeDialogTest',
        data: target,
        url: modalUrl,
        scrolling: 'no',
        /* jquery UI Dialog options */
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
                //alert("Trust submitted: " + msg);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                TrustServerErrorAlert(jqXHR, textStatus, errorThrown, settings.graphserver);
            }).always(function () {
                $(selectedElement).dialog("close");
            });
        });
    }
});
