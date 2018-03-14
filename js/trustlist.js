//var settingsController = new SettingsController();
//var target;
//var settings; 

//https://www.reddit.com/user/trustchain/.json

// Onload
$(function () {
    // settingsController.loadSettings(function (items) {
    //     settings = items;
    // });
    //window.parent.postMessage({ type: "getTrustListData" }, "*");
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");

      if (request.command == "showTarget") {
            document.getElementById("json").innerHTML = JSON.stringify(request.data, undefined, 2);
            sendResponse({result: "ok"});
            //console.log(JSON.stringify(request.data));
      }
    });


// Listen to the response from main
// window.addEventListener("message", function (event) {
//     if (event.data.type == "showTarget") {
//         DataBind(event.data.user);
//     }
//     if (event.data.type == "Issue") {
//         var radioTrustResult = $('input[name="radio-trust"]:checked').val();
//         if (radioTrustResult != "neutral")
//             target.trust = (radioTrustResult == "trust");

//         window.parent.postMessage({ type: "modalTrustIssue", target: target }, "*");
//     }
// });


//window.parent.postMessage({ type: "updateUsertrust", user: user }, "*");

//function DataBind(user) {
    // if (target.id) {
    //     var pubKey = tce.bitcoin.ECPair.fromPublicKeyBuffer(new tce.buffer.Buffer(target.id));
    //     $("#subjectId").html(pubKey.getAddress()); // Only render the Text part
    // } else {
    //     $("#subjectId").html("No Trust ID was provided.");
    // }
    // $("#contentName").html(target.content); // Only render the Text part

    // var buf = tce.buffer.Buffer.concat([new tce.buffer.Buffer("41", 'HEX'), new tce.buffer.Buffer(target.contentid)]);
    // var ctidbase85check = tce.base58check.encode(buf);
    // $("#contentid").html(ctidbase85check); // Only render the Text part
//}



