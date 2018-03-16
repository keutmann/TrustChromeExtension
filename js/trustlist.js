//var settingsController = new SettingsController();
//var target;
//var settings; 

//https://www.reddit.com/user/trustchain/.json

var app = angular.module("myApp", []);
app.controller("trustlistCtrl", function($scope) {

    $scope.subject = null;
    $scope.targets = null;


    $scope.load = function(subject) {
        $scope.subject = subject;

        $scope.subject.addressHex = (new tce.buffer.Buffer($scope.subject.address, 'base64')).toString("HEX");
        $scope.subject.identicoinData = $scope.getIdenticoinData($scope.subject.addressHex);

        for(var index in $scope.subject.trusts.trusts) {
            var trust = $scope.subject.trusts.trusts[index];
            trust.identicoinData = $scope.getIdenticoinData(trust.issuerAddress);
            trust.issuerAddressHex = (new tce.buffer.Buffer(trust.issuerAddress, 'base64')).toString("HEX");
            trust.alias = "Noname"; 
            trust.note = "";
        }

        $scope.$apply();


    }

    $scope.getIdenticoinData = function(address) {
        return new Identicon(address, {margin:0.1, size:64, format: 'svg'}).toString();
    };
    
    $scope.trustClick = function(target) {

        return false;
    };

    $scope.distrustClick = function(target) {
        
        return false;
    }

    $scope.untrustClick= function(target) {
        
        return false;
    }


    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
          console.log(sender.tab ?
                      "from a content script:" + sender.tab.url :
                      "from the extension");
    
          if (request.command == "showTarget") {
                document.getElementById("json").innerHTML = JSON.stringify(request.data, undefined, 2);
                $scope.load(request.data);
                sendResponse({result: "ok"});
                //console.log(JSON.stringify(request.data));
          }
        });
    
});

// Onload


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



