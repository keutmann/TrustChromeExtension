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
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "openModal", content: JSON.stringify(info) });
        });
    }
});