var modalUrl = chrome.extension.getURL("modal.html");
var imageUrl = chrome.extension.getURL("img/Question_blue.png");
var selectedElement = null;
var settingsController = new SettingsController();


if (window.location.href.indexOf("reddit.com") > -1) {
    var $links = $("a.author");
    $links.each(function () {
        var $link = $(this);
        var $parent = $link.parent();

        var $trustthis = $('<span class="trustthis"> -> <a href="#">Trust this</a></span>');
        $trustthis.iframeDialog(CreateDialogOptions($link.text()));
        $parent.append($trustthis);

        //$parent.css("background-color", "lightgrey");
    });


    function trustmeDialog($trustme) {
        $trustme.each(function () {
            $(this).iframeDialog(CreateDialogOptions($(this).text()));
        });
        $trustme.click(function () {
            return false;
        });
    }

    trustmeDialog($("em a[href*='tc.xyz/?page=trustme']"));
    

    settingsController.loadSettings(function (items) {
        var keyPair = settingsController.buildKey(items);

        var username = $("span.user a").text();
        var id = keyPair.getAddress();
        var hashBinary = tce.bitcoin.crypto.hash256(username);
        var ecSig = keyPair.sign(hashBinary);
        var sig = ecSig.toDER().toString('HEX');
        var hash = hashBinary.toString('HEX');

        var trustme =
            '  \r\n' +
            '&nbsp;  \r\n' +
            '*Trust me [' + username + '](http://tc.xyz/' +
            '?page=trustme' +
            '&source=reddit' +
            '&id=' + id +
            '&sig=' + sig +
            '&hash=' + hash +
            '&value=' + username +
            ' "' + username + '")*';

        $('div.usertext-buttons button.save').click(function () {
            var $area = $(this).closest("form").find("textarea");
            $area.val($area.val() + trustme);
            return true;
        });


        $("body").on('DOMNodeInserted', "div.child", function (event) {
            if (event.localName == "form") {
                if ($(event.target).data("initialized"))
                    return;

                $(event.target).data("initialized", "true");
                $(event.target).find('div.usertext-buttons button.save').click(function () {
                    var $area = $(this).closest("form").find("textarea");
                    $area.val($area.val() + trustme);
                    return true;
                });
            }

            if (event.target.className == "md") {
                if ($(event.target).data("initialized"))
                    return;

                $(event.target).data("initialized", "true");
                trustmeDialog(event.target.find("em a[href*='tc.xyz/?page=trustme']"));
            }
        });

        //$("body").on('DOMNodeInserted', "div.md", function (event) {
        //    if (!event.localName == "div")
        //        return;

        //    if ($(event.target).data("initialized"))
        //        return;

        //    $(event.target).data("initialized", "true");
        //    trustmeDialog(event.target.find("em a[href*='tc.xyz/?page=trustme']"));
        //});
    });


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

            $(selectedElement).openIframeDialog(CreateDialogOptions(content));
            console.log(request.content);
            //console.log(JSON.stringify(selectedElement));
            break;
    }
});

function CreateDialogOptions(content) {
    return {
        /* iframeDialog options */
        //id: 'iframeDialogTest',
        data: content,
        url: modalUrl,
        scrolling: 'no',
        /* jquery UI Dialog options */
        title: 'Trust',
        modal: true,
        //resizable: true,
        width: 'auto',
        height: 'auto',
        buttons: {
            Trust: function () {
                $(this).dialog("close");
            },
            Cancel: function () {
                $(this).dialog("close");
            }
        }
    }
}