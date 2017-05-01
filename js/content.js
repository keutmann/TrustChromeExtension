var modalUrl = chrome.extension.getURL("modal.html");
var imageUrl = chrome.extension.getURL("img/Question_blue.png");
var selectedElement = null;
var settingsController = new SettingsController();

if (window.location.href.indexOf("reddit.com") > -1) {
    var $links = $("a.author");
    $links.each(function () {
        var $link = $(this);
        var $parent = $link.parent();
        var target = ParseTrustMe(this);
        var $trustthis = $('<span class="trustthis"> -> <a href="#">Trust this</a></span>');
        $trustthis.iframeDialog(CreateDialogOptions(target));
        $parent.append($trustthis);

        //$parent.css("background-color", "lightgrey");
    });


    function trustmeDialog($trustme) {
        $trustme.each(function () {
            var target = ParseTrustMe(this); // this = a href element
            $(this).iframeDialog(CreateDialogOptions(target));
        });
        $trustme.click(function () {
            return false;
        });
    }

    trustmeDialog($("em a[href*='?page=trustme&scope=reddit']"));


    settingsController.loadSettings(function (items) {
        var keyPair = settingsController.buildKey(items);
        
        var username = $("span.user a").text();
        var id = keyPair.getPublicKeyBuffer().toString('HEX');
        var targetHash = tce.bitcoin.crypto.hash256(username);
        var ecSig = keyPair.sign(targetHash);
        var sig = ecSig.toDER().toString('HEX');
        var target = targetHash.toString('HEX');

        var trustme =
            '  \r\n' +
            '&nbsp;  \r\n' +
            '*Trust me [' + username + '](' + items.infoserver +
            '?page=trustme' +
            '&scope=reddit' +
            '&type=identity' +
            '&id=' + id +
            '&sig=' + sig +
            '&target=' + target +
            ' "' + username + '")*';

        $('div.usertext-buttons button.save').click(function () {
            var $area = $(this).closest("form").find("textarea");
            $area.val($area.val() + trustme);
            return true;
        });


        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (!node.childNodes || node.childNodes.length == 0)
                        return;

                    var $node = $(node);
                    $node.find('div.usertext-buttons button.save').click(function () {
                        var $area = $(this).closest("form").find("textarea");
                        $area.css('visibility', 'hidden');
                        $area.val($area.val() + trustme);
                        return true;
                    });

                    trustmeDialog($node.find("em a[href^='"+ items.infoserver + "'?page=trustme']"));
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
    });
}

document.addEventListener('contextmenu', function (e) {
    selectedElement = e.toElement;
}, false);

window.addEventListener('message', function (event) {
    if (event.data.type == "close") {
        console.log(event.data.content);
        $(selectedElement).dialog("close");
    }
});


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.type) {
        case "openModal":
            var info = JSON.parse(request.content);
            var content = info.selectionText;
            if (!content)
                content = info.linkUrl;

            var target = CreateTarget(content);

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
                contentWindow.postMessage({ type: "Issue" }, "*");
            },
            Cancel: function () {
                $(this).dialog("close");
            }
        }
    }
}
