
var currentWindow = null;

chrome.runtime.onMessage.addListener(function(request) {
    if (request.command === 'openDialog') {
        OpenDialog(request);
        return;
    }

    
});


function OpenDialog(request)
{
    try {
        chrome.tabs.create({
            url: chrome.extension.getURL(request.url), //'dialog.html'
            active: false
        }, function(tab) {
            // After the tab has been created, open a window to inject the tab
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true,
                top: request.top,
                left: request.left,
                width: request.w,
                height: request.h
                // incognito, top, left, ...
            }, 
                function(window) {
                    currentWindow = window;
                });
        });
    } catch (error) {
        console.log(error);
    }
}

/*

// Set up context menu tree at install time.
var showForLinks = ["*://*/user/*"];

chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        "title": "Trust",
        "id": "TrustIssue",
        "type": "normal",
        "contexts": ["link"],
        //"documentUrlPatterns": showForLinks
    });
    //chrome.contextMenus.create({
    //    "title": "Issue",
    //    "parentId": "TrustID",
    //    "id": "TrustIssueID",
    //    "type": "normal",
    //    "contexts": ["link"]
    //});
    //chrome.contextMenus.create({
    //    "title": "Resolve",
    //    "parentId": "TrustID",
    //    "id": "TrustResolveID",
    //    "type": "normal",
    //    "contexts": ["link"]
    //});
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId.indexOf("TrustIssue") > -1) {
        //chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tab.id, { type: "openModal", content: JSON.stringify(info) });
        //});
    }
});
*/