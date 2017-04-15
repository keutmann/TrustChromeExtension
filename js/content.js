var modalUrl = chrome.extension.getURL("modal.html");
var imageUrl = chrome.extension.getURL("img/Question_blue.png");
var selectedElement = null;

if (window.location.href.indexOf("reddit.com") > -1) {
    var $links = $("a.author");
    $links.each(function () {
        var $link = $(this);
        var $parent = $link.parent();

        var $image = $('<img src="' + imageUrl + '" class="trusticon"></img>');
        $image.iframeDialog(CreateDialogOptions($link.text()));
        $parent.append($image);
        $parent.css("background-color", "lightgrey");
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